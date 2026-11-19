import { useEffect, useMemo, useState } from "react";
import { ColorPicker, Dialog, DropdownMenu, InlineTextEditor, MenuItemDivider, Toast } from "minreact-ui";
import type { MenuEntry } from "minreact-ui";
import { DEFAULT_CODE_TEMPLATE, DEFAULT_ICON_SIZE } from "@/config";
import type { IconItem } from "@/types";
import { rememberCategory } from "@/utils/category";
import { copyText, downloadBlob, downloadSvg } from "@/utils/download";
import { svgToPngBlob } from "@/utils/image";
import { applyIconSize, detectSvgPaint, renderIconCode, setSvgColor, setSvgFillColor, setSvgScale, setSvgStrokeWidth } from "@/utils/svg";
import { AppIcon } from "@/components/common/AppIcon";
import { CategoryInput } from "@/components/common/CategoryInput";
import { SvgPreview } from "@/components/common/SvgPreview";
import { TagEditor } from "@/components/common/TagEditor";
import { SvgCodeDialog } from "@/components/project/SvgCodeDialog";
import { Divider } from "../common/Divider";

const DIALOG_WIDTH = "38em";

/** 复制 / 导出菜单项 */
const SHARE_ITEMS: MenuEntry[] = [
    { value: "copy-code", label: "复制代码", icon: <AppIcon name="copy" /> },
    { value: "copy-svg", label: "复制 SVG", icon: <AppIcon name="code" /> },
    MenuItemDivider,
    { value: "download-svg", label: "下载 SVG", icon: <AppIcon name="download" /> },
    { value: "download-png", label: "下载 PNG", icon: <AppIcon name="image" /> },
];

/** 详情对话框使用的图标字段（项目图标 / 公共库图标通用） */
export type IconDetailTarget = Pick<IconItem, "iconId" | "className" | "svg" | "tags"> & { category?: string };

/** 详情保存入参（svg 已应用外观调整） */
export interface IconDetailPatch {
    className: string; // 图标类名
    tags: string[]; // 标签
    svg: string; // 保存后的 SVG 源码
    category?: string; // 分类
}

