/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { addMemberListDecorator, removeMemberListDecorator } from "@api/MemberListDecorators";
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { React, Text } from "@webpack/common";
import { Channel, Guild, User } from "discord-types/general";
import { isPinned } from "plugins/pinDms/data";

import { SuitcaseIcon, WorkModeIcon, WorkModeToggle } from "./components/WorkModeToggle";
import { removeContextMenuBindings, setupContextMenuPatches } from "./contextMenu";
import { isEnabled, isNotWorkModeId, isWorkModeId, settings, toggleWorkMode, useWorkMode } from "./settings";

interface GuildRoot {
    type: "guild";
    id: string;
    parentId: any;
    unavailable: boolean;
    children: GuildRoot[]; // probably. always empty
}

interface FolderRoot {
    type: "folder";
    id: number;
    parentId: any;
    name: string;
    color: number;
    expanded: boolean;
    children: GuildRoot[];
}

type SidebarRoot = GuildRoot | FolderRoot;

export type UnreadObj = {
    unread: boolean;
    unreadByType: any;
    unreadChannelId?: string;
    lowImportanceMentionCount: number;
    highImportanceMentionCount: number;
    mentionCounts: {
        [channel_id: string]: {
            count: number;
            isMentionLowImportance: boolean;
        };
    };
    ncMentionCount: number;
    sentinel: number;
};


