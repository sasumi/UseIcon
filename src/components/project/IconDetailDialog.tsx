import { useEffect, useMemo, useState } from "react";
import { Dialog, InlineTextEditor, Toast } from "minreact-ui";
import { DEFAULT_CODE_TEMPLATE, DEFAULT_ICON_SIZE } from "@/config";
import type { IconItem } from "@/types";
import { rememberCategory } from "@/utils/category";
import { copyText, downloadBlob, downloadSvg } from "@/utils/download";
import { svgToPngBlob } from "@/utils/image";
import { applyIconSize, detectSvgPaint, renderIconCode, setSvgColor, setSvgFillColor, setSvgScale, setSvgStrokeWidth } from "@/utils/svg";
import { AppIcon } from "@/components/common/AppIcon";
import { CategoryInput } from "@/components/common/CategoryInput";
import { ColorPicker } from "@/components/common/ColorPicker";
import { SvgPreview } from "@/components/common/SvgPreview";
import { TagEditor } from "@/components/common/TagEditor";
import { SvgCodeDialog } from "@/components/project/SvgCodeDialog";

const DIALOG_WIDTH = "38em";

/** 详情对话框使用的图标字段（项目图标 / 公共库图标通用） */
export type IconDetailTarget = Pick<IconItem, "id" | "className" | "svg" | "tags"> & { category?: string };

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
    inCart?: boolean; // 是否已在采集车
    categories?: string[]; // 可选分类（提供时显示分类编辑）
    onFavorite?: () => void; // 收藏切换
    onCart?: () => void; // 采集车切换
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

    return (
        <Dialog open={open} setOpen={setOpen} width={DIALOG_WIDTH} clickMaskerToClose>
            <Dialog.Title>{icon.className}</Dialog.Title>
            <Dialog.Content>
                <div className="dialog-body">
                    <div className="detail-head">
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
                                        title={inCart ? "移出采集车" : "加入采集车"}
                                        onClick={onCart}
                                    >
                                        <AppIcon name="cart" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="detail-meta">
                            <div className="detail-field">
                                <InlineTextEditor
                                    value={className}
                                    required
                                    readonly={!canEdit}
                                    placeholder="类名（css）"
                                    saveHandler={async (value) => {
                                        const next = value.trim();
                                        if (next) {
                                            setClassName(next);
                                        }
                                    }}
                                />
                            </div>
                            <div className="detail-field">
                                <TagEditor value={tags} onChange={setTags} disabled={!canEdit} />
                            </div>

                            {categories &&
                                (canEdit ? (
                                    <div className="detail-field">
                                        <label>分类</label>
                                        <CategoryInput value={category} onChange={setCategory} options={categories} />
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
                                            <span className="detail-appearance__value">
                                                {strokeWidth ? `${strokeWidth}（调整后）` : `原始${originalStroke ? ` ${originalStroke}` : ""}`}
                                            </span>
                                            {strokeWidth && (
                                                <button className="ui-btn button-small button-tonal" type="button" onClick={() => setStrokeWidth("")}>
                                                    复位
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    <div className="detail-appearance__row">
                                        <label>图标颜色</label>
                                        <ColorPicker
                                            value={color}
                                            fallback="#1f1f1f"
                                            title={color || "默认跟随文字色"}
                                            onChange={setColor}
                                        />
                                        <span className="detail-appearance__value">{color || "currentColor"}</span>
                                        {color && (
                                            <button className="ui-btn button-small button-tonal" type="button" onClick={() => setColor("")}>
                                                默认
                                            </button>
                                        )}
                                    </div>
                                    {paint.filled && (
                                        <div className="detail-appearance__row">
                                            <label>填充颜色</label>
                                            <ColorPicker
                                                value={fillColor}
                                                fallback="#1f1f1f"
                                                title={fillColor || "默认跟随文字色"}
                                                onChange={setFillColor}
                                            />
                                            <span className="detail-appearance__value">{fillColor || "currentColor"}</span>
                                            {fillColor && (
                                                <button className="ui-btn button-small button-tonal" type="button" onClick={() => setFillColor("")}>
                                                    默认
                                                </button>
                                            )}
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

                    <div className="detail-code">
                        <div className="toolbar">
                            {canEdit && (
                                <button className="ui-btn small button-tonal" type="button" onClick={() => setCodeOpen(true)}>
                                    <AppIcon name="code" />
                                    编辑 SVG 源码
                                </button>
                            )}
                            <button
                                className="ui-btn small"
                                type="button"
                                onClick={() =>
                                    void copyText(code).then(
                                        () => Toast.showSuccess("代码已复制"),
                                        () => Toast.showError("复制失败"),
                                    )
                                }
                            >
                                <AppIcon name="copy" />
                                复制代码
                            </button>
                            <button
                                className="ui-btn small"
                                type="button"
                                onClick={() =>
                                    void copyText(svg).then(
                                        () => Toast.showSuccess("SVG 源码已复制"),
                                        () => Toast.showError("复制失败"),
                                    )
                                }
                            >
                                <AppIcon name="code" />
                                复制 SVG
                            </button>
                            <button className="ui-btn small" type="button" onClick={() => downloadSvg({ className, svg }, size)}>
                                <AppIcon name="download" />
                                SVG
                            </button>
                            <button className="ui-btn small" type="button" onClick={() => void downloadPng()}>
                                <AppIcon name="image" />
                                PNG
                            </button>
                        </div>
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
                    <button className="ui-btn danger" type="button" onClick={remove}>
                        <AppIcon name="trash" />
                        删除
                    </button>
                )}
                <div className="spacer" />
                <button className="ui-btn" type="button" onClick={() => setOpen(false)}>
                    关闭
                </button>
                {canEdit && (
                    <button className="ui-btn primary" type="button" disabled={saving} onClick={() => void save()}>
                        {saving ? "保存中..." : "保存修改"}
                    </button>
                )}
            </Dialog.Action>
        </Dialog>
    );
};