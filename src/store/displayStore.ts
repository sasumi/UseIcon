import { ICON_DISPLAY_STORAGE_KEY } from "@/config";
import { create } from "zustand";

/** 图标列表显示参数（全局唯一，保存在本机） */
export interface IconDisplay {
    size: number; // 图标显示尺寸（px）
    padding: number; // 图标内边距（px）
    color: string; // 图标颜色，空表示沿用 currentColor
    background: string; // 预览背景色，空表示透明
}

export const DEFAULT_ICON_DISPLAY: IconDisplay = { size: 24, padding: 9, color: "", background: "" };

/** 旧版按页面分开保存的键，读取时兼容迁移 */
const LEGACY_STORAGE_KEY = "useicon:library-display";

const readDisplay = (): IconDisplay => {
    try {
        let raw = localStorage.getItem(ICON_DISPLAY_STORAGE_KEY);
        if (!raw) {
            // 兼容早期按页面保存的键：读取后迁移到全局键
            const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
            if (legacy) {
                localStorage.setItem(ICON_DISPLAY_STORAGE_KEY, legacy);
                localStorage.removeItem(LEGACY_STORAGE_KEY);
                raw = legacy;
            }
        }
        if (!raw) {
            return DEFAULT_ICON_DISPLAY;
        }
        const parsed = JSON.parse(raw) as Partial<IconDisplay>;
        return { ...DEFAULT_ICON_DISPLAY, ...parsed };
    } catch {
        return DEFAULT_ICON_DISPLAY;
    }
};

const writeDisplay = (display: IconDisplay): void => {
    localStorage.setItem(ICON_DISPLAY_STORAGE_KEY, JSON.stringify(display));
};

interface DisplayState {
    display: IconDisplay; // 当前显示参数
    updateDisplay: (patch: Partial<IconDisplay>) => void; // 局部更新并持久化
    resetDisplay: () => void; // 恢复默认
}

export const useDisplayStore = create<DisplayState>((set, get) => ({
    display: readDisplay(),
    updateDisplay: (patch) => {
        const next = { ...get().display, ...patch };
        writeDisplay(next);
        set({ display: next });
    },
    resetDisplay: () => {
        writeDisplay(DEFAULT_ICON_DISPLAY);
        set({ display: DEFAULT_ICON_DISPLAY });
    },
}));
