/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { LazyComponent } from "@utils/lazyReact";
import { filters, find } from "@webpack";
import { Tooltip } from "@webpack/common";

import { settings, toggleWorkMode } from "../settings";


const HeaderBarIcon = LazyComponent(() => {
    const filter = filters.byCode(".HEADER_BAR_BADGE");
    return find(m => m.Icon && filter(m.Icon)).Icon;
});

export function SuitcaseIcon({ enabled, size = "24", tooltipProps = {} }: { enabled?: boolean; size?: string, tooltipProps?: any; }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={enabled ? "currentColor" : "none"}
            stroke={enabled ? "none" : "currentColor"}
            {...tooltipProps}
        >
            {enabled ?
                <path fill="currentColor" d="M14 2a3 3 0 0 1 3 3v1h2a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3h2V5a3 3 0 0 1 3-3zm0 2h-4a1 1 0 0 0-1 1v1h6V5a1 1 0 0 0-1-1"></path>
                : <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zm5-2V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>}
        </svg>
    );
}

export function WorkUserIcon() {
    return (
        <div style={{ marginLeft: "4px" }}>
            <Tooltip text="Work User">
                {props => (
                    <SuitcaseIcon enabled={false} size="20" tooltipProps={props} />
                )}
            </Tooltip>
        </div>
    );
}

export function WorkModeToggle() {
    const { workModeEnabled: enabled } = settings.use();

    return (
        <HeaderBarIcon
            className="vc-work-toolbox-btn"
            onClick={toggleWorkMode}
            tooltip={enabled ? "Disable Work Mode" : "Enable Work Mode"}
            icon={() => <SuitcaseIcon enabled={enabled} size="26" />}
        />
    );
}
