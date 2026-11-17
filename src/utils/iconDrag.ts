import type { CartItem } from "@/store/cartStore";

/** 拖拽采集的自定义数据类型（用于识别拖拽来源） */
export const ICON_DRAG_TYPE = "application/x-useicon-icons";

/** 本次拖拽携带的采集条目（DataTransfer 只能传字符串，多选时在模块内暂存） */
let dragging: CartItem[] = [];

/** 记录本次拖拽要采集的条目 */
export const setIconDragItems = (items: CartItem[]): void => {
    dragging = items;
};

/** 读取并清空本次拖拽的采集条目 */
export const takeIconDragItems = (): CartItem[] => {
    const items = dragging;
    dragging = [];
    return items;
};

/** 清空拖拽暂存（拖拽结束 / 取消时） */
export const clearIconDragItems = (): void => {
    dragging = [];
};

/** 当前拖拽是否携带图标采集数据 */
export const hasIconDragItems = (dataTransfer: DataTransfer | null): boolean =>
    Boolean(dataTransfer && Array.from(dataTransfer.types).includes(ICON_DRAG_TYPE));

/**
 * 多选拖动时的拖拽影像：叠放卡片 + 数量角标（类似资源管理器）
 * @param dataTransfer 拖拽事件的数据载体
 * @param count 本次拖动的图标数量
 * @param svg 被拖动图标的 SVG（作为最上层预览）
 */
export const setMultiDragImage = (dataTransfer: DataTransfer, count: number, svg: string): void => {
    const proxy = document.createElement("div");
    proxy.className = "icon-drag-proxy";
    proxy.innerHTML = `
        <span class="icon-drag-proxy__layer icon-drag-proxy__layer--back"></span>
        <span class="icon-drag-proxy__layer icon-drag-proxy__layer--mid"></span>
        <span class="icon-drag-proxy__card">${svg}</span>
        <span class="icon-drag-proxy__badge">${count}</span>
    `;
    document.body.appendChild(proxy);
    const rect = proxy.getBoundingClientRect();
    dataTransfer.setDragImage(proxy, Math.round(rect.width / 2), Math.round(rect.height / 2));
    window.setTimeout(() => proxy.remove(), 0);
};
