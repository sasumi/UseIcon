import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { DIALOG_SIZE_LARGE, Dialog, RangeInput, Select, Toast } from "minreact-ui";
import { api } from "@/api";
import { useDialogForm } from "@/hooks/useDialogForm";
import type { IconOptimizeOptions, IconPatch, IconRenameOptions, OptimizeIconSource } from "@/types";
import { mergeCategories, rememberCategory } from "@/utils/category";
import { centerSvgOptically } from "@/utils/opticalCenter";
import { optimizeSvg, readSvgCanvasSize } from "@/utils/svg";
import { CategoryInput } from "@/components/common/CategoryInput";
import { SelectAllToggle } from "@/components/common/SelectAllToggle";
import { SvgPreview } from "@/components/common/SvgPreview";

const SIZE_MIN = 12;
const SIZE_MAX = 96;
const STROKE_MIN = 0.5;
const STROKE_MAX = 8;
const PRECISION_MIN = 0;
const PRECISION_MAX = 4;

/** 预览画布按实际尺寸（1 单位 = 1px）显示时的上下限 */
const PREVIEW_CANVAS_MIN = 8;
const PREVIEW_CANVAS_MAX = 128;

/** 预览放大倍数 */
const ZOOM_LEVELS = [1, 2, 4, 8, 10];

/** 单元格里类名 / 标签预留的宽度（px） */
const PREVIEW_META_WIDTH = 120;

/** 行内「更改」勾选列宽度（px） */
const PREVIEW_CHECK_WIDTH = 34;

/** 每次生成预览的图标数量：分片处理，避免大列表阻塞界面 */
const PREVIEW_CHUNK = 8;

/** 单图标的本地预览结果 */
interface PreviewItem {
    svg: string; // 优化后的 SVG（失败时为原始 SVG）
    error: boolean; // 是否优化失败
}

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

/** 左右布局的表单行：左侧勾选框 + 标签，右侧参数控件 */
const OptionRow = ({
    label,
    param,
    toggle,
}: {
    label: string; // 行标签
    param?: ReactNode; // 滑块等参数控件
    toggle?: { id: string; checked: boolean; onChange: (checked: boolean) => void }; // 启用开关
}) => (
    <div className="ui-form-item">
        <div className="ui-form-item__label">
            {toggle ? (
                <label className="ui-form-item__check" htmlFor={toggle.id}>
                    <input
                        id={toggle.id}
                        type="checkbox"
                        checked={toggle.checked}
                        onChange={(event) => toggle.onChange(event.target.checked)}
                    />
                    <span>{label}</span>
                </label>
            ) : (
                <span>{label}</span>
            )}
        </div>
        <div className="ui-form-item__content">{param}</div>
    </div>
);

/** 单侧图标信息：棋盘格预览 + 类名 + 标签（按 SVG 画布实际尺寸显示） */
const PreviewCell = ({
    icon,
    svg,
    status,
    canvas,
    excluded,
    name,
    category,
    categoryChanged,
}: {
    icon: OptimizeIconSource; // 图标信息
    svg?: string; // 待展示的 SVG，缺省表示尚未生成
    status?: "pending" | "error"; // 预览状态
    canvas: number; // SVG 画布显示边长（px）
    excluded?: boolean; // 该图标本次不应用更改
    name?: string; // 更改后的类名，缺省显示原类名
    category?: string; // 更改后的分类，缺省显示原分类
    categoryChanged?: boolean; // 分类是否有变化
}) => (
    <div className={`optimize-preview__cell${status ? ` is-${status}` : ""}${excluded ? " is-excluded" : ""}`}>
        <span className="optimize-preview__thumb" style={{ width: canvas, height: canvas }}>
            {svg ? <SvgPreview svg={svg} size={canvas} /> : null}
        </span>
        <div className="optimize-preview__meta">
            <span
                className={`optimize-preview__name${name && name !== icon.className ? " is-renamed" : ""}`}
                title={name ?? icon.className}
            >
                {name ?? icon.className}
            </span>
            {category || categoryChanged ? (
                <span
                    className={`optimize-preview__category${categoryChanged ? " is-changed" : ""}`}
                    title={category ? `分类：${category}` : "清空分类"}
                >
                    {category || "清空分类"}
                </span>
            ) : null}
            <span className="optimize-preview__tags" title={icon.tags.join(" / ")}>
                {status === "pending" ? "生成中…" : status === "error" ? "优化失败" : icon.tags.join(" / ") || "-"}
            </span>
        </div>
    </div>
);

