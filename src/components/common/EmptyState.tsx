import type { ReactNode } from "react";
import { AppIcon } from "./AppIcon";

/** 空状态占位 */
export const EmptyState = ({
    text,
    icon = "box",
    children,
}: {
    text: string; // 文案
    icon?: string; // 图标名
    children?: ReactNode; // 操作区
}) => (
    <div className="ui-empty">
        <AppIcon name={icon} className="ui-empty-icon" />
        <span>{text}</span>
        {children}
    </div>
);
