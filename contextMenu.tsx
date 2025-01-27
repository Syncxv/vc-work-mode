/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addContextMenuPatch, NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";
import { Menu, React } from "@webpack/common";

import { addToWorkIds, removeFromWorkIds, settings } from "./settings";

const idFunctions = {
    Server: props => props?.guild?.id,
    // User: props => props?.message?.author?.id || props?.user?.id,
    Channel: props => props.message?.channel_id || props.channel?.id
} as const;

type idKeys = keyof typeof idFunctions;

function renderListOption(IdType: idKeys, props: any) {
    const id = idFunctions[IdType](props);
    if (!id) return null;

    const isAdded = settings.store.workIds?.split(",").includes(id);

    return (
        <Menu.MenuItem
            id={`${IdType}-${id}`}
            label={isAdded ? `Remove ${IdType} (Work Mode)` : `Add ${IdType} (Work Mode)`}
            action={() => isAdded ? removeFromWorkIds(id) : addToWorkIds(id)}
        />
    );
}


export const contextMenuPath: NavContextMenuPatchCallback = (children, props) => {
    if (!props) return;

    if (!children.some(child => child?.props?.id === "work-mode")) {
        children.push(
            <Menu.MenuSeparator />,
            // <Menu.MenuItem
            //     id="work-mode"
            //     label="Work Mode"
            // >
            //     {Object.keys(idFunctions).map(IdType => (
            //         <React.Fragment key={IdType}>
            //             {renderListOption(IdType as idKeys, props)}
            //         </React.Fragment>
            //     ))}
            // </Menu.MenuItem>
            ...Object.keys(idFunctions).map(IdType => (
                <React.Fragment key={IdType}>
                    {renderListOption(IdType as idKeys, props)}
                </React.Fragment>
            ))

        );
    }
};

export const setupContextMenuPatches = () => {
    addContextMenuPatch("channel-context", contextMenuPath);
    addContextMenuPatch("user-context", contextMenuPath);
    addContextMenuPatch("guild-context", contextMenuPath);
    addContextMenuPatch("gdm-context", contextMenuPath);
};

export const removeContextMenuBindings = () => {
    removeContextMenuPatch("channel-context", contextMenuPath);
    removeContextMenuPatch("user-context", contextMenuPath);
    removeContextMenuPatch("guild-context", contextMenuPath);
    removeContextMenuPatch("gdm-context", contextMenuPath);
};


