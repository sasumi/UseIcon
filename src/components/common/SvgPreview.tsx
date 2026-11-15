import type { CSSProperties } from "react";

/**
 * SVG 预览容器：图标源码中的尺寸属性已被移除，显示尺寸由容器控制
 */
export const SvgPreview = ({
    svg,
    size = 24,
    className,
    title,
    style,
}: {
    svg: string; // SVG 源码
    size?: number; // 显示尺寸（像素）
    className?: string; // 额外类名
    title?: string; // 悬浮提示
    style?: CSSProperties; // 额外样式
}) => (
    <span
        className={`svg-preview ${className || ""}`}
        style={{ width: size, height: size, ...style }}
        title={title}
        aria-hidden={title ? undefined : true}
        dangerouslySetInnerHTML={{ __html: svg }}
    />
);
