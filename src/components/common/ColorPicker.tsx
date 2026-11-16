import { useEffect, useState } from "react";
import { Popover, Select } from "minreact-ui";
import { COLOR_PALETTES } from "@/data/colors";
import { AppIcon } from "@/components/common/AppIcon";

/** 规整 HEX 输入：去非法字符，3 位自动补成 6 位 */
const fixHex = (raw: string): string => {
    const cleaned = raw.replace(/#/g, "").replace(/[^0-9a-fA-F]/g, "").substring(0, 6);
    return cleaned.length === 3
        ? cleaned
              .split("")
              .map((char) => char + char)
              .join("")
        : cleaned;
};

/** HEX 输入框：合法值才回写，失焦时回退无效输入 */
const HexInput = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => {
    const normalized = /^#[0-9a-fA-F]{6}$/.test(value) ? value.slice(1) : "";
    const [text, setText] = useState(normalized);

    useEffect(() => {
        setText(normalized);
    }, [normalized]);

    const commit = (raw: string) => {
        const fixed = fixHex(raw);
        if (fixed.length !== 6) {
            setText(normalized);
            return;
        }
        setText(fixed);
        onChange(`#${fixed}`);
    };

    return (
        <div className="hex-input">
            <span className="hex-input__prefix">#</span>
            <input
                className="ui-input"
                value={text}
                placeholder="HEX"
                maxLength={7}
                aria-label="颜色 HEX 值"
                onChange={(event) => {
                    const raw = event.target.value;
                    setText(raw);
                    const fixed = fixHex(raw);
                    if (raw === "") {
                        onChange("");
                    } else if (fixed.length === 6) {
                        onChange(`#${fixed}`);
                    }
                }}
                onBlur={(event) => commit(event.target.value)}
            />
        </div>
    );
};

/** 调色板图标（触发器用，颜色跟随当前色） */
const PaletteIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 21a9 9 0 1 1 9-9c0 1.7-1.3 3-3 3h-2a2 2 0 0 0-1.6 3.2c.4.5.6 1.1.6 1.8a2 2 0 0 1-2 2Z" />
        <circle cx="7.5" cy="11.5" r="1.1" />
        <circle cx="10" cy="7.5" r="1.1" />
        <circle cx="14.5" cy="7.5" r="1.1" />
    </svg>
);

/** 颜色面板：自定义取色 + HEX 输入 + 色系下拉切换（参考 paper 的分段布局） */
const ColorPanel = ({
    color,
    fallback,
    allowEmpty,
    onChange,
}: {
    color: string; // 当前颜色，空表示未设置
    fallback: string; // 未设置时的取色初始值
    allowEmpty: boolean; // 是否允许清除颜色
    onChange: (value: string) => void; // 颜色变化
}) => {
    const [paletteKey, setPaletteKey] = useState(COLOR_PALETTES[0].key);
    const palette = COLOR_PALETTES.find((item) => item.key === paletteKey) ?? COLOR_PALETTES[0];
    const current = color.toLowerCase();

    return (
        <div className="color-panel">
            <div className="color-title">自定义</div>
            <div className="color-custom">
                <input
                    className="color-custom__input"
                    type="color"
                    value={color || fallback}
                    title="点击选择颜色"
                    onChange={(event) => onChange(event.target.value)}
                />
                {allowEmpty && <button className="color-item color-clear" type="button" title="清除颜色" onClick={() => onChange("")} />}
                <HexInput value={color} onChange={onChange} />
            </div>
            <div className="color-palette-head">
                <Select
                    items={COLOR_PALETTES.map((item) => ({ value: item.key, label: item.label }))}
                    value={palette.key}
                    onChange={(value) => typeof value === "string" && setPaletteKey(value)}
                    triggerClassName="color-palette-select"
                />
            </div>
            <div
                className={`color-swatches ${palette.columnSize ? "is-columns" : ""}`}
                style={palette.columnSize ? { gridTemplateRows: `repeat(${palette.columnSize}, var(--color-selector-size))` } : undefined}
            >
                {palette.colors.map((item, index) => (
                    <button
                        key={`${palette.key}-${item}-${index}`}
                        className={`color-item ${current === item ? "active" : ""}`}
                        type="button"
                        style={{ background: item }}
                        title={palette.names?.[index] ? `${palette.names[index]} · ${item}` : item}
                        onClick={() => onChange(item)}
                    />
                ))}
            </div>
        </div>
    );
};

/** 颜色选择器：色块触发器 + 弹层面板（替代原生 input[type=color]） */
export const ColorPicker = ({
    value,
    onChange,
    fallback = "#ffffff",
    allowEmpty = false,
    title = "选择颜色",
}: {
    value: string; // 当前颜色，空表示未设置
    onChange: (value: string) => void; // 颜色变化
    fallback?: string; // 未设置时的显示色
    allowEmpty?: boolean; // 是否允许清除颜色
    title?: string; // 触发器提示
}) => (
    <Popover>
        <Popover.Trigger>
            <button className="color-trigger" type="button" title={title} aria-label={title}>
                <span className="color-trigger__icon" style={{ color: value || fallback }}>
                    <PaletteIcon />
                </span>
                <AppIcon name="chevron-down" className="color-trigger__caret" />
            </button>
        </Popover.Trigger>
        <Popover.Content className="color-popover">
            <ColorPanel color={value} fallback={fallback} allowEmpty={allowEmpty} onChange={onChange} />
        </Popover.Content>
    </Popover>
);
