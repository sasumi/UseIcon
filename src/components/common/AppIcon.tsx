import type { HTMLAttributes } from "react";
import { LIBRARY_ICON_MAP } from "@/data/library";

/**
 * 应用内小图标（直接使用公共库内置 SVG，避免额外图标字体依赖）
 */
export const AppIcon = ({
    name,
    size,
    ...props
}: {
    name: string; // 公共库图标名
    size?: number; // 像素尺寸
} & Omit<HTMLAttributes<HTMLSpanElement>, "children">) => {
    const icon = LIBRARY_ICON_MAP[`lib-${name}`];
    if (!icon) {
        console.warn(`AppIcon: 未找到图标 ${name}`);
        return null;
    }
    return (
        <span
            {...props}
            className={`app-icon ${props.className || ""}`}
            style={size ? { width: size, height: size, ...props.style } : props.style}
            aria-hidden={props.title ? undefined : true}
            dangerouslySetInnerHTML={{ __html: icon.svg }}
        />
    );
};