export default definePlugin({
    name: "WorkMode",
    authors: [Devs.Aria],
    description: "A work mode plugin for Discord",
    settings,

    patches: [
        {
            find: "(\"guildsnav\")",
            replacement: [
                // probably a better way to do this
                {
                    match: /(?<=\i=)\i\.getRoots\(\)/,
                    replace: "$self.filterRoots($&)"
                },
                {
                    match: /(?<=function \i\(\i\){).{1,300}GuildsBar/,
                    replace: "$self.useWorkMode();$&"
                }
            ]
        },
        {
            find: ".privateChannelsHeaderContainer,",
            replacement: {
                match: /(?<=\i=)\i\.\i\.getMutablePrivateChannels\(\)/,
                replace: "$self.filterMutablePrivateChannels($&)"
            }

        },
        {
            find: "getPrivateChannelsVersion());",
            replacement: {
                match: /(?<=\i=\i)\.map/,
                replace: ".filter($self.filterUnreadDms.bind($self)).map"
            }
        },
        {
            find: "\"NotificationTextUtils\"",
            replacement: {
                match: /(?<=function \i\(\i,\i,\i\){).{1,200}.ignoreSameUser/,
                replace: "if($self.handleNotification(arguments[1], arguments[2])) return false; $&"
            }
        },
        {
            find: "toolbar:function",
            replacement: {
                match: /(?<=function \i\(\i\){).{1,200}toolbar.{1,100}mobileToolbar/,
                replace: "$self.addIconToToolBar(arguments[0]);$&"
            }
        },
        {
            find: "\"GuildItem\"",
            replacement: [
                {
                    match: /(?<=upperBadge:)\i/,
                    replace: "$self.WrapUpperBadge($&, arguments[0]?.guild?.id)"
                },
                {
                    match: /(?<=function\(\i\){).{1,100}guildNode/,
                    replace: "$self.useWorkMode();$&"
                }
            ]
        },

        // stolen from MemberCount
        {
            find: ".invitesDisabledTooltip",
            replacement: {
                match: /#{intl::VIEW_AS_ROLES_MENTIONS_WARNING}.{0,100}(?=])/,
                replace: "$&,$self.renderTooltip(arguments[0].guild)"
            }
        },
        {
            find: ".FRIENDS},\"friends\"",
            replacement: {
                match: /let{showLibrary:\i,/,
                replace: "$self.useWorkMode();$&"
            }
        },
        {
            find: "GuildReadStateStore",
            replacement: {
                match: /getTotalMentionCount\(\i\){.{1,50}(\i)=\i\[(\i)\];/,
                replace: "$&if(!$self.shouldIncrement($2, $1)) continue;"
            }
        },
        {
            find: "#{intl::INCOMING_CALL}",
            replacement: {
                match: /(?<=function \i\(\)\{).{1,150}getTotalMentionCount/,
                replace: "$self.useWorkMode();$&"
            }
        }
    ],

    useWorkMode,
    isEnabled,
    isWorkModeId,
    isNotWorkModeId,

    toolboxActions: {
        "Work Mode Toggle"() {
            toggleWorkMode();
        }
    },

    addIconToToolBar(e: { toolbar: React.ReactNode[] | React.ReactNode; }) {
        if (Array.isArray(e.toolbar))
            return e.toolbar.push(
                <ErrorBoundary noop={true}>
                    <WorkModeToggle />
                </ErrorBoundary>
            );

        e.toolbar = [
            e.toolbar,
            <ErrorBoundary key="work-mode-toggle" noop={true}>
                <WorkModeToggle />
            </ErrorBoundary>,
        ];
    },


    filterRoots(roots: SidebarRoot[]) {
        if (!this.isEnabled()) return roots;

        return roots.map(originalRoot => {
            const clonedRoot = { ...originalRoot };

            if (clonedRoot.children) {
                clonedRoot.children = clonedRoot.children.filter(child =>
                    this.isWorkModeId(child.id)
                );
            }

            return clonedRoot;
        }).filter(clonedRoot => {
            if (clonedRoot.type === "guild")
                return this.isWorkModeId(clonedRoot.id);

            return this.shouldRenderFolder(clonedRoot);
        });
    },


    shouldRenderFolder(arg: FolderRoot) {
        return arg?.children?.some(child => this.isWorkModeId(child.id));
    },

    handleNotification(user: User, channel: Channel) {
        if (!this.isEnabled()) return false;

        return this.isNotWorkModeId(channel.getGuildId()) && this.isNotWorkModeId(channel.id);
    },

    filterPrivateChannelIds(id: string) {
        if (!this.isEnabled()) return true;
        if (settings.store.keepPinnedDms && isPinned(id)) return true;

        return this.isWorkModeId(id);
    },

    filterUnreadDms(channel_id: string) {
        if (!this.isEnabled()) return true;

        return this.isWorkModeId(channel_id);
    },

    filterMutablePrivateChannels(channels: Record<string, Channel>) {
        if (!this.isEnabled()) return channels;

        const channelsCopy = { ...channels };

        for (const id in channelsCopy) {
            if (!this.filterPrivateChannelIds(id)) {
                if (settings.store.keepPinnedDms && isPinned(id)) continue;

                delete channelsCopy[id];
            }
        }

        return channelsCopy;
    },

    shouldIncrement(guildId: string, unread: UnreadObj) {
        if (!this.isEnabled()) return true;

        if (this.isWorkModeId(guildId)) return true;

        for (const id in unread.mentionCounts) {
            if (this.isWorkModeId(id)) return true;
        }

        return false;
    },

    WrapUpperBadge(original?: { props: { icon: Function; }; }, id?: string) {
        if (!id || this.isNotWorkModeId(id)) return original;

        return (
            <div className="vc-icon-badge">
                <SuitcaseIcon enabled={true} size="12" />
            </div>
        );
    },

    renderTooltip: ErrorBoundary.wrap((guild: Guild) => {
        if (!guild || isNotWorkModeId(guild.id)) return null;

        return (
            <Flex style={{ justifyContent: "start", alignItems: "center", gap: "0.2em", marginTop: "0.35em" }}>
                <SuitcaseIcon enabled={true} size="12" />
                <Text variant="text-sm/normal">Work Guild</Text>
            </Flex>
        );
    }),

    start() {
        setupContextMenuPatches();
        addMemberListDecorator("work-mode", props =>
            <ErrorBoundary noop>
                {isWorkModeId(props.channel.id) ? <WorkModeIcon text="Work User" /> : null}
            </ErrorBoundary>
        );
    },

    stop() {
        removeContextMenuBindings();
        removeMemberListDecorator("work-mode");
    }
});
