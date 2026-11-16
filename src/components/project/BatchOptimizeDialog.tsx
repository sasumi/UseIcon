import { useEffect, useId, useState } from "react";
import type { ReactNode } from "react";
import { DIALOG_SIZE_NORMAL, Dialog, RangeInput, Toast } from "minreact-ui";
import { api } from "@/api";
import { useDialogForm } from "@/hooks/useDialogForm";
import type { IconOptimizeOptions, IconPatch } from "@/types";
import { AppIcon } from "@/components/common/AppIcon";

const SIZE_MIN = 12;
const SIZE_MAX = 96;
const STROKE_MIN = 0.5;
const STROKE_MAX = 8;
const PRECISION_MIN = 0;
const PRECISION_MAX = 4;

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

/** 左右布局的表单行：左侧标签，右侧开关 / 滑块与说明 */
const OptionRow = ({
    label,
    tip,
    param,
    toggle,
}: {
    label: string; // 行标签
    tip?: string; // 行内补充说明
    param?: ReactNode; // 滑块等参数控件
    toggle?: { id: string; checked: boolean; onChange: (checked: boolean) => void }; // 启用开关
}) => (
    <div className="ui-form-item">
        <label className="ui-form-item__label" htmlFor={toggle?.id}>
            {label}
        </label>
        <div className="ui-form-item__content">
            {toggle ? (
                <input
                    id={toggle.id}
                    type="checkbox"
                    checked={toggle.checked}
                    onChange={(event) => toggle.onChange(event.target.checked)}
                />
            ) : (
                <span className="ui-form-item__toggle-gap" aria-hidden="true" />
            )}
            {param}
            {tip ? <span className="ui-form-item__tip">{tip}</span> : null}
        </div>
    </div>
);

/** 批量优化图标（项目图标与公共库图标共用） */
export const BatchOptimizeDialog = ({
    open,
    setOpen,
    iconIds,
    defaultSize,
    onDone,
    optimize = api.icons.optimizeIcons,
}: {
    open: boolean; // 是否打开
    setOpen: (open: boolean) => void; // 显隐控制
    iconIds: string[]; // 待优化图标
    defaultSize: number; // 默认尺寸
    onDone: (icons: IconPatch[]) => void; // 完成回调
    optimize?: (iconIds: string[], options: IconOptimizeOptions) => Promise<IconPatch[]>; // 优化实现，默认走项目图标接口
}) => {
    const [sizeEnabled, setSizeEnabled] = useState(true);
    const [size, setSize] = useState(() => clamp(defaultSize, SIZE_MIN, SIZE_MAX));
    const [useCurrentColor, setUseCurrentColor] = useState(true);
    const [strokeEnabled, setStrokeEnabled] = useState(false);
    const [strokeWidth, setStrokeWidth] = useState(2);
    const [precision, setPrecision] = useState(2);
    const [removeFill, setRemoveFill] = useState(false);
    const [saving, setSaving] = useState(false);

    const sizeToggleId = useId();
    const colorToggleId = useId();
    const strokeToggleId = useId();
    const fillToggleId = useId();

    useEffect(() => {
        if (open) {
            setSize(clamp(defaultSize, SIZE_MIN, SIZE_MAX));
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
            const icons = await optimize(iconIds, {
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

    const { formProps, submitProps } = useDialogForm(() => void submit());

    return (
        <Dialog open={open} setOpen={setOpen} width={DIALOG_SIZE_NORMAL} clickMaskerToClose>
            <Dialog.Title>批量优化（{iconIds.length} 个图标）</Dialog.Title>
            <Dialog.Content>
                <form {...formProps}>
                    <div className="dialog-body optimize-dialog">
                        <div className="ui-form-landscape">
                            <div className="ui-form-group">
                                <div className="ui-form-group__title">尺寸与精度</div>
                                <div className="ui-form-group__content">
                                    <OptionRow
                                        label="画布尺寸"
                                        tip="缩放并居中到正方形画布"
                                        toggle={{ id: sizeToggleId, checked: sizeEnabled, onChange: setSizeEnabled }}
                                        param={
                                            <RangeInput
                                                value={size}
                                                min={SIZE_MIN}
                                                max={SIZE_MAX}
                                                step={4}
                                                unit="px"
                                                disabled={!sizeEnabled}
                                                onInput={setSize}
                                            />
                                        }
                                    />
                                    <OptionRow
                                        label="数字精度"
                                        tip="坐标保留的小数位"
                                        param={
                                            <RangeInput
                                                value={precision}
                                                min={PRECISION_MIN}
                                                max={PRECISION_MAX}
                                                step={1}
                                                unit="位"
                                                onInput={setPrecision}
                                            />
                                        }
                                    />
                                </div>
                            </div>
                            <div className="ui-form-group">
                                <div className="ui-form-group__title">颜色与线条</div>
                                <div className="ui-form-group__content">
                                    <OptionRow
                                        label="颜色"
                                        tip="统一为 currentColor"
                                        toggle={{ id: colorToggleId, checked: useCurrentColor, onChange: setUseCurrentColor }}
                                    />
                                    <OptionRow
                                        label="线条粗细"
                                        tip="写入根节点 stroke-width"
                                        toggle={{ id: strokeToggleId, checked: strokeEnabled, onChange: setStrokeEnabled }}
                                        param={
                                            <RangeInput
                                                value={strokeWidth}
                                                min={STROKE_MIN}
                                                max={STROKE_MAX}
                                                step={0.25}
                                                precision={2}
                                                disabled={!strokeEnabled}
                                                onInput={setStrokeWidth}
                                            />
                                        }
                                    />
                                    <OptionRow
                                        label="移除填充"
                                        tip="适合纯线性图标"
                                        toggle={{ id: fillToggleId, checked: removeFill, onChange: setRemoveFill }}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="ui-alert">
                            <AppIcon name="warning" /> 将直接修改所选图标源码，建议先导出备份。
                        </div>
                    </div>
                </form>
            </Dialog.Content>
            <Dialog.Action align="right">
                <button className="ui-btn" type="button" onClick={() => setOpen(false)}>
                    取消
                </button>
                <button className="ui-btn primary" {...submitProps} disabled={saving}>
                    {saving ? "优化中..." : "开始优化"}
                </button>
            </Dialog.Action>
        </Dialog>
    );
};
