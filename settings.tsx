/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    workModeEnabled: {
        type: OptionType.BOOLEAN,
        name: "Enable Work Mode",
        description: "Enable work mode",
        defaultValue: false,
    },

    keepPinnedDms: {
        type: OptionType.BOOLEAN,
        name: "Keep Pinned DMs",
        description: "Keep pinned DMs in the dms list",
        defaultValue: false,
    },

    workIds: {
        type: OptionType.STRING,
        name: "Work IDs",
        description: "The IDs of the users you want to enable work mode for",
        defaultValue: "",
    },
});

export function useWorkMode() {
    settings.use(["workModeEnabled", "workIds", "keepPinnedDms"]);
}


export function isEnabled() {
    return settings.store.workModeEnabled;
}

export function getWorkIds() {
    return settings.store.workIds?.split(",") || [];
}

export function isWorkModeId(id: string) {
    return settings.store.workIds?.split(",").includes(id) ?? false;
}

export function isNotWorkModeId(id: string) {
    return !isWorkModeId(id);
}


export function toggleWorkMode() {
    settings.store.workModeEnabled = !settings.store.workModeEnabled;
}

export function addToWorkIds(id: string) {
    const items = settings.store.workIds?.split(",") || [];
    items.push(id);

    settings.store.workIds = items.join(",");
}


export function removeFromWorkIds(id: string) {
    const items = settings.store.workIds?.split(",") || [];
    settings.store.workIds = items.filter(i => i !== id).join(",");
}
