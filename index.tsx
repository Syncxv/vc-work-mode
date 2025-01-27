/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import { removeContextMenuBindings, setupContextMenuPatches } from "./contextMenu";
import { settings, toggleWorkMode, isEnabled, isNotWorkModeId, isWorkModeId } from "./settings";
import { isPinned } from "plugins/pinDms/data";
import { forceUpdate } from "plugins/pinDms";
import { Channel, Guild, User } from "discord-types/general";
import ErrorBoundary from "@components/ErrorBoundary";
import { SuitcaseIcon, WorkModeIcon, WorkModeToggle } from "./components/WorkModeToggle";
import './styles.css';
import { addDecorator, removeDecorator } from "@api/MemberListDecorators";
import { React, Text, Tooltip } from "@webpack/common";
import { Flex } from "@components/Flex";

export let guildBarForceUpdate: () => void = () => { };
export let guildAvatarForceUpdate: () => void = () => { };
export let _forceUpdate = () => {
    guildBarForceUpdate();
    guildAvatarForceUpdate();
    forceUpdate();
};

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

export default definePlugin({
    name: "WorkMode",
    authors: [Devs.Aria],
    description: "A work mode plugin for Discord",
    dependencies: ["PinDMs"],
    settings,

    patches: [
        {
            find: "(\"guildsnav\")",
            replacement: [
                // {
                //     match: /case .+?\.GUILD:return/,
                //     replace: "$& $self.isEnabled() && $self.isNotWorkModeId(arguments[0].id) ? null : "
                // },
                // {
                //     match: /case .+?\.FOLDER:return/,
                //     replace: "$& $self.isEnabled() && $self.shouldRenderFolder(arguments[0]) ? null : "
                // },
                // probably a better way to do this
                {
                    match: /(?<=\i=)\i\.getRoots\(\)/,
                    replace: "$self.filterRoots($&)"
                },
                // {
                //     match: /\i\.\i\.getGuildsTree\(\)/,
                //     replace: "$self.filterGuildsTree($&)"
                // },
                {
                    match: /(?<=function \i\(\i\){).{1,300}GuildsBar/,
                    replace: "let forceUpdate = Vencord.Util.useForceUpdater();$self._guildBarForceUpdate=forceUpdate;$&"
                }
            ]
        },
        // {
        //     find: ".sidebarListRounded",
        //     replacement: {
        //         match: /(?<=function \i\(\i\){).{1,50}hideSidebar/,
        //         replace: "let forceUpdate = Vencord.Util.useForceUpdater();$self._guildBarForceUpdate=forceUpdate;$&"
        //     }
        // },
        {
            find: ".privateChannelsHeaderContainer,",
            replacement: [
                // {
                //     match: /getPrivateChannelIds\(\)/,
                //     replace: "$&.filter($self.filterPrivateChannelIds.bind($self))"
                // },
                {
                    match: /(?<=\i=)\i\.\i\.getMutablePrivateChannels\(\)/,
                    replace: "$self.filterMutablePrivateChannels($&)"
                }
                // {
                //     match: /(?<=channels:\i,)privateChannelIds:(.+?)(?=,listRef:)/,
                //     replace: "privateChannelIds:($1).filter($self.filterPrivateChannelIds.bind($self))"
                // }
            ]
        },
        // fix new stub
        {
            find: ".getGuildFolders(),",
            replacement: {
                match: /(?<=items:\i),isUnread:/,
                replace: ".filter($self.filterGuildFolders.bind($self))$&"
            }
        },
        {
            find: "\"NotificationTextUtils\"",
            replacement: {
                match: /(?<=function \i\(\i,\i\,\i\){).{1,200}.ignoreSameUser/,
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
                    replace: "let forceUpdate = Vencord.Util.useForceUpdater();$self._guildAvatarForceUpdate=forceUpdate;$&"
                }
            ]
        },
        {
            find: ".invitesDisabledTooltip",
            replacement: {
                match: /#{intl::VIEW_AS_ROLES_MENTIONS_WARNING}.{0,100}(?=])/,
                replace: "$&,$self.renderTooltip(arguments[0].guild)"
            }
        }
    ],

    _forceUpdate,
    isEnabled,
    isWorkModeId,
    isNotWorkModeId,

    set _guildBarForceUpdate(v: any) {
        this.guildBarForceUpdate = guildBarForceUpdate = v;
    },

    set _guildAvatarForceUpdate(v: any) {
        this.guildAvatarForceUpdate = guildAvatarForceUpdate = v;
    },

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
            <ErrorBoundary noop={true}>
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

    filterGuildFolders(item: string | { folderId: string, guildIds: string[]; }) {
        if (!this.isEnabled() || typeof item === "string") return true;


        return item.guildIds?.some(id => this.isWorkModeId(id));
    },

    filterPrivateChannelIds(id: string) {
        if (!this.isEnabled()) return true;
        if (settings.store.keepPinnedDms && isPinned(id)) return true;

        return this.isWorkModeId(id);
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

    WrapUpperBadge(original?: { props: { icon: Function; }; }, id?: string) {
        if (!id || this.isNotWorkModeId(id)) return original;

        return (
            <div className="vc-icon-badge">
                <SuitcaseIcon enabled={true} size="12" />
            </div>
        );

        // if (!original)
        //     return (
        //         <SuitcaseIcon enabled={false} size="12" />
        //     );

        // const OriginalIcon = (original as any)?.props.icon;

        // function Icon(props: any) {
        //     return (
        //         <React.Fragment>
        //             <OriginalIcon {...props} />
        //             <SuitcaseIcon enabled={false} size="24" tooltipProps={props} />
        //         </React.Fragment>
        //     );
        // }

        // original.props.icon = Icon;

        // return original;
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
        addDecorator("work-mode", props =>
            <ErrorBoundary noop>
                {isWorkModeId(props.channel.id) ? <WorkModeIcon text="Work User" /> : null}
            </ErrorBoundary>
        );
    },

    stop() {
        removeContextMenuBindings();
        removeDecorator("work-mode");
    }
});
