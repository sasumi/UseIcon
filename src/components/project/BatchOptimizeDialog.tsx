import { useEffect, useState } from "react";
import { DIALOG_SIZE_NORMAL, Dialog, Toast } from "minreact-ui";
import { api } from "@/api";
import type { IconItem } from "@/types";
import { AppIcon } from "@/components/common/AppIcon";

/** 批量优化图标 */
export const BatchOptimizeDialog = ({
    open,
    setOpen,
    iconIds,
    defaultSize,
    onDone,
}: {
    open: boolean; // 是否打开
    setOpen: (open: boolean) => void; // 显隐控制
    iconIds: string[]; // 待优化图标
    defaultSize: number; // 项目默认尺寸
    onDone: (icons: IconItem[]) => void; // 完成回调
}) => {
    const [sizeEnabled, setSizeEnabled] = useState(true);
    const [size, setSize] = useState(defaultSize);
    const [useCurrentColor, setUseCurrentColor] = useState(true);
    const [strokeEnabled, setStrokeEnabled] = useState(false);
    const [strokeWidth, setStrokeWidth] = useState(2);
    const [precision, setPrecision] = useState(2);
    const [removeFill, setRemoveFill] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open) {
            setSize(defaultSize);
            setSizeEnabled(true);
            setUseCurrentColor(true);
            setStrokeEnabled(false);
            setStrokeWidth(2);
            setPrecision(2);
            setRemoveFill(false);
        }
    }, [open, defaultSize]);

    const submit = async () => {
        setSaving(true);
        try {
            const icons = await api.icons.optimizeIcons(iconIds, {
                size: sizeEnabled ? size : null,
                useCurrentColor,
                strokeWidth: strokeEnabled ? strokeWidth : null,
                precision,
                removeFill,
            });
            Toast.showSuccess(`已优化 ${icons.length} 个图标`);
            onDone(icons);
            setOpen(false);
        } catch (error) {
            Toast.showError(error instanceof Error ? error.message : "优化失败");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} setOpen={setOpen} width={DIALOG_SIZE_NORMAL} clickMaskerToClose>
            <Dialog.Title>批量优化（{iconIds.length} 个图标）</Dialog.Title>
            <Dialog.Content>
                <div className="dialog-body">
                    <div className="ui-form">
                        <label className="ui-switch-row">
                            <span>
                                统一画布尺寸
                                <span className="ui-field-tip">按比例缩放内容并居中到正方形画布</span>
                            </span>
                            <input type="checkbox" checked={sizeEnabled} onChange={(event) => setSizeEnabled(event.target.checked)} />
                        </label>
                        <input
                            className="ui-input"
                            type="number"
                            min={12}
                            max={256}
                            disabled={!sizeEnabled}
                            value={size}
                            onChange={(event) => setSize(Number(event.target.value) || defaultSize)}
                        />
                        <div className="ui-divider" />
                        <label className="ui-switch-row">
                            <span>
                                颜色统一为 currentColor
                                <span className="ui-field-tip">固定颜色改为 currentColor，跟随文字颜色</span>
                            </span>
                            <input type="checkbox" checked={useCurrentColor} onChange={(event) => setUseCurrentColor(event.target.checked)} />
                        </label>
                        <label className="ui-switch-row">
                            <span>
                                统一线条粗细
                                <span className="ui-field-tip">写入根节点 stroke-width，移除子节点上的值</span>
                            </span>
                            <input type="checkbox" checked={strokeEnabled} onChange={(event) => setStrokeEnabled(event.target.checked)} />
                        </label>
                        <input
                            className="ui-input"
                            type="number"
                            min={0.5}
                            max={8}
                            step={0.25}
                            disabled={!strokeEnabled}
                            value={strokeWidth}
                            onChange={(event) => setStrokeWidth(Number(event.target.value) || 2)}
                        />
                        <div className="ui-divider" />
                        <div className="ui-field">
                            <label>SVG 数字精度（小数位）</label>
                            <input
                                className="ui-input"
                                type="number"
                                min={0}
                                max={4}
                                value={precision}
                                onChange={(event) => setPrecision(Math.max(0, Math.min(4, Number(event.target.value) || 0)))}
                            />
                        </div>
                        <label className="ui-switch-row">
                            <span>
                                移除填充（fill="none"）
                                <span className="ui-field-tip">适合纯线性图标</span>
                            </span>
                            <input type="checkbox" checked={removeFill} onChange={(event) => setRemoveFill(event.target.checked)} />
                        </label>
                    </div>
                    <div className="ui-alert">
                        <AppIcon name="warning" /> 优化会直接修改所选图标的 SVG 源码，建议先导出备份。
                    </div>
                </div>
            </Dialog.Content>
            <Dialog.Action align="right">
                <button className="ui-btn" type="button" onClick={() => setOpen(false)}>
                    取消
                </button>
                <button className="ui-btn primary" type="button" disabled={saving} onClick={() => void submit()}>
                    {saving ? "优化中..." : "开始优化"}
                </button>
            </Dialog.Action>
        </Dialog>
    );
};
