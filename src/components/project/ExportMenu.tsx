import { DropdownMenu, MenuItemDivider, Toast } from "minreact-ui";
import type { MenuEntry } from "minreact-ui";
import type { ReactNode } from "react";
import type { IconItem } from "@/types";
import { exportIconfontZip, exportJson, exportPngZip, exportSpriteFile, exportSvgZip } from "@/utils/export";
import { AppIcon } from "@/components/common/AppIcon";

/**
 * 批量导出菜单：SVG 列表 / SVG Sprite / PNG / iconfont 字体包 / JSON
 */
export const ExportMenu = ({
    icons,
    projectName,
    size,
    color = "#000000",
    label = "导出",
    trigger,
}: {
    icons: IconItem[]; // 待导出图标
    projectName: string; // 项目名（用于文件名）
    size: number; // PNG 尺寸
    color?: string; // PNG 颜色
    label?: string; // 按钮文字
    trigger?: ReactNode; // 自定义触发器
}) => {
    const items: MenuEntry[] = [
        { value: "svg", label: "SVG 列表", icon: <AppIcon name="download" /> },
        { value: "sprite", label: "SVG Sprite", icon: <AppIcon name="code" /> },
        { value: "png", label: "PNG 图片", icon: <AppIcon name="image" /> },
        MenuItemDivider,
        { value: "iconfont", label: "iconfont 字体包", icon: <AppIcon name="tag" /> },
        { value: "json", label: "JSON 数据", icon: <AppIcon name="file-code" /> },
    ];

    const handle = async (value: unknown) => {
        if (icons.length === 0) {
            Toast.showWarning("没有可导出的图标");
            return;
        }
        if (value === "svg" || value === "png" || value === "iconfont") {
            Toast.showInfo("正在生成压缩包，请稍候...");
        }
        try {
            switch (value) {
                case "svg":
                    await exportSvgZip(icons, projectName);
                    Toast.showSuccess("SVG 列表已导出");
                    break;
                case "sprite":
                    exportSpriteFile(icons, projectName);
                    Toast.showSuccess("SVG Sprite 已导出");
                    break;
                case "png":
                    await exportPngZip(icons, projectName, size, color);
                    Toast.showSuccess("PNG 包已导出");
                    break;
                case "iconfont":
                    await exportIconfontZip(icons, projectName);
                    Toast.showSuccess("iconfont 字体包已导出");
                    break;
                case "json":
                    exportJson(icons, projectName);
                    Toast.showSuccess("JSON 已导出");
                    break;
                default:
                    break;
            }
        } catch (error) {
            Toast.showError(error instanceof Error ? error.message : "导出失败");
        }
    };

    return (
        <DropdownMenu
            items={items}
            onChange={(value) => void handle(value)}
            trigger={
                trigger || (
                    <button type="button" className="ui-btn small">
                        <AppIcon name="download" />
                        {label}
                    </button>
                )
            }
        />
    );
};
