import { useEffect, useRef, useState, type RefObject } from "react";

/** 拖选矩形（视口坐标） */
export interface DragSelectBox {
    left: number; // 左边界
    top: number; // 上边界
    width: number; // 宽度
    height: number; // 高度
}

/** 开始拖选的移动阈值（px） */
const DRAG_THRESHOLD = 4;

/** 触发自动滚动的边缘距离（px） */
const EDGE_SCROLL_ZONE = 40;

/** 自动滚动步长（px） */
const EDGE_SCROLL_STEP = 16;

/** 不参与拖选的元素（按钮、输入框、卡片操作栏、弹窗与下拉面板等） */
const IGNORE_SELECTOR = [
    "button",
    "a",
    "input",
    "select",
    "textarea",
    "label",
    "[role='dialog']",
    "[role='menu']",
    ".minreactui-popover-content",
    ".minreactui-dropdown-menu-content",
    ".icon-card__actions",
    ".icon-card__check",
].join(", ");

/**
 * 图标列表拖选：在页面任意位置按下拖动即可拉出选框，框到带 data-select-id 的条目即选中（类似资源管理器）
 * @returns 当前选框（未拖选时为 null），由调用方渲染选框元素
 */
export const useDragSelect = ({
    containerRef,
    enabled,
    onSelect,
}: {
    containerRef: RefObject<HTMLElement | null>; // 图标列表容器
    enabled: boolean; // 是否启用拖选
    onSelect: (ids: string[], additive: boolean) => void; // 选区变化回调（additive 表示按住 Ctrl / Shift）
}): DragSelectBox | null => {
    const [box, setBox] = useState<DragSelectBox | null>(null);
    const onSelectRef = useRef(onSelect);
    onSelectRef.current = onSelect;

    useEffect(() => {
        const container = containerRef.current;
        if (!container || !enabled) {
            return;
        }

        let startX = 0;
        let startY = 0;
        let dragging = false;
        let additive = false;

        const cleanup = () => {
            window.removeEventListener("pointermove", handleMove);
            window.removeEventListener("pointerup", handleEnd);
            window.removeEventListener("pointercancel", handleEnd);
            document.body.classList.remove("is-drag-selecting");
        };

        const handleMove = (event: PointerEvent) => {
            if (!dragging) {
                if (Math.abs(event.clientX - startX) < DRAG_THRESHOLD && Math.abs(event.clientY - startY) < DRAG_THRESHOLD) {
                    return;
                }
                dragging = true;
                document.body.classList.add("is-drag-selecting");
                window.getSelection()?.removeAllRanges();
            }

            const left = Math.min(startX, event.clientX);
            const top = Math.min(startY, event.clientY);
            const width = Math.abs(event.clientX - startX);
            const height = Math.abs(event.clientY - startY);
            setBox({ left, top, width, height });

            const ids: string[] = [];
            container.querySelectorAll<HTMLElement>("[data-select-id]").forEach((node) => {
                const rect = node.getBoundingClientRect();
                if (rect.left < left + width && rect.right > left && rect.top < top + height && rect.bottom > top) {
                    const id = node.dataset.selectId;
                    if (id) {
                        ids.push(id);
                    }
                }
            });
            onSelectRef.current(ids, additive);

            const scroller = (container.closest(".icon-scroll") ?? container.closest(".content-panel")) as HTMLElement | null;
            if (scroller) {
                const rect = scroller.getBoundingClientRect();
                if (event.clientY < rect.top + EDGE_SCROLL_ZONE) {
                    scroller.scrollTop -= EDGE_SCROLL_STEP;
                } else if (event.clientY > rect.bottom - EDGE_SCROLL_ZONE) {
                    scroller.scrollTop += EDGE_SCROLL_STEP;
                }
            }
        };

        /** 拖选结束后吞掉紧随其后的点击，避免误开图标详情 */
        const swallowClick = (event: MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();
            window.removeEventListener("click", swallowClick, true);
        };

        const handleEnd = () => {
            cleanup();
            setBox(null);
            if (dragging) {
                window.addEventListener("click", swallowClick, true);
                window.setTimeout(() => window.removeEventListener("click", swallowClick, true), 300);
            }
            dragging = false;
        };

        const handleDown = (event: PointerEvent) => {
            if (event.button !== 0 || event.pointerType === "touch") {
                return;
            }
            const target = event.target as HTMLElement | null;
            if (target?.closest(IGNORE_SELECTOR)) {
                return;
            }
            // 拖动滚动条不触发框选
            const scroller = target?.closest(".icon-scroll, .content-panel") as HTMLElement | null;
            if (scroller && target === scroller) {
                const rect = scroller.getBoundingClientRect();
                if (
                    event.clientX >= rect.left + scroller.clientLeft + scroller.clientWidth ||
                    event.clientY >= rect.top + scroller.clientTop + scroller.clientHeight
                ) {
                    return;
                }
            }
            startX = event.clientX;
            startY = event.clientY;
            additive = event.ctrlKey || event.metaKey || event.shiftKey;
            dragging = false;
            window.addEventListener("pointermove", handleMove);
            window.addEventListener("pointerup", handleEnd);
            window.addEventListener("pointercancel", handleEnd);
        };

        // 原生拖拽（拖出代码 / 自定义排序 / 页面其它拖拽）优先，取消框选
        const handleDragStart = () => {
            cleanup();
            setBox(null);
            dragging = false;
        };

        document.addEventListener("pointerdown", handleDown);
        window.addEventListener("dragstart", handleDragStart);
        return () => {
            document.removeEventListener("pointerdown", handleDown);
            window.removeEventListener("dragstart", handleDragStart);
            cleanup();
        };
    }, [containerRef, enabled]);

    return box;
};