/** 批量修改图标（项目图标与公共库图标共用）：左侧调整优化 / 重命名 / 分类参数，右侧对比修改前后 */
export const BatchOptimizeDialog = ({
    open,
    setOpen,
    icons,
    defaultSize,
    categories,
    onDone,
    optimize = api.icons.optimizeIcons,
    rename = api.icons.renameIcons,
    updateCategory = api.icons.updateIconsCategory,
}: {
    open: boolean; // 是否打开
    setOpen: (open: boolean) => void; // 显隐控制
    icons: OptimizeIconSource[]; // 待优化图标（含原始 SVG，用于本地预览）
    defaultSize: number; // 默认尺寸
    categories?: string[]; // 可选分类（已有分类）
    onDone: (icons: IconPatch[]) => void; // 应用后的完成回调
    optimize?: (iconIds: string[], options: IconOptimizeOptions) => Promise<IconPatch[]>; // 保存实现，默认走项目图标接口
    rename?: (iconIds: string[], options: IconRenameOptions) => Promise<IconPatch[]>; // 重命名实现，默认走项目图标接口
    updateCategory?: (iconIds: string[], category: string) => Promise<IconPatch[]>; // 分类修改实现，默认走项目图标接口
}) => {
    const [sizeEnabled, setSizeEnabled] = useState(true);
    const [size, setSize] = useState(() => clamp(defaultSize, SIZE_MIN, SIZE_MAX));
    const [useCurrentColor, setUseCurrentColor] = useState(true);
    const [strokeEnabled, setStrokeEnabled] = useState(false);
    const [strokeWidth, setStrokeWidth] = useState(2);
    const [precisionEnabled, setPrecisionEnabled] = useState(true);
    const [precision, setPrecision] = useState(2);
    const [removeFill, setRemoveFill] = useState(false);
    const [opticalCenter, setOpticalCenter] = useState(false);
    const [renameEnabled, setRenameEnabled] = useState(false);
    const [renamePrefix, setRenamePrefix] = useState("");
    const [renameSuffix, setRenameSuffix] = useState("");
    const [renameFind, setRenameFind] = useState("");
    const [renameReplace, setRenameReplace] = useState("");
    const [categoryEnabled, setCategoryEnabled] = useState(false);
    const [category, setCategory] = useState("");
    const [zoom, setZoom] = useState(2);
    const [excluded, setExcluded] = useState<Set<string>>(() => new Set());
    const [saving, setSaving] = useState(false);

    const sizeToggleId = useId();
    const precisionToggleId = useId();
    const colorToggleId = useId();
    const strokeToggleId = useId();
    const fillToggleId = useId();
    const centerToggleId = useId();
    const renameToggleId = useId();
    const categoryToggleId = useId();

    // 所选图标分类一致时预填，方便在原有分类上微调
    const initialCategory = useMemo(() => {
        const first = icons[0]?.category ?? "";
        return icons.every((icon) => (icon.category ?? "") === first) ? first : "";
    }, [icons]);

    const categoryOptions = useMemo(
        () => mergeCategories(categories, icons.flatMap((icon) => (icon.category ? [icon.category] : []))),
        [categories, icons],
    );

    useEffect(() => {
        if (open) {
            setSize(clamp(defaultSize, SIZE_MIN, SIZE_MAX));
            setSizeEnabled(true);
            setUseCurrentColor(true);
            setStrokeEnabled(false);
            setStrokeWidth(2);
            setPrecisionEnabled(true);
            setPrecision(2);
            setRemoveFill(false);
            setOpticalCenter(false);
            setRenameEnabled(false);
            setRenamePrefix("");
            setRenameSuffix("");
            setRenameFind("");
            setRenameReplace("");
            setCategoryEnabled(false);
            setCategory(initialCategory);
            setZoom(2);
            setExcluded(new Set());
        }
    }, [open, defaultSize]);

    const options = useMemo<IconOptimizeOptions>(
        () => ({
            size: sizeEnabled ? size : null,
            useCurrentColor,
            strokeWidth: strokeEnabled ? strokeWidth : null,
            precision: precisionEnabled ? precision : -1,
            removeFill,
            opticalCenter,
        }),
        [sizeEnabled, size, useCurrentColor, strokeEnabled, strokeWidth, precisionEnabled, precision, removeFill, opticalCenter],
    );

    /** 是否至少有一项优化调整要执行 */
    const hasOptimizeAction = sizeEnabled || useCurrentColor || strokeEnabled || precisionEnabled || removeFill || opticalCenter;

    const hasRenameRule = Boolean(renamePrefix || renameSuffix || renameFind);
    const renameApplied = renameEnabled && hasRenameRule;
    const categoryApplied = categoryEnabled;
    const categoryValue = category.trim();

    /** 按后台规则预览新类名：先查找替换，再套前缀 / 后缀 */
    const renamedName = (className: string): string => {
        const base = renameFind ? className.split(renameFind).join(renameReplace) : className;
        return `${renamePrefix}${base}${renameSuffix}`;
    };

    // 预览只在本地计算，不写入后台；图标多时分片生成，改动参数会中断上一轮任务
    const [previews, setPreviews] = useState<(PreviewItem | null)[]>([]);
    const [progress, setProgress] = useState({ done: 0, total: 0 });
    const previewRunRef = useRef(0);

    useEffect(() => {
        if (!open) {
            return;
        }
        const total = icons.length;
        const runId = previewRunRef.current + 1;
        previewRunRef.current = runId;
        if (total === 0) {
            setPreviews([]);
            setProgress({ done: 0, total: 0 });
            return;
        }
        const results: (PreviewItem | null)[] = new Array(total).fill(null);
        let cancelled = false;
        setPreviews(results.slice());
        setProgress({ done: 0, total });

        const run = async () => {
            for (let start = 0; start < total; start += PREVIEW_CHUNK) {
                const end = Math.min(start + PREVIEW_CHUNK, total);
                // 每片并行处理，光学居中需要光栅化，串行会比较慢
                await Promise.all(
                    Array.from({ length: end - start }, (_, offset) => {
                        const index = start + offset;
                        const icon = icons[index];
                        return (async () => {
                            try {
                                let svg = optimizeSvg(icon.svg, options);
                                if (options.opticalCenter) {
                                    // 光学居中在其它调整之后执行
                                    svg = await centerSvgOptically(svg);
                                }
                                results[index] = { svg, error: false };
                            } catch {
                                results[index] = { svg: icon.svg, error: true };
                            }
                        })();
                    }),
                );
                if (cancelled || runId !== previewRunRef.current) {
                    return;
                }
                setPreviews(results.slice());
                setProgress({ done: end, total });
                // 让出一帧，保证进度与取消能及时响应
                await new Promise((resolve) => window.setTimeout(resolve, 0));
                if (cancelled || runId !== previewRunRef.current) {
                    return;
                }
            }
        };
        void run();
        return () => {
            cancelled = true;
        };
    }, [open, icons, options]);

    const generating = progress.done < progress.total;
    const failedCount = useMemo(() => previews.filter((item) => item?.error).length, [previews]);

    const includedCount = useMemo(() => icons.filter((icon) => !excluded.has(icon.iconId)).length, [icons, excluded]);

    const toggleIncluded = (iconId: string, checked: boolean) => {
        setExcluded((prev) => {
            const next = new Set(prev);
            if (checked) {
                next.delete(iconId);
            } else {
                next.add(iconId);
            }
            return next;
        });
    };

    const toggleAllIncluded = (checked: boolean) => {
        setExcluded(checked ? new Set() : new Set(icons.map((icon) => icon.iconId)));
    };

    // 按图标实际画布尺寸预览：1 画布单位 = 1px，画布调整后尺寸变化一目了然
    const beforeCanvases = useMemo(() => icons.map((icon) => readSvgCanvasSize(icon.svg)), [icons]);
    const toPreviewCanvas = (units: number): number => Math.round(clamp(units, PREVIEW_CANVAS_MIN, PREVIEW_CANVAS_MAX));

    // 表头与列表共用同一内容宽度，放大后一起横向滚动，保证列对齐
    const gridMinWidth = useMemo(() => {
        let maxCanvas = 0;
        beforeCanvases.forEach((units) => {
            const before = toPreviewCanvas(units) * zoom;
            const after = toPreviewCanvas(sizeEnabled ? size : units) * zoom;
            maxCanvas = Math.max(maxCanvas, before, after);
        });
        return Math.round(maxCanvas * 2 + PREVIEW_META_WIDTH * 2 + PREVIEW_CHECK_WIDTH);
    }, [beforeCanvases, zoom, sizeEnabled, size]);

    const submit = async () => {
        const targets = icons.filter((icon) => !excluded.has(icon.iconId));
        if (targets.length === 0) {
            Toast.showError("请至少选择一个要更改的图标");
            return;
        }
        if (renameEnabled && !hasRenameRule) {
            Toast.showError("请至少填写前缀、后缀或查找内容");
            return;
        }
        if (!hasOptimizeAction && !renameApplied && !categoryApplied) {
            Toast.showError("请至少选择一项更改");
            return;
        }
        const iconIds = targets.map((icon) => icon.iconId);
        setSaving(true);
        try {
            const merged = new Map<string, IconPatch>();
            const collect = (patches: IconPatch[]) => {
                patches.forEach((patch) => merged.set(patch.iconId, { ...merged.get(patch.iconId), ...patch }));
            };
            if (hasOptimizeAction) {
                collect(await optimize(iconIds, options));
            }
            if (renameApplied) {
                collect(await rename(iconIds, { prefix: renamePrefix, suffix: renameSuffix, find: renameFind, replace: renameReplace }));
            }
            if (categoryApplied) {
                collect(await updateCategory(iconIds, category));
                rememberCategory(category);
            }
            const updated = Array.from(merged.values());
            Toast.showSuccess(`已更新 ${updated.length} 个图标`);
            onDone(updated);
            setOpen(false);
        } catch (error) {
            Toast.showError(error instanceof Error ? error.message : "应用失败");
        } finally {
            setSaving(false);
        }
    };

    const { formProps, submitProps } = useDialogForm(() => void submit());

    return (
        <Dialog open={open} setOpen={setOpen} width={DIALOG_SIZE_LARGE} clickMaskerToClose>
            <Dialog.Title>批量修改</Dialog.Title>
            <Dialog.Content>
                <form {...formProps}>
                    <div className="dialog-body optimize-dialog">
                        <aside className="optimize-dialog__side">
                            <div className="ui-form-landscape">
                                <div className="ui-form-group">
                                    <div className="ui-form-group__title">尺寸与精度</div>
                                    <div className="ui-form-group__content">
                                        <OptionRow
                                            label="画布尺寸"
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
                                            toggle={{ id: precisionToggleId, checked: precisionEnabled, onChange: setPrecisionEnabled }}
                                            param={
                                                <RangeInput
                                                    value={precision}
                                                    min={PRECISION_MIN}
                                                    max={PRECISION_MAX}
                                                    step={1}
                                                    unit="位"
                                                    disabled={!precisionEnabled}
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
                                            label="重置为 currentColor"
                                            toggle={{ id: colorToggleId, checked: useCurrentColor, onChange: setUseCurrentColor }}
                                        />
                                        <OptionRow
                                            label="线条粗细"
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
                                            toggle={{ id: fillToggleId, checked: removeFill, onChange: setRemoveFill }}
                                        />
                                    </div>
                                </div>
                                <div className="ui-form-group">
                                    <div className="ui-form-group__title">视觉校正</div>
                                    <div className="ui-form-group__content">
                                        <OptionRow
                                            label="自动优化视觉中心"
                                            toggle={{ id: centerToggleId, checked: opticalCenter, onChange: setOpticalCenter }}
                                        />
                                    </div>
                                </div>
                                <div className="ui-form-group">
                                    <div className="ui-form-group__title">重命名</div>
                                    <div className="optimize-field">
                                        <label className="optimize-field__toggle" htmlFor={renameToggleId}>
                                            <input
                                                id={renameToggleId}
                                                type="checkbox"
                                                checked={renameEnabled}
                                                onChange={(event) => setRenameEnabled(event.target.checked)}
                                            />
                                            <span>批量重命名类名</span>
                                        </label>
                                        {renameEnabled ? (
                                            <>
                                                <input
                                                    className="ui-input"
                                                    placeholder="添加前缀，例如 project-"
                                                    value={renamePrefix}
                                                    onChange={(event) => setRenamePrefix(event.target.value)}
                                                />
                                                <input
                                                    className="ui-input"
                                                    placeholder="添加后缀，例如 -outline"
                                                    value={renameSuffix}
                                                    onChange={(event) => setRenameSuffix(event.target.value)}
                                                />
                                                <div className="optimize-field__replace">
                                                    <input
                                                        className="ui-input"
                                                        placeholder="查找"
                                                        value={renameFind}
                                                        onChange={(event) => setRenameFind(event.target.value)}
                                                    />
                                                    <input
                                                        className="ui-input"
                                                        placeholder="替换为"
                                                        value={renameReplace}
                                                        onChange={(event) => setRenameReplace(event.target.value)}
                                                    />
                                                </div>
                                                <p className="ui-note">重名时自动追加序号，例如 icon-2。</p>
                                            </>
                                        ) : null}
                                    </div>
                                </div>
                                <div className="ui-form-group">
                                    <div className="ui-form-group__title">分类</div>
                                    <div className="optimize-field">
                                        <label className="optimize-field__toggle" htmlFor={categoryToggleId}>
                                            <input
                                                id={categoryToggleId}
                                                type="checkbox"
                                                checked={categoryEnabled}
                                                onChange={(event) => setCategoryEnabled(event.target.checked)}
                                            />
                                            <span>批量修改分类</span>
                                        </label>
                                        {categoryEnabled ? (
                                            <>
                                                <CategoryInput
                                                    value={category}
                                                    onChange={setCategory}
                                                    options={categoryOptions}
                                                    placeholder="输入或选择分类"
                                                />
                                                <p className="ui-note">留空则清空分类（公共库会归入默认分类）。</p>
                                            </>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        </aside>
                        <section className="optimize-preview">
                            <div className="optimize-preview__zoom">
                                <span className="optimize-preview__zoom-label">放大</span>
                                <Select
                                    items={ZOOM_LEVELS.map((level) => ({ value: String(level), label: `${level}x` }))}
                                    value={String(zoom)}
                                    onChange={(value) => setZoom(Number(value) || 1)}
                                    triggerClassName="ui-btn small"
                                    aria-label="放大倍数"
                                />
                            </div>
                            {generating ? (
                                <div className="optimize-preview__progress">
                                    <progress value={progress.done} max={progress.total || 1} />
                                    <span>
                                        正在生成预览 {progress.done}/{progress.total}
                                    </span>
                                </div>
                            ) : null}
                            <div className="optimize-preview__scroll">
                                <div className="optimize-preview__grid" style={{ minWidth: gridMinWidth }}>
                                    <div className="optimize-preview__head">
                                        <div className="optimize-preview__check-all">
                                            <SelectAllToggle
                                                selected={includedCount}
                                                total={icons.length}
                                                onChange={toggleAllIncluded}
                                                hideText
                                            />
                                        </div>
                                        <span>修改前</span>
                                        <span>
                                            修改后
                                            {failedCount > 0 ? (
                                                <em className="optimize-preview__failed">{failedCount} 个失败</em>
                                            ) : null}
                                        </span>
                                    </div>
                                    <ul className="optimize-preview__list">
                                        {icons.map((icon, index) => {
                                            const preview = previews[index];
                                            const isExcluded = excluded.has(icon.iconId);
                                            const beforeCanvas = toPreviewCanvas(beforeCanvases[index]) * zoom;
                                            const afterCanvas =
                                                toPreviewCanvas(sizeEnabled ? size : beforeCanvases[index]) * zoom;
                                            return (
                                                <li key={icon.iconId} className="optimize-preview__row">
                                                    <label className="optimize-preview__check" title="更改">
                                                        <input
                                                            type="checkbox"
                                                            checked={!isExcluded}
                                                            aria-label="更改"
                                                            onChange={(event) =>
                                                                toggleIncluded(icon.iconId, event.target.checked)
                                                            }
                                                        />
                                                    </label>
                                                    <PreviewCell icon={icon} svg={icon.svg} canvas={beforeCanvas} category={icon.category} />
                                                    <PreviewCell
                                                        icon={icon}
                                                        svg={preview?.svg}
                                                        status={preview ? (preview.error ? "error" : undefined) : "pending"}
                                                        canvas={afterCanvas}
                                                        excluded={isExcluded}
                                                        name={renameApplied && !isExcluded ? renamedName(icon.className) : undefined}
                                                        category={categoryApplied && !isExcluded ? categoryValue : icon.category}
                                                        categoryChanged={
                                                            categoryApplied && !isExcluded && categoryValue !== (icon.category ?? "")
                                                        }
                                                    />
                                                </li>
                                            );
                                        })}
                                        {icons.length === 0 ? (
                                            <li className="optimize-preview__empty">没有可优化的图标</li>
                                        ) : null}
                                    </ul>
                                </div>
                            </div>
                        </section>
                    </div>
                </form>
            </Dialog.Content>
            <Dialog.Action align="right">
                <button className="ui-btn" type="button" onClick={() => setOpen(false)}>
                    取消
                </button>
                <button className="ui-btn primary" {...submitProps} disabled={saving || includedCount === 0}>
                    {saving ? "应用中..." : `应用(${includedCount}/${icons.length})`}
                </button>
            </Dialog.Action>
        </Dialog>
    );
};
