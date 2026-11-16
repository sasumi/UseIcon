import { useState, type ReactNode } from "react";
import { Popover } from "minreact-ui";
import { useDisplayStore } from "@/store/displayStore";
import { AppIcon } from "@/components/common/AppIcon";
import { ColorPicker } from "@/components/common/ColorPicker";

const SIZE_RANGE = { min: 12, max: 64, step: 2 };
const PADDING_RANGE = { min: 0, max: 28, step: 1 };

/** 一行设置项：标题 + 控件 */
const DisplayRow = ({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) => (
    <div className="display-row">
        <div className="display-row__head">
            <span className="display-row__label">{label}</span>
            {hint && <span className="display-row__hint">{hint}</span>}
        </div>
        {children}
    </div>
);

/** 颜色选择：色板 + 回退按钮 */
const ColorField = ({
    value,
    fallback,
    fallbackText,
    onChange,
}: {
    value: string; // 当前颜色，空表示未设置
    fallback: string; // 未设置时色板显示的初始色
    fallbackText: string; // 回退按钮文案
    onChange: (value: string) => void;
}) => (
    <div className="display-color">
        <ColorPicker value={value} fallback={fallback} title={value || fallbackText} onChange={onChange} />
        {value && (
            <button className="ui-btn small button-tonal" type="button" onClick={() => onChange("")}>
                {fallbackText}
            </button>
        )}
    </div>
);

/** 图标显示控制面板：尺寸 / 内边距 / 图标颜色 / 背景色（参数全局生效） */
export const DisplayPanel = () => {
    const display = useDisplayStore((state) => state.display);
    const updateDisplay = useDisplayStore((state) => state.updateDisplay);
    const resetDisplay = useDisplayStore((state) => state.resetDisplay);
    const previewSize = display.size + display.padding * 2;

    return (
        <div className="display-panel">
            <div className="display-panel__title">显示设置</div>
            <div className="display-panel__preview">
                <span
                    className="display-preview__box"
                    style={{
                        width: previewSize,
                        height: previewSize,
                        background: display.background || undefined,
                        color: display.color || undefined,
                    }}
                >
                    <svg
                        className="display-preview__icon"
                        style={{ width: display.size, height: display.size }}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
                        <path d="M8.5 15 12 8.5 15.5 15" />
                    </svg>
                </span>
            </div>
            <DisplayRow label="图标大小" hint={`${display.size}px`}>
                <input
                    className="display-range"
                    type="range"
                    min={SIZE_RANGE.min}
                    max={SIZE_RANGE.max}
                    step={SIZE_RANGE.step}
                    value={display.size}
                    onChange={(event) => updateDisplay({ size: Number(event.target.value) })}
                />
            </DisplayRow>
            <DisplayRow label="图标内边距" hint={`${display.padding}px`}>
                <input
                    className="display-range"
                    type="range"
                    min={PADDING_RANGE.min}
                    max={PADDING_RANGE.max}
                    step={PADDING_RANGE.step}
                    value={display.padding}
                    onChange={(event) => updateDisplay({ padding: Number(event.target.value) })}
                />
            </DisplayRow>
            <DisplayRow label="图标颜色" hint="默认跟随文字色">
                <ColorField
                    value={display.color}
                    fallback="#1f1f1f"
                    fallbackText="默认"
                    onChange={(color) => updateDisplay({ color })}
                />
            </DisplayRow>
            <DisplayRow label="显示背景" hint="默认透明">
                <ColorField
                    value={display.background}
                    fallback="#f3f3f3"
                    fallbackText="透明"
                    onChange={(background) => updateDisplay({ background })}
                />
            </DisplayRow>
            <button className="ui-btn button-small display-panel__reset" type="button" onClick={resetDisplay}>
                重置为默认
            </button>
        </div>
    );
};

/** 显示设置入口：眼睛图标 + 下拉面板（公共库 / 项目 / 收藏通用） */
export const DisplayControl = () => {
    const [open, setOpen] = useState(false);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <Popover.Trigger>
                <button
                    className={`ui-icon-btn small ${open ? "active" : ""}`}
                    type="button"
                    title="显示设置：大小 / 内边距 / 颜色 / 背景"
                >
                    <AppIcon name="eye" />
                </button>
            </Popover.Trigger>
            <Popover.Content className="display-popover" aria-label="显示设置">
                <DisplayPanel />
            </Popover.Content>
        </Popover>
    );
};
