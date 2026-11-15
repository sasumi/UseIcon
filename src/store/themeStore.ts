import { THEME_LIST, THEME_STORAGE_KEY } from "@/config";
import type { ThemeMode } from "@/types";
import { create } from "zustand";

/** 读取已保存的主题，默认跟随系统 */
const readTheme = (): ThemeMode => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    return saved && THEME_LIST.includes(saved) ? saved : "auto";
};

/** 主题写入根节点，供 CSS 变量与 SCSS mixin 使用 */
const applyTheme = (theme: ThemeMode): void => {
    document.documentElement.setAttribute("data-theme", theme);
};

interface ThemeState {
    theme: ThemeMode; // 当前主题模式
    setTheme: (theme: ThemeMode) => void; // 切换主题
    cycleTheme: () => void; // 在三种模式之间循环
}

export const useThemeStore = create<ThemeState>((set, get) => ({
    theme: readTheme(),
    setTheme: (theme) => {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
        applyTheme(theme);
        set({ theme });
    },
    cycleTheme: () => {
        const index = THEME_LIST.indexOf(get().theme);
        get().setTheme(THEME_LIST[(index + 1) % THEME_LIST.length]);
    },
}));

/** 启动时应用主题（在渲染前调用，避免闪烁） */
export const initTheme = (): void => {
    applyTheme(useThemeStore.getState().theme);
};