/** 图标详情：预览、编辑、代码与导出（公共库与项目共用） */
export const IconDetailDialog = ({
    open,
    setOpen,
    icon,
    canEdit,
    template = DEFAULT_CODE_TEMPLATE,
    size = DEFAULT_ICON_SIZE,
    favorite = false,
    inCart = false,
    categories,
    onFavorite,
    onCart,
    onSave,
    onDelete,
}: {
    open: boolean; // 是否打开
    setOpen: (open: boolean) => void; // 显隐控制
    icon: IconDetailTarget | null; // 当前图标
    canEdit: boolean; // 是否可编辑
    template?: string; // 代码模板
    size?: number; // 图标尺寸
    favorite?: boolean; // 是否已收藏
    inCart?: boolean; // 是否已在采集
    categories?: string[]; // 可选分类（提供时显示分类编辑）
    onFavorite?: () => void; // 收藏切换
    onCart?: () => void; // 采集切换
    onSave: (patch: IconDetailPatch) => Promise<void>; // 保存
    onDelete?: () => void; // 删除
}) => {
    const [className, setClassName] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    const [category, setCategory] = useState("");
    const [baseSvg, setBaseSvg] = useState("");
    const [strokeWidth, setStrokeWidth] = useState("");
    const [color, setColor] = useState("");
    const [fillColor, setFillColor] = useState("");
    const [scale, setScale] = useState(100);
    const [codeOpen, setCodeOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open || !icon) {
            return;
        }
        setClassName(icon.className);
        setTags(icon.tags);
        setCategory(icon.category ?? "");
        setBaseSvg(icon.svg);
        setStrokeWidth("");
        setColor("");
        setFillColor("");
        setScale(100);
        setCodeOpen(false);
    }, [open, icon]);

    const paint = useMemo(() => detectSvgPaint(baseSvg), [baseSvg]);

    // 原始线条粗细（用于粗略滑杆回到原始值）
    const originalStroke = useMemo(() => {
        const match = /stroke-width\s*=\s*"([\d.]+)"/i.exec(baseSvg);
        const value = match ? Number(match[1]) : NaN;
        return Number.isFinite(value) ? value : 0;
    }, [baseSvg]);

    // 外观调整基于原始源码派生，避免反复调整时叠加
    const svg = useMemo(() => {
        try {
            let next = baseSvg;
            if (color) {
                next = setSvgColor(next, color);
            }
            if (fillColor) {
                next = setSvgFillColor(next, fillColor);
            }
            if (strokeWidth) {
                next = setSvgStrokeWidth(next, Number(strokeWidth));
            }
            if (scale !== 100) {
                next = setSvgScale(next, scale);
            }
            return next;
        } catch {
            return baseSvg;
        }
    }, [baseSvg, color, fillColor, strokeWidth, scale]);

    const code = useMemo(() => renderIconCode(template, { className, svg }, size), [template, className, svg, size]);

    if (!icon) {
        return null;
    }

    const save = async () => {
        setSaving(true);
        try {
            await onSave({ className, tags, svg, category: categories ? category.trim() : undefined });
            rememberCategory(category);
            Toast.showSuccess("图标已保存");
            setOpen(false);
        } catch (error) {
            Toast.showError(error instanceof Error ? error.message : "保存失败");
        } finally {
            setSaving(false);
        }
    };

    const remove = () => {
        void Dialog.confirm({
            title: "删除",
            message: `确定删除「${icon.className}」吗？此操作不可恢复。`,
            confirmText: "删除",
        })
            .then(() => {
                onDelete?.();
                setOpen(false);
            })
            .catch(() => undefined);
    };

    const downloadPng = async () => {
        try {
            const blob = await svgToPngBlob(applyIconSize(svg, size), size * 2, "#000000");
            downloadBlob(blob, `${className}@${size * 2}px.png`);
        } catch (error) {
            Toast.showError(error instanceof Error ? error.message : "PNG 导出失败");
        }
    };

    /** 复制 / 导出菜单 */
    const share = (value: unknown) => {
        switch (value) {
            case "copy-code":
                void copyText(code).then(
                    () => Toast.showSuccess("代码已复制"),
                    () => Toast.showError("复制失败"),
                );
                break;
            case "copy-svg":
                void copyText(svg).then(
                    () => Toast.showSuccess("SVG 源码已复制"),
                    () => Toast.showError("复制失败"),
                );
                break;
            case "download-svg":
                downloadSvg({ className, svg }, size);
                break;
            case "download-png":
                void downloadPng();
                break;
            default:
                break;
        }
    };

    return (
        <Dialog open={open} setOpen={setOpen} width={DIALOG_WIDTH} clickMaskerToClose>
            <Dialog.Title>图标信息</Dialog.Title>
            <Dialog.Content>
                <div className="dialog-body">
                    <div className="detail-head">
                        <div className="detail-meta">
                            <div className="detail-field">
                                <label>类名</label>
                                <InlineTextEditor
                                    value={className}
                                    required
                                    readonly={!canEdit}
                                    placeholder="例如：icon-home"
                                    saveHandler={async (value) => {
                                        const next = value.trim();
                                        if (next) {
                                            setClassName(next);
                                        }
                                    }}
                                />
                            </div>
                            <div className="detail-field">
                                <label>标签</label>
                                <TagEditor value={tags} onChange={setTags} disabled={!canEdit} />
                            </div>

                            {categories &&
                                (canEdit ? (
                                    <div className="detail-field">
                                        <label>分类</label>
                                        <div className="detail-select">
                                            <CategoryInput value={category} onChange={setCategory} options={categories} />
                                        </div>
                                    </div>
                                ) : (
                                    category && (
                                        <div className="detail-field">
                                            <label>分类</label>
                                            <div>
                                                <span className="ui-chip">{category}</span>
                                            </div>
                                        </div>
                                    )
                                ))}
                        </div>
                        <div className="detail-preview">
                            <SvgPreview svg={svg} size={64} />
                            <div className="detail-preview__actions">
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
                                        onClick={onCart}
                                    >
                                        <AppIcon name="cart" />
                                    </button>
                                )}
                            </div>
                        </div>
                        {canEdit && (
                            <div className="detail-appearance">
                                {paint.stroked && (
                                    <div className="detail-appearance__row">
                                        <label>线条粗细</label>
                                        <input
                                            className="display-range"
                                            type="range"
                                            min={0.5}
                                            max={4}
                                            step={0.25}
                                            value={strokeWidth || originalStroke || 1.75}
                                            onChange={(event) => setStrokeWidth(event.target.value)}
                                        />
                                        <span className="detail-appearance__value">{strokeWidth || originalStroke}</span>
                                        {strokeWidth && originalStroke != Number(strokeWidth) && <AppIcon name="undo" onClick={() => setStrokeWidth("")} />}
                                    </div>
                                )}
                                <div className="detail-appearance__row">
                                    <label>图标颜色</label>
                                    <ColorPicker value={color} fallback="#1f1f1f" emptyLabel="默认" title={color || "默认跟随文字色"} onChange={setColor} />
                                    <span className="detail-appearance__value">{color || "currentColor"}</span>
                                </div>
                                {paint.filled && (
                                    <div className="detail-appearance__row">
                                        <label>填充颜色</label>
                                        <ColorPicker
                                            value={fillColor}
                                            fallback="#1f1f1f"
                                            emptyLabel="默认"
                                            title={fillColor || "默认跟随文字色"}
                                            onChange={setFillColor}
                                        />
                                        <span className="detail-appearance__value">{fillColor || "currentColor"}</span>
                                    </div>
                                )}
                                <div className="detail-appearance__row">
                                    <label>图标占比</label>
                                    <input
                                        className="display-range"
                                        type="range"
                                        min={50}
                                        max={100}
                                        step={5}
                                        value={scale}
                                        onChange={(event) => setScale(Number(event.target.value))}
                                    />
                                    <span className="detail-appearance__value">{scale}%</span>
                                    {scale !== 100 && (
                                        <button className="ui-btn button-small button-tonal" type="button" onClick={() => setScale(100)}>
                                            100%
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Dialog.Content>
            <SvgCodeDialog
                open={codeOpen}
                setOpen={setCodeOpen}
                value={baseSvg}
                onSave={(next) => {
                    setBaseSvg(next);
                    // 手动改源码后重置外观调整，避免与派生结果叠加
                    setStrokeWidth("");
                    setColor("");
                    setFillColor("");
                    setScale(100);
                }}
            />
            <Dialog.Action align="right">
                {canEdit && onDelete && (
                    <div style={{ display: "flex", alignItems: "center" }}>
                        <button className="ui-btn button-tonal danger" type="button" onClick={remove}>
                            <AppIcon name="trash" />
                            删除
                        </button>
                        <Divider />
                        <button className="ui-btn small button-tonal" type="button" onClick={() => setCodeOpen(true)}>
                            <AppIcon name="code" />
                            编辑源码
                        </button>
                    </div>
                )}
                <div className="spacer" />
                {canEdit && (
                    <button className="ui-btn primary" type="button" disabled={saving} onClick={() => void save()}>
                        {saving ? "保存中..." : "保存修改"}
                    </button>
                )}
                <DropdownMenu
                    items={SHARE_ITEMS}
                    onChange={share}
                    trigger={
                        <button className="ui-btn" type="button">
                            <AppIcon name="download" />
                            导出
                        </button>
                    }
                />
                <button className="ui-btn" type="button" onClick={() => setOpen(false)}>
                    关闭
                </button>
            </Dialog.Action>
        </Dialog>
    );
};
