import { LazyComponent } from "@utils/lazyReact";
import { filters, find } from "@webpack";
import { settings, toggleWorkMode } from "../settings";
import { Tooltip } from "@webpack/common";


const HeaderBarIcon = LazyComponent(() => {
    const filter = filters.byCode(".HEADER_BAR_BADGE");
    return find(m => m.Icon && filter(m.Icon)).Icon;
});

function Icon({ enabled, size = "24", tooltipProps = {} }: { enabled?: boolean; size?: string, tooltipProps?: any; }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 256 256"
            fill={enabled ? "currentColor" : "none"}
            stroke="currentColor"
            {...tooltipProps}
        >
            {enabled ?
                (
                    <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        fill="currentColor"
                        d="M152,112a8,8,0,0,1-8,8H112a8,8,0,0,1,0-16h32A8,8,0,0,1,152,112Zm80-40V200a16,16,0,0,1-16,16H40a16,16,0,0,1-16-16V72A16,16,0,0,1,40,56H80V48a24,24,0,0,1,24-24h48a24,24,0,0,1,24,24v8h40A16,16,0,0,1,232,72ZM96,56h64V48a8,8,0,0,0-8-8H104a8,8,0,0,0-8,8Zm120,57.61V72H40v41.61A184,184,0,0,0,128,136,184,184,0,0,0,216,113.61Z">
                    </path>
                ) :
                (
                    <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        fill="currentColor"
                        d="M216,56H176V48a24,24,0,0,0-24-24H104A24,24,0,0,0,80,48v8H40A16,16,0,0,0,24,72V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V72A16,16,0,0,0,216,56ZM96,48a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96ZM216,72v41.61A184,184,0,0,1,128,136a184.07,184.07,0,0,1-88-22.38V72Zm0,128H40V131.64A200.19,200.19,0,0,0,128,152a200.25,200.25,0,0,0,88-20.37V200ZM104,112a8,8,0,0,1,8-8h32a8,8,0,0,1,0,16H112A8,8,0,0,1,104,112Z"
                    >
                    </path>
                )
            }
        </svg>
    );
}

export function WorkModeIcon({ text }: { text: string; }) {
    return (
        <div style={{ marginLeft: "4px" }}>
            <Tooltip text={text}>
                {(props) => (
                    <Icon enabled={false} size="20" tooltipProps={props} />
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
            icon={() => <Icon enabled={enabled} size="26" />}
        />
    );
}