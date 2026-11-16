import { useRef, useState } from "react";
import { AppIcon } from "@/components/common/AppIcon";

/** 拆分标签文本：逗号、顿号都视为分隔符 */
const splitTags = (raw: string): string[] =>
    raw
        .split(/[,，、]+/)
        .map((item) => item.trim())
        .filter(Boolean);

/**
 * 标签编辑器：[标签1 x] [标签2 x] | 形式，末尾空白处可直接输入，回车提交，标签可拖动排序
 */
export const TagEditor = ({
    value,
    onChange,
    disabled = false,
    bare = false,
    placeholder = "添加标签",
}: {
    value: string[]; // 当前标签
    onChange: (tags: string[]) => void; // 标签变化回调
    disabled?: boolean; // 只读
    bare?: boolean; // 无边框样式（用于卡片内）
    placeholder?: string; // 空状态提示
}) => {
    const [text, setText] = useState("");
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [dropTarget, setDropTarget] = useState<{ index: number; position: "before" | "after" } | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const commit = () => {
        const parts = splitTags(text);
        if (parts.length === 0) {
            setText("");
            return;
        }
        const next = [...value];
        parts.forEach((part) => {
            if (!next.includes(part)) {
                next.push(part);
            }
        });
        onChange(next);
        setText("");
    };

    const remove = (index: number) => onChange(value.filter((_, i) => i !== index));

    const dropOn = (index: number, position: "before" | "after") => {
        if (dragIndex === null || dragIndex === index) {
            return;
        }
        const moved = value[dragIndex];
        const target = value[index];
        const rest = value.filter((_, i) => i !== dragIndex);
        const at = rest.indexOf(target) + (position === "after" ? 1 : 0);
        rest.splice(at, 0, moved);
        onChange(rest);
    };

    return (
        <div
            className={`tag-editor ${bare ? "tag-editor--bare" : ""} ${disabled ? "is-disabled" : ""}`}
            onClick={() => {
                if (!disabled) {
                    inputRef.current?.focus();
                }
            }}
        >
            {value.map((tag, index) => (
                <span
                    key={`${tag}-${index}`}
                    className={[
                        "tag-editor__tag",
                        dragIndex === index ? "dragging" : "",
                        dropTarget?.index === index ? `drop-${dropTarget.position}` : "",
                    ]
                        .filter(Boolean)
                        .join(" ")}
                    draggable={!disabled}
                    title={disabled ? tag : `${tag}（可拖动排序）`}
                    onDragStart={(event) => {
                        if (disabled) {
                            return;
                        }
                        setDragIndex(index);
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", tag);
                    }}
                    onDragOver={(event) => {
                        if (disabled || dragIndex === null || dragIndex === index) {
                            return;
                        }
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "move";
                        const rect = event.currentTarget.getBoundingClientRect();
                        const position = event.clientX < rect.left + rect.width / 2 ? "before" : "after";
                        setDropTarget((prev) =>
                            prev?.index === index && prev.position === position ? prev : { index, position },
                        );
                    }}
                    onDragLeave={(event) => {
                        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                            setDropTarget((prev) => (prev?.index === index ? null : prev));
                        }
                    }}
                    onDrop={(event) => {
                        if (disabled) {
                            return;
                        }
                        event.preventDefault();
                        event.stopPropagation();
                        const rect = event.currentTarget.getBoundingClientRect();
                        const position =
                            dropTarget?.index === index
                                ? dropTarget.position
                                : event.clientX < rect.left + rect.width / 2
                                  ? "before"
                                  : "after";
                        dropOn(index, position);
                        setDragIndex(null);
                        setDropTarget(null);
                    }}
                    onDragEnd={() => {
                        setDragIndex(null);
                        setDropTarget(null);
                    }}
                >
                    <span className="tag-editor__text">{tag}</span>
                    {!disabled && (
                        <button
                            className="tag-editor__remove"
                            type="button"
                            tabIndex={-1}
                            aria-label={`移除标签 ${tag}`}
                            onClick={(event) => {
                                event.stopPropagation();
                                remove(index);
                            }}
                        >
                            <AppIcon name="close" />
                        </button>
                    )}
                </span>
            ))}
            {!disabled && (
                <input
                    ref={inputRef}
                    className="tag-editor__input"
                    value={text}
                    placeholder={value.length === 0 ? placeholder : ""}
                    onChange={(event) => setText(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") {
                            event.preventDefault();
                            commit();
                        } else if (event.key === "Escape") {
                            setText("");
                            event.currentTarget.blur();
                        } else if (event.key === "Backspace" && !text && value.length > 0) {
                            event.preventDefault();
                            remove(value.length - 1);
                        }
                    }}
                    onBlur={() => {
                        if (text) {
                            commit();
                        }
                    }}
                />
            )}
        </div>
    );
};
