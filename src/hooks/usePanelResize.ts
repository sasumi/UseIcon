import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";

const clampValue = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, Math.round(value)));

const readWidth = (storageKey: string): number | null => {
    try {
        const raw = localStorage.getItem(storageKey);
        const value = raw === null ? Number.NaN : Number(raw);
        return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
    } catch {
        return null;
    }
};

const storeWidth = (storageKey: string, width: number | null): void => {
    try {
        if (width === null) {
            localStorage.removeItem(storageKey);
        } else {
            localStorage.setItem(storageKey, String(width));
        }
    } catch {
        // 忽略 storage 异常
    }
};

export interface PanelResizeOptions {
    storageKey: string; // 宽度记忆键
    defaultWidth: number; // 默认宽度（px）
    min?: number; // 最小宽度（px）
    max?: number; // 最大宽度（px）
    direction?: "left" | "right"; // 面板贴靠方向：left 为左侧栏，right 为右侧抽屉
}

/**
 * 拖动分隔条调整面板宽度（VSCode 风格）：拖动实时生效，双击 / 回车重置，方向键微调，宽度记忆到本地。
 */
export const usePanelResize = ({ storageKey, defaultWidth, min = 168, max = 520, direction = "left" }: PanelResizeOptions) => {
    const [width, setWidth] = useState<number | null>(() => readWidth(storageKey));
    const [resizing, setResizing] = useState(false);
    const panelRef = useRef<HTMLElement | null>(null);
    const dragRef = useRef({ startX: 0, startWidth: 0 });
    const widthRef = useRef<number | null>(width);
    widthRef.current = width;

    const clamp = (value: number): number => clampValue(value, min, Math.max(min, Math.min(max, window.innerWidth - 120)));

    const resolveCurrentWidth = (): number => widthRef.current ?? Math.round(panelRef.current?.getBoundingClientRect().width || defaultWidth);

    const applyWidth = (value: number): void => {
        const next = clamp(value);
        widthRef.current = next;
        setWidth(next);
    };

    const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
        if (event.button !== 0) {
            return;
        }
        event.preventDefault();
        dragRef.current = { startX: event.clientX, startWidth: resolveCurrentWidth() };
        setResizing(true);
        try {
            event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
            // 忽略指针捕获失败
        }
    };

    const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
        if (!resizing) {
            return;
        }
        const delta = direction === "left" ? event.clientX - dragRef.current.startX : dragRef.current.startX - event.clientX;
        applyWidth(dragRef.current.startWidth + delta);
    };

    const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>): void => {
        if (!resizing) {
            return;
        }
        setResizing(false);
        try {
            event.currentTarget.releasePointerCapture(event.pointerId);
        } catch {
            // 忽略释放失败
        }
        storeWidth(storageKey, widthRef.current);
    };

    const resetWidth = (): void => {
        widthRef.current = null;
        setWidth(null);
        storeWidth(storageKey, null);
    };

    const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
        if (event.key === "Enter" || event.key === "Backspace" || event.key === "Delete") {
            event.preventDefault();
            resetWidth();
            return;
        }
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
            return;
        }
        event.preventDefault();
        const step = (event.key === "ArrowRight" ? 16 : -16) * (direction === "left" ? 1 : -1);
        applyWidth(resolveCurrentWidth() + step);
        storeWidth(storageKey, widthRef.current);
    };

    useEffect(() => {
        if (!resizing) {
            return;
        }
        document.body.classList.add("is-panel-resizing");
        return () => document.body.classList.remove("is-panel-resizing");
    }, [resizing]);

    const resizerProps = {
        className: `side-resizer${direction === "right" ? " side-resizer--right" : ""}${resizing ? " is-resizing" : ""}`,
        role: "separator" as const,
        "aria-orientation": "vertical" as const,
        "aria-label": "拖动调整宽度，双击恢复默认宽度",
        tabIndex: 0,
        title: "拖动调整宽度，双击恢复默认",
        onPointerDown: handlePointerDown,
        onPointerMove: handlePointerMove,
        onPointerUp: handlePointerEnd,
        onPointerCancel: handlePointerEnd,
        onDoubleClick: resetWidth,
        onKeyDown: handleKeyDown,
    };

    return {
        width, // 自定义宽度：null 表示使用样式默认宽度
        resizing, // 是否正在拖动
        panelRef, // 面板元素引用
        resizerProps, // 分隔条属性
        resetWidth, // 恢复默认宽度
    };
};
