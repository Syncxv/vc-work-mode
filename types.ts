/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Channel, Guild, User } from "discord-types/general";

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

export type SidebarRoot = GuildRoot | FolderRoot;

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

export interface NowPlayingCard {
    type: string;
    party: Party;
}

export interface Party {
    id: string;
    voiceChannels: VoiceChannel[];
    isSpotifyActivity: boolean;
    showPlayingMembers: boolean;
}

export interface VoiceChannel {
    channel: Channel;
    guild: Guild;
    members: User[];
}

