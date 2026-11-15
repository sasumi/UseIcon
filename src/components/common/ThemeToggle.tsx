import { THEME_LABELS } from "@/config";
import { useThemeStore } from "@/store/themeStore";
import { AppIcon } from "./AppIcon";

/** 主题切换按钮：亮色 / 暗色 / 跟随系统循环 */
export const ThemeToggle = ({ className }: { className?: string }) => {
    const theme = useThemeStore((state) => state.theme);
    const cycleTheme = useThemeStore((state) => state.cycleTheme);
    const icon = theme === "light" ? "sun" : theme === "dark" ? "moon" : "monitor";
    return (
        <button className={`ui-icon-btn ${className || ""}`} type="button" title={`主题：${THEME_LABELS[theme]}（点击切换）`} onClick={cycleTheme}>
            <AppIcon name={icon} />
        </button>
    );
};
