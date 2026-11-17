import { create } from "zustand";

interface IconDragState {
    dragging: boolean; // 是否正在拖动图标（用于放大采集按钮，方便拖入）
    setDragging: (dragging: boolean) => void; // 更新拖动状态
}

/** 图标拖拽的全局状态：只在拖动开始时切换，避免每张卡片都订阅 */
export const useIconDragStore = create<IconDragState>((set) => ({
    dragging: false,
    setDragging: (dragging) => set({ dragging }),
}));
