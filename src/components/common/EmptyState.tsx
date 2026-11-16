import type { ReactNode } from "react";
import { EmptyHolder, ErrorHolder } from "minreact-ui";

/** 空数据 / 错误占位：统一使用 minreact-ui 的 EmptyHolder / ErrorHolder，可选操作区 */
export const EmptyState = ({
    text,
    variant = "empty",
    children,
}: {
    text: string; // 文案
    variant?: "empty" | "error"; // 占位类型：空数据 / 错误
    children?: ReactNode; // 操作区
}) => (
    <div className="ui-empty">
        {variant === "error" ? <ErrorHolder error={text} /> : <EmptyHolder text={text} />}
        {children}
    </div>
);
