import { useEffect, useMemo, useState } from "react";
import { DIALOG_SIZE_LARGE, Dialog, Toast } from "minreact-ui";
import { api } from "@/api";
import type { IconItem } from "@/types";
import { copyText, downloadBlob, downloadSvg } from "@/utils/download";
import { svgToPngBlob } from "@/utils/image";
import { applyIconSize, renderIconCode } from "@/utils/svg";
import { AppIcon } from "@/components/common/AppIcon";
import { SvgPreview } from "@/components/common/SvgPreview";

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
    const [tags, setTags] = useState("");
    const [svg, setSvg] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open || !icon) {
            return;
        }
        setClassName(icon.className);
        setTags(icon.tags.join(", "));
        setSvg(icon.svg);
    }, [open, icon]);

    const code = useMemo(() => renderIconCode(template, { className, svg }, size), [template, className, svg, size]);

    if (!icon) {
        return null;
    }

    const save = async () => {
        setSaving(true);
        try {
            const updated = await api.icons.updateIcon(icon.id, {
                className,
                tags: tags.split(/[,，\s]+/).filter(Boolean),
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
            title: "删除图标",
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
        });
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
        <Dialog open={open} setOpen={setOpen} width={DIALOG_SIZE_LARGE} clickMaskerToClose>
            <Dialog.Title>图标详情 · {icon.className}</Dialog.Title>
            <Dialog.Content>
                <div className="dialog-body">
                    <div className="detail-head">
                        <div className="detail-preview">
                            <SvgPreview svg={svg} size={64} />
                        </div>
                        <div className="detail-meta">
                            <div className="ui-form">
                                <div className="ui-field">
                                    <label>className</label>
                                    <input className="ui-input" value={className} disabled={!canEdit} onChange={(event) => setClassName(event.target.value)} />
                                </div>
                                <div className="ui-field">
                                    <label>标签（逗号分隔）</label>
                                    <input className="ui-input" value={tags} disabled={!canEdit} onChange={(event) => setTags(event.target.value)} />
                                </div>
                            </div>
                            <div className="detail-badges">
                                <span className="ui-chip">{icon.libraryId ? `公共库：${icon.libraryId}` : "本地图标"}</span>
                                <span className="ui-chip">尺寸：{size}px</span>
                                <span className="ui-chip">更新于 {new Date(icon.updatedAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>

                    <div className="detail-code">
                        <div className="toolbar">
                            <button className={`ui-btn small ${favorite ? "primary" : ""}`} type="button" onClick={onFavorite}>
                                <AppIcon name="star" />
                                {favorite ? "已收藏" : "收藏"}
                            </button>
                            <button className={`ui-btn small ${inCart ? "primary" : ""}`} type="button" onClick={onCart}>
                                <AppIcon name="cart" />
                                {inCart ? "已在采集车" : "采集"}
                            </button>
                            <div className="spacer" />
                            <span className="ui-section-title">使用代码（项目模板）</span>
                            <div className="spacer" />
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
                        <pre className="code-block">{code}</pre>
                        <p className="ui-note">
                            iconfont 用法：<code>&lt;i class="iconfont icon-{className}"&gt;&lt;/i&gt;</code>，字体文件可在项目「导出 → iconfont 包」中生成后上传
                            iconfont.cn。
                        </p>
                    </div>

                    <div className="ui-field">
                        <label>SVG 源码</label>
                        <textarea
                            className="ui-textarea"
                            style={{ minHeight: "9rem" }}
                            value={svg}
                            disabled={!canEdit}
                            onChange={(event) => setSvg(event.target.value)}
                        />
                    </div>
                </div>
            </Dialog.Content>
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
