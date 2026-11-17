import { Checkbox, DropdownMenu, MenuItemDivider } from "minreact-ui";
import type { MenuEntry } from "minreact-ui";
import type { CartItem } from "@/store/cartStore";
import { useDisplayStore } from "@/store/displayStore";
import { useIconDragStore } from "@/store/iconDragStore";
import { useTimedTip } from "@/hooks/useTimedTip";
import { clearIconDragItems, ICON_DRAG_TYPE, setIconDragItems, setMultiDragImage } from "@/utils/iconDrag";
import { AppIcon } from "@/components/common/AppIcon";
import { SvgPreview } from "@/components/common/SvgPreview";
import { TipBubble } from "@/components/common/TipBubble";

/** 卡片数据（项目图标 / 公共库图标 / 收藏项通用） */
export interface IconCardData {
    className: string; // 图标类名
    tags: string[]; // 标签列表
    svg: string; // SVG 源码
}

/**
 * 通用图标卡片：统一显示 className 与标签行，操作项包括收藏 / 采集 / 更多菜单。
 */
export const IconCard = ({
    icon,
    size,
    previewPadding,
    previewColor,
    previewBackground,
    draggable,
    code,
    dragItems,
    selected = false,
    selectable = false,
    canEdit = false,
    favorite = false,
    inCart = false,
    deleteLabel = "删除",
    editLabel = "编辑",
    showOpenItem = true,
    onToggleSelect,
    onOpen,
    onCopy,
    onCopySvg,
    onCart,
    onFavorite,
    onDownload,
    onDownloadPng,
    onDelete,
    onEdit,
}: {
    icon: IconCardData; // 图标数据
    size?: number; // 预览尺寸，默认取全局显示设置
    previewPadding?: number; // 预览内边距（px），默认取全局显示设置
    previewColor?: string; // 预览图标颜色，默认取全局显示设置
    previewBackground?: string; // 预览背景色，默认取全局显示设置
    draggable?: boolean; // 是否允许拖拽（默认有 code 或 dragItems 时允许）
    code?: string; // 拖拽 / 复制的代码
    dragItems?: () => CartItem[]; // 拖拽到采集按钮时携带的条目（多选时返回选中项）
    selected?: boolean; // 是否选中
    selectable?: boolean; // 是否可多选
    canEdit?: boolean; // 是否可编辑（决定删除项）
    favorite?: boolean; // 是否已收藏
    inCart?: boolean; // 是否已在采集
    deleteLabel?: string; // 删除项文案
    editLabel?: string; // 编辑项文案
    showOpenItem?: boolean; // 菜单是否显示「查看详情」
    onToggleSelect?: (checked: boolean) => void; // 勾选回调
    onOpen?: () => void; // 打开详情
    onCopy?: () => void; // 复制代码
    onCopySvg?: () => void; // 复制 SVG 源码
    onCart?: () => void; // 加入 / 移出采集
    onFavorite?: () => void; // 收藏 / 取消收藏
    onDownload?: () => void; // 下载 SVG
    onDownloadPng?: () => void; // 下载 PNG
    onDelete?: () => void; // 删除 / 移除
    onEdit?: () => void; // 编辑
}) => {
    const display = useDisplayStore((state) => state.display);
    const iconSize = size ?? display.size;
    const padding = previewPadding ?? display.padding;
    const color = previewColor ?? display.color;
    const background = previewBackground ?? display.background;
    const { tip: cartTip, show: showCartTip } = useTimedTip();

    const menuItems: MenuEntry[] = [];
    if (onCopy && code) {
        menuItems.push({ value: "copy", label: "复制代码", icon: <AppIcon name="copy" /> });
    }
    if (onCopySvg) {
        menuItems.push({ value: "copy-svg", label: "复制 SVG 代码", icon: <AppIcon name="copy" /> });
    }
    if (onEdit) {
        menuItems.push({ value: "edit", label: editLabel, icon: <AppIcon name="edit" /> });
    }
    if (onDownload) {
        menuItems.push({ value: "download", label: "下载 SVG", icon: <AppIcon name="download" /> });
    }
    if (onDownloadPng) {
        menuItems.push({ value: "download-png", label: "下载为 PNG 图标", icon: <AppIcon name="image" /> });
    }
    if (onOpen && showOpenItem) {
        menuItems.push({ value: "open", label: "查看", icon: <AppIcon name="eye" /> });
    }
    if (onDelete && (canEdit || deleteLabel !== "删除")) {
        if (menuItems.length > 0) {
            menuItems.push(MenuItemDivider);
        }
        menuItems.push({ value: "delete", label: deleteLabel, icon: <AppIcon name="trash" />, className: "danger" });
    }

    const handleMenu = (value: unknown) => {
        switch (value) {
            case "copy":
                onCopy?.();
                break;
            case "copy-svg":
                onCopySvg?.();
                break;
            case "edit":
                onEdit?.();
                break;
            case "download":
                onDownload?.();
                break;
            case "download-png":
                onDownloadPng?.();
                break;
            case "open":
                onOpen?.();
                break;
            case "delete":
                onDelete?.();
                break;
            default:
                break;
        }
    };

    const canDragCode = Boolean(code);
    const canDrag = draggable ?? (canDragCode || Boolean(dragItems));
    const dragTitle = canDragCode
        ? dragItems
            ? `${icon.className}\n拖动可插入代码，拖到采集按钮可加入采集`
            : `${icon.className}\n拖动可插入代码`
        : dragItems
          ? `${icon.className}\n拖动到采集按钮可加入采集`
          : icon.className;

    return (
        <div
            className={`icon-card ${selected ? "selected" : ""}`}
            draggable={canDrag}
            title={dragTitle}
            onDragStart={(event) => {
                const items = dragItems?.() ?? [];
                if (items.length > 0) {
                    setIconDragItems(items);
                    useIconDragStore.getState().setDragging(true);
                    event.dataTransfer.setData(ICON_DRAG_TYPE, String(items.length));
                    // 多选拖动时用叠放卡片 + 数量角标作为拖拽影像
                    if (items.length > 1) {
                        setMultiDragImage(event.dataTransfer, items.length, icon.svg);
                    }
                }
                if (!canDragCode || !code) {
                    if (items.length > 0) {
                        event.dataTransfer.effectAllowed = "copy";
                    }
                    return;
                }
                event.dataTransfer.setData("text/plain", code);
                event.dataTransfer.setData("text/html", icon.svg);
                event.dataTransfer.effectAllowed = "copy";
            }}
            onDragEnd={() => {
                clearIconDragItems();
                useIconDragStore.getState().setDragging(false);
            }}
            onClick={onOpen}
        >
            {selectable && (
                <span className="icon-card__check" onClick={(event) => event.stopPropagation()}>
                    <Checkbox checked={selected} onChange={(checked) => onToggleSelect?.(checked)} aria-label={`选择 ${icon.className}`} />
                </span>
            )}
            <span className="icon-card__actions" onClick={(event) => event.stopPropagation()}>
                {onFavorite && (
                    <button
                        className={`icon-card__quick-btn ${favorite ? "active-favorite" : ""}`}
                        type="button"
                        title={favorite ? "取消收藏" : "收藏图标"}
                        onClick={onFavorite}
                    >
                        <AppIcon name="star" />
                    </button>
                )}
                {onCart && (
                    <button
                        className={`icon-card__quick-btn ${inCart ? "active-cart" : ""}`}
                        type="button"
                        title={inCart ? "移出采集" : "采集"}
                        onClick={() => {
                            onCart();
                            showCartTip(inCart ? "已移出采集" : "已采集");
                        }}
                    >
                        <AppIcon name="cart" />
                    </button>
                )}
                {menuItems.length > 0 && (
                    <DropdownMenu
                        items={menuItems}
                        onChange={handleMenu}
                        trigger={
                            <span className="icon-card__quick-btn" title="更多操作">
                                <AppIcon name="more-horizontal" />
                            </span>
                        }
                    />
                )}
            </span>
            <TipBubble text={cartTip} />
            <div
                className="icon-card__preview"
                style={{
                    width: iconSize + padding * 2,
                    height: iconSize + padding * 2,
                    padding,
                    background: background || undefined,
                    color: color || undefined,
                }}
            >
                <SvgPreview svg={icon.svg} size={iconSize} />
            </div>
            <div className="icon-card__meta">
                <span className="icon-card__name">{icon.className}</span>
                {icon.tags.length > 0 && <span className="icon-card__tags">{icon.tags.join(" · ")}</span>}
            </div>
        </div>
    );
};
