import { useEffect, useRef } from "react";

/** 点击时不应被视为“空白处”的元素（图标条目、交互控件、弹窗与浮层等；空白处点击会取消多选） */
const IGNORE_SELECTOR = [
    ".icon-card",
    "button",
    "a",
    "input",
    "select",
    "textarea",
    "label",
    "[role='dialog']",
    "[role='menu']",
    ".minreactui-dialog-wrap",
    ".minreactui-dialog-masker",
    ".minreactui-popover-content",
    ".minreactui-dropdown-menu-content",
    ".cart-drawer",
    ".cart-mask",
    ".Toastify",
].join(", ");

/**
 * 点击页面任意空白处（非图标条目 / 非交互控件）时触发回调，用于取消多选
 * @param onBlank 空白处点击回调
 */
export const useClearOnBlankClick = (onBlank: () => void): void => {
    const onBlankRef = useRef(onBlank);
    onBlankRef.current = onBlank;

    useEffect(() => {
        const handleClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target || target.closest(IGNORE_SELECTOR)) {
                return;
            }
            // 点击滚动条不视为空白处（避免滚动列表时误清空选择）
            const scrollArea = target.closest(".icon-scroll, .content-panel") as HTMLElement | null;
            if (scrollArea && target === scrollArea) {
                const rect = scrollArea.getBoundingClientRect();
                if (
                    event.clientX >= rect.left + scrollArea.clientLeft + scrollArea.clientWidth ||
                    event.clientY >= rect.top + scrollArea.clientTop + scrollArea.clientHeight
                ) {
                    return;
                }
            }
            onBlankRef.current();
        };
        document.addEventListener("click", handleClick);
        return () => document.removeEventListener("click", handleClick);
    }, []);
};
