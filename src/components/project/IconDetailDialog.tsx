import { useEffect, useMemo, useState } from "react";
import { Dialog, InlineTextEditor, Toast } from "minreact-ui";
import { api } from "@/api";
import type { IconItem } from "@/types";
import { copyText, downloadBlob, downloadSvg } from "@/utils/download";
import { svgToPngBlob } from "@/utils/image";
import { applyIconSize, detectSvgPaint, renderIconCode, setSvgColor, setSvgFillColor, setSvgScale, setSvgStrokeWidth } from "@/utils/svg";
import { AppIcon } from "@/components/common/AppIcon";
import { ColorPicker } from "@/components/common/ColorPicker";
import { SvgPreview } from "@/components/common/SvgPreview";
import { TagEditor } from "@/components/common/TagEditor";
import { SvgCodeDialog } from "@/components/project/SvgCodeDialog";

const DIALOG_WIDTH = "38em";

/** 图标详情：预览、编辑、代码与导出 */
export const IconDetailDialog = ({
    open,
    setOpen,
    icon,
    template,
    size,
    canEdit,
    favorite = false,
    inCart = false,
    onFavorite,
    onCart,
    onUpdated,
    onDeleted,
}: {
    open: boolean; // 是否打开
    setOpen: (open: boolean) => void; // 显隐控制
    icon: IconItem | null; // 当前图标
    template: string; // 项目代码模板
    size: number; // 项目图标尺寸
    canEdit: boolean; // 是否可编辑
    favorite?: boolean; // 是否已收藏
    inCart?: boolean; // 是否已在采集车
    onFavorite?: () => void; // 收藏切换
    onCart?: () => void; // 采集车切换
    onUpdated: (icon: IconItem) => void; // 保存回调
    onDeleted: (iconId: string) => void; // 删除回调
}) => {
    const [className, setClassName] = useState("");
    const [tags, setTags] = useState<string[]>([]);
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
            const updated = await api.icons.updateIcon(icon.id, {
                className,
                tags,
                svg,
            });
            onUpdated(updated);
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
            onPreConfirm: () => {
                void api.icons
                    .deleteIcons([icon.id])
                    .then(() => {
                        Toast.showSuccess("图标已删除");
                        setOpen(false);
                        onDeleted(icon.id);
                    })
                    .catch((error: unknown) => Toast.showError(error instanceof Error ? error.message : "删除失败"));
                return false;
            },
        }).catch(() => undefined);
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
                {canEdit && (
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
