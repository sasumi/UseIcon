import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";

const clampValue = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, Math.round(value)));

const readHeight = (storageKey: string): number | null => {
    try {
        const raw = localStorage.getItem(storageKey);
        const value = raw === null ? Number.NaN : Number(raw);
        return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
    } catch {
        return null;
    }
};

const storeHeight = (storageKey: string, height: number | null): void => {
    try {
        if (height === null) {
            localStorage.removeItem(storageKey);
        } else {
            localStorage.setItem(storageKey, String(height));
        }
    } catch {
        // 忽略 storage 异常
    }
};

export interface PanelHeightOptions {
    storageKey: string; // 高度记忆键
    defaultHeight: number; // 默认高度（px）
    min?: number; // 最小高度（px）
    max?: number; // 最大高度（px）
}

/**
 * 拖动横向分隔条调整面板高度：向上拖动变高，双击 / 回车重置，方向键微调，高度记忆到本地。
 */
export const usePanelHeight = ({ storageKey, defaultHeight, min = 110, max = 520 }: PanelHeightOptions) => {
    const [height, setHeight] = useState<number | null>(() => readHeight(storageKey));
    const [resizing, setResizing] = useState(false);
    const panelRef = useRef<HTMLDivElement | null>(null);
    const dragRef = useRef({ startY: 0, startHeight: 0 });
    const heightRef = useRef<number | null>(height);
    heightRef.current = height;

    const clamp = (value: number): number => clampValue(value, min, Math.max(min, Math.min(max, window.innerHeight - 140)));
    const resolveCurrentHeight = (): number => heightRef.current ?? Math.round(panelRef.current?.getBoundingClientRect().height || defaultHeight);

    const applyHeight = (value: number): void => {
        const next = clamp(value);
        heightRef.current = next;
        setHeight(next);
    };

    const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
        if (event.button !== 0) {
            return;
        }
        event.preventDefault();
        dragRef.current = { startY: event.clientY, startHeight: resolveCurrentHeight() };
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
        applyHeight(dragRef.current.startHeight - (event.clientY - dragRef.current.startY));
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
        storeHeight(storageKey, heightRef.current);
    };

    const resetHeight = (): void => {
        heightRef.current = null;
        setHeight(null);
        storeHeight(storageKey, null);
    };

    const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
        if (event.key === "Enter" || event.key === "Backspace" || event.key === "Delete") {
            event.preventDefault();
            resetHeight();
            return;
        }
        if (event.key !== "ArrowUp" && event.key !== "ArrowDown") {
            return;
        }
        event.preventDefault();
        applyHeight(resolveCurrentHeight() + (event.key === "ArrowUp" ? 16 : -16));
        storeHeight(storageKey, heightRef.current);
    };

    useEffect(() => {
        if (!resizing) {
            return;
        }
        document.body.classList.add("is-panel-resizing-vertical");
        return () => document.body.classList.remove("is-panel-resizing-vertical");
    }, [resizing]);

    const resizerProps = {
        className: `row-resizer${resizing ? " is-resizing" : ""}`,
        role: "separator" as const,
        "aria-orientation": "horizontal" as const,
        "aria-label": "拖动调整面板高度，双击恢复默认高度",
        tabIndex: 0,
        title: "拖动调整高度，双击恢复默认",
        onPointerDown: handlePointerDown,
        onPointerMove: handlePointerMove,
        onPointerUp: handlePointerEnd,
        onPointerCancel: handlePointerEnd,
        onDoubleClick: resetHeight,
        onKeyDown: handleKeyDown,
    };

    return {
        height, // 自定义高度：null 表示使用样式默认高度
        resizing, // 是否正在拖动
        panelRef, // 面板元素引用
        resizerProps, // 分隔条属性
        resetHeight, // 恢复默认高度
    };
};
