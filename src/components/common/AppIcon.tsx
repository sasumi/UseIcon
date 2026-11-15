import { LIBRARY_ICON_MAP } from "@/data/library";

/**
 * 应用内小图标（直接使用公共库内置 SVG，避免额外图标字体依赖）
 */
export const AppIcon = ({
    name,
    className,
    size,
    title,
}: {
    name: string; // 公共库图标名
    className?: string; // 额外类名
    size?: number; // 像素尺寸
    title?: string; // 无障碍标题
}) => {
    const icon = LIBRARY_ICON_MAP[`lib-${name}`];
    if (!icon) {
        return null;
    }
    return (
        <span
            className={`app-icon ${className || ""}`}
            style={size ? { width: size, height: size } : undefined}
            title={title}
            aria-hidden={title ? undefined : true}
            dangerouslySetInnerHTML={{ __html: icon.svg }}
        />
    );
};
