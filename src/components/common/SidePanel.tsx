import type { ReactNode } from "react";
import { PANEL_WIDTH_STORAGE_PREFIX } from "@/config";
import { usePanelResize } from "@/hooks/usePanelResize";

/**
 * 可调宽度的左侧侧栏：拖动右侧分隔条调整宽度，双击恢复默认。
 */
export const SidePanel = ({
    storageKey,
    defaultWidth = 240,
    minWidth = 176,
    maxWidth = 520,
    children,
}: {
    storageKey: string; // 宽度记忆标识
    defaultWidth?: number; // 默认宽度（px）
    minWidth?: number; // 最小宽度（px）
    maxWidth?: number; // 最大宽度（px）
    children: ReactNode; // 侧栏内容
}) => {
    const { width, panelRef, resizerProps } = usePanelResize({
        storageKey: `${PANEL_WIDTH_STORAGE_PREFIX}${storageKey}`,
        defaultWidth,
        min: minWidth,
        max: maxWidth,
    });

    return (
        <>
            <aside className="side-panel" ref={panelRef} style={width ? { width: `${width}px` } : undefined}>
                {children}
            </aside>
            <div {...resizerProps} />
        </>
    );
};
