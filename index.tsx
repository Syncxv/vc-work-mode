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
import { findByPropsLazy } from "@webpack";
import { ChannelStore, React, Text } from "@webpack/common";
import { FluxStore } from "@webpack/types";
import { Channel, Guild, User } from "discord-types/general";
import { isPinned } from "plugins/pinDms/data";

import { SuitcaseIcon, WorkModeToggle, WorkUserIcon } from "./components/WorkModeToggle";
import { removeContextMenuBindings, setupContextMenuPatches } from "./contextMenu";
import { getWorkIds, isEnabled, isNotWorkModeId, isWorkModeId, settings, toggleWorkMode, useWorkMode } from "./settings";
import type { NowPlayingCard, SidebarRoot, UnreadObj } from "./types";

const FriendStates = findByPropsLazy("PENDING_INCOMING");
const UnreadStore = findByPropsLazy("getMutableUnreadGuilds") as FluxStore & { getMutableUnreadGuilds: () => Set<string>; };

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
        // fix new stub
        {
            find: ".getGuildFolders(),",
            replacement: [
                {
                    match: /(?<=function.{1,6}{).{1,50}getGuildFolders/,
                    replace: "$self.useWorkMode();$&"
                },
                {
                    match: /(?<=items:\i),isUnread:/,
                    replace: ".filter($self.filterGuildFolders.bind($self))$&"
                }
            ]
        },
        {
            find: ".privateChannelsHeaderContainer,",
            replacement: [
                {
                    match: /(?<=\i=)\i\.\i\.getMutablePrivateChannels\(\)/,
                    replace: "$self.filterMutablePrivateChannels($&)"
                },
                {
                    match: /(?<=channels:\w,)privateChannelIds:(\w(?:.+?)?)(?=,listRef:)/,
                    replace: "privateChannelIds:($1).filter($self.filterPrivateChannelIds.bind($self))"
                }
            ]

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
            replacement: [
                {
                    match: /(?<=getTotalMentionCount\(\i\){)/,
                    replace: "if ($self.isEnabled()) return $self.getTotalWorkMentionCount.bind(this)();"
                },
                {
                    match: /(?<=hasAnyUnread\(\){)return/,
                    replace: "return $self.isEnabled() ? $self.hasAnyWorkUnread() : "
                },
                {
                    match: /CONNECTION_OPEN:\i,/,
                    replace: "WORKMODE_UPDATE: () => {},$&"
                }
            ]
        },
        {
            find: "\"NowPlayingViewStore\"",
            replacement: {
                match: /get nowPlayingCards\(\){return \i/,
                replace: "$&.filter($self.filterNowPlayingCards.bind($self))"
            }
        },
        {
            find: "\"PeopleList\"",
            replacement: [
                {
                    match: /(?<=function.{1,20}\){).{1,100}FRIENDS_LIST/,
                    replace: "$self.useWorkMode();$&"
                },
                {
                    match: /rows:(\i),(?=renderRow)/,
                    replace: "rows:$self.filterFriendRows($1),"
                }
            ]
        },
        {
            find: "\"IncomingCallStore\"",
            predicate: () => settings.store.blockNonWorkCalls,
            replacement: {
                match: /(?<=function .{1,5}\{).{1,50}ringing/,
                replace: "if(!$self.handleCall(arguments[0])) return !1;$&"
            }
        }
    ],

    useWorkMode,
    isEnabled,
    isWorkModeId,
    isNotWorkModeId,
    getWorkIds,
    UnreadStore,

    toolboxActions: {
        "Work Mode Toggle"() {
            toggleWorkMode();
        }
    },

    addIconToToolBar(e: { toolbar: React.ReactNode[] | React.ReactNode; }) {
        if (Array.isArray(e.toolbar))
            return e.toolbar.unshift(
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

            return clonedRoot.children?.some(child => this.isWorkModeId(child.id));
        });
    },

    filterGuildFolders(item: string | { folderId: string, guildIds: string[]; }) {
        if (!this.isEnabled()) return true;

        if (typeof item === "string")
            return this.isWorkModeId(item);

        return item.guildIds?.some(id => this.isWorkModeId(id));
    },

    handleNotification(user: User, channel: Channel) {
        if (!this.isEnabled()) return false;

        return this.isNotWorkModeId(channel.getGuildId()) && this.isNotWorkModeId(channel.id);
    },

    filterUnreadDms(channel_id: string) {
        if (!this.isEnabled()) return true;

        return this.isWorkModeId(channel_id);
    },

    filterMutablePrivateChannels(channels: Record<string, Channel>) {
        if (!this.isEnabled()) return channels;

        const channelsCopy = { ...channels };

        for (const id in channelsCopy) {
            if (!this.isWorkModeId(id)) {
                if (settings.store.keepPinnedDms && isPinned(id)) continue;

                delete channelsCopy[id];
            }
        }

        return channelsCopy;
    },

    filterPrivateChannelIds(id: string) {
        if (!this.isEnabled()) return true;

        return this.isWorkModeId(id);
    },

    filterNowPlayingCards(card: NowPlayingCard) {
        if (!this.isEnabled() || !card.party) return true;

        const users = [...card.party?.partiedMembers ?? [], ...card.party?.priorityMembers.map(m => m.user) ?? []].filter(Boolean) as User[];

        if (users.some(user => this.isWorkModeId(ChannelStore.getDMFromUserId(user.id))))
            return true;

        return card.party.voiceChannels?.some(vc => this.isWorkModeId(vc.guild.id));
    },

    filterFriendRows(rows: { userId: string; type: number; }[][]) {
        if (!this.isEnabled()) return rows;

        return rows.map(row => row.filter(user =>
            user.type === FriendStates.PENDING_INCOMING || this.isWorkModeId(ChannelStore.getDMFromUserId(user.userId))
        ));
    },

    getTotalWorkMentionCount(skipDms?: boolean) {
        let t = 0;
        const unreads = this.getMutableGuildStates() as Record<string, UnreadObj>;

        for (const guild_id in unreads) {
            const unread = unreads[guild_id];
            if (skipDms && guild_id === "null")
                continue;

            if (guild_id !== "null" && !isWorkModeId(guild_id))
                continue;

            for (const user_id in unread.mentionCounts) {
                if (!isWorkModeId(user_id))
                    continue;

                t++;
            }
        }

        return t;
    },

    hasAnyWorkUnread() {
        const workIds = new Set(getWorkIds());
        return Array.from(UnreadStore.getMutableUnreadGuilds()).some(id => workIds.has(id));
    },

    WrapUpperBadge(original?: { props: { icon: Function; }; }, id?: string) {
        if (!id || this.isNotWorkModeId(id)) return original;

        return (
            <div className="vc-icon-badge">
                <SuitcaseIcon enabled={true} size="12" />
            </div>
        );
    },

    handleCall({ channelId }: { channelId: string; }) {
        if (!this.isEnabled()) return true;

        return this.isWorkModeId(channelId);
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
                {isWorkModeId(props?.channel?.id ?? ChannelStore.getDMFromUserId(props?.user?.id)) ? <WorkUserIcon /> : null}
            </ErrorBoundary>
        );
    },

    stop() {
        removeContextMenuBindings();
        removeMemberListDecorator("work-mode");
    }
});
