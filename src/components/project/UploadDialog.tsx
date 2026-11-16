import { useRef, useState } from "react";
import { Checkbox, DIALOG_SIZE_LARGE, Dialog, InlineTextEditor, Select, Toast } from "minreact-ui";
import { api } from "@/api";
import type { IconCandidate } from "@/types";
import { parseIconfontSource, parseSvgCollection } from "@/utils/iconfont";
import { imageFileToSvg } from "@/utils/image";
import { nameFromFileName, normalizeSvg } from "@/utils/svg";
import { useDisplayStore } from "@/store/displayStore";
import { useDialogForm } from "@/hooks/useDialogForm";
import { AppIcon } from "@/components/common/AppIcon";
import { FileDropZone } from "@/components/common/FileDropZone";
import { SvgPreview } from "@/components/common/SvgPreview";
import { TagEditor } from "@/components/common/TagEditor";

/** 上传区接受的文件：SVG、位图、iconfont 下载包里的 js / svg 文本 */
const ACCEPT = ".svg,image/svg+xml,image/png,image/jpeg,image/webp,image/gif,.js,.json,.txt,.css";

const TEXT_EXTENSIONS = ["js", "json", "txt", "css", "html", "htm"];
const ICONFONT_HINT = /<symbol|<glyph|<font[\s>]|@font-face/i;

/** 图标上传 / 导入对话框：统一入口，自动识别 SVG / 图片 / iconfont 文件 */
export const UploadDialog = ({
    open,
    setOpen,
    projectId,
    target = "project",
    onImported,
}: {
    open: boolean; // 是否打开
    setOpen: (open: boolean) => void; // 显隐控制
    projectId?: string; // 目标项目（target 为 project 时必填）
    target?: "project" | "library"; // 导入目标：项目图标 / 公共图标库
    onImported: () => void; // 导入完成回调
}) => {
    const [candidates, setCandidates] = useState<IconCandidate[]>([]);
    const [iconfontText, setIconfontText] = useState("");
    const [prefix, setPrefix] = useState("");
    const [busy, setBusy] = useState(false);
    const [saving, setSaving] = useState(false);
    const handledFiles = useRef(new WeakSet<File>());
    const display = useDisplayStore((state) => state.display);
    const previewSize = display.size + display.padding * 2;

    const reset = () => {
        setCandidates([]);
        setIconfontText("");
        setPrefix("");
        setBusy(false);
        setSaving(false);
    };

    const mergeCandidates = (items: IconCandidate[]) => {
        setCandidates((prev) => {
            const keys = new Set(prev.map((item) => item.key));
            return [...prev, ...items.filter((item) => !keys.has(item.key))];
        });
    };

    const pickFiles = (file: File | File[]) => {
        const list = Array.isArray(file) ? file : [file];
        list.filter((item) => item instanceof File).forEach((item) => {
            if (handledFiles.current.has(item)) {
                return;
            }
            handledFiles.current.add(item);
            void handleFile(item);
        });
    };

    /** 文本内容解析：先按 iconfont（symbol / SVG 字体），再退回纯 SVG 集合 */
    const parseText = (text: string): IconCandidate[] => {
        try {
            const iconfontItems = parseIconfontSource(text);
            if (iconfontItems.length > 0) {
                return iconfontItems;
            }
        } catch {
            // 不是 iconfont 格式，继续尝试 SVG 集合
        }
        try {
            return parseSvgCollection(text);
        } catch {
            return [];
        }
    };

    /** 按扩展名 / MIME / 内容自动选择解析方式 */
    const handleFile = async (file: File) => {
        const ext = file.name.split(".").pop()?.toLowerCase() || "";
        setBusy(true);
        try {
            if (file.type.startsWith("image/") && ext !== "svg") {
                const svg = await imageFileToSvg(file);
                mergeCandidates([
                    { key: `image-${file.name}-${file.lastModified}`, className: nameFromFileName(file.name), svg, tags: [], checked: false },
                ]);
                return;
            }

            if (!file.type.startsWith("image/") && !TEXT_EXTENSIONS.includes(ext)) {
                Toast.showError(`${file.name}：不支持的文件类型`);
                return;
            }

            const text = await file.text();
            if (ext === "svg" && !ICONFONT_HINT.test(text)) {
                mergeCandidates([
                    {
                        key: `svg-${file.name}-${file.lastModified}`,
                        className: nameFromFileName(file.name),
                        svg: normalizeSvg(text),
                        tags: [],
                        checked: false,
                    },
                ]);
                return;
            }

            const items = parseText(text);
            if (items.length === 0) {
                Toast.showWarning(`${file.name}：没有解析到图标`);
                return;
            }
            mergeCandidates(items);
        } catch (error) {
            Toast.showError(`${file.name}：${error instanceof Error ? error.message : "解析失败"}`);
        } finally {
            setBusy(false);
        }
    };

    const parseClipboardText = () => {
        if (!iconfontText.trim()) {
            Toast.showWarning("请先粘贴 iconfont 的 symbol 内容或 SVG 字体内容");
            return;
        }
        const items = parseText(iconfontText);
        if (items.length === 0) {
            Toast.showWarning("没有解析到图标");
            return;
        }
        mergeCandidates(items);
        setIconfontText("");
        Toast.showSuccess(`解析到 ${items.length} 个图标`);
    };

    const toggleCandidate = (key: string, checked: boolean) => {
        setCandidates((prev) => prev.map((item) => (item.key === key ? { ...item, checked } : item)));
    };

    const updateCandidate = (key: string, patch: Partial<IconCandidate>) => {
        setCandidates((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));
    };

    const checkedCount = candidates.filter((item) => item.checked).length;

    const { formProps, submitProps } = useDialogForm(parseClipboardText);

    const submit = async () => {
        const selected = candidates.filter((item) => item.checked);
        if (selected.length === 0) {
            Toast.showWarning("请先勾选要导入的图标");
            return;
        }
        setSaving(true);
        try {
            const inputs = selected.map((item) => ({
                className: `${prefix}${item.className}`,
                svg: item.svg,
                tags: item.tags,
                libraryId: item.libraryId,
            }));
            if (target === "library") {
                await api.library.createLibraryIcons(inputs);
            } else {
                await api.icons.createIcons(String(projectId), inputs);
            }
            Toast.showSuccess(`已导入 ${selected.length} 个图标`);
            reset();
            setOpen(false);
            onImported();
        } catch (error) {
            Toast.showError(error instanceof Error ? error.message : "导入失败");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} setOpen={setOpen} width={DIALOG_SIZE_LARGE} clickMaskerToClose>
            <Dialog.Title>{target === "library" ? "上传到公共图标库" : "上传 / 导入图标"}</Dialog.Title>
            <Dialog.Content>
                <div className="dialog-body">
                    <FileDropZone
                        multiple
                        accept={ACCEPT}
                        onChange={pickFiles}
                        icon={<AppIcon name="upload" />}
                        title="选择或拖入文件"
                        description="自动识别 SVG、PNG / JPG / WebP 图片、iconfont 下载包（iconfont.js / iconfont.svg）"
                    />

                    <form {...formProps}>
                        <div className="upload-paste">
                            <label className="upload-paste__label">粘贴 iconfont 内容</label>
                            <input
                                className="ui-input"
                                placeholder="粘贴 iconfont 的 symbol 内容或 SVG 字体代码"
                                value={iconfontText}
                                onChange={(event) => setIconfontText(event.target.value)}
                            />
                            <button className="ui-btn small" {...submitProps}>
                                <AppIcon name="refresh" />
                                解析
                            </button>
                        </div>
                    </form>

                    {busy && <div className="ui-loading">正在解析文件...</div>}

                    {candidates.length > 0 && (
                        <div className="upload-candidates">
                            <div className="toolbar">
                                <span className="ui-section-title">
                                    待导入 {checkedCount} / {candidates.length}
                                </span>
                                <div className="spacer" />
                                <input
                                    className="ui-input"
                                    style={{ width: "9rem" }}
                                    placeholder="批量前缀（可选）"
                                    value={prefix}
                                    onChange={(event) => setPrefix(event.target.value.replace(/\s+/g, "-"))}
                                />
                                <Select
                                    items={[
                                        { value: "all", label: "全选", icon: <AppIcon name="check" /> },
                                        { value: "invert", label: "反选", icon: <AppIcon name="refresh" /> },
                                        { value: "none", label: "全不选", icon: <AppIcon name="close" /> },
                                    ]}
                                    triggerClassName="ui-btn small button-tonal"
                                    placeholder="全选"
                                    onChange={(value) => {
                                        if (value === "all") {
                                            setCandidates((prev) => prev.map((item) => ({ ...item, checked: true })));
                                        } else if (value === "none") {
                                            setCandidates((prev) => prev.map((item) => ({ ...item, checked: false })));
                                        } else {
                                            setCandidates((prev) => prev.map((item) => ({ ...item, checked: !item.checked })));
                                        }
                                    }}
                                />
                                <button className="ui-btn small" type="button" onClick={() => setCandidates([])}>
                                    清空
                                </button>
                            </div>
                            <ul className="icon-grid">
                                {candidates.map((item) => (
                                    <li key={item.key}>
                                        <div className={`icon-card ${item.checked ? "selected" : ""}`}>
                                            <span className="icon-card__check">
                                                <Checkbox
                                                    checked={Boolean(item.checked)}
                                                    onChange={(checked) => toggleCandidate(item.key, checked)}
                                                    aria-label={`选择 ${item.className}`}
                                                />
                                            </span>
                                            <div
                                                className="icon-card__preview"
                                                style={{
                                                    width: previewSize,
                                                    height: previewSize,
                                                    padding: display.padding,
                                                    background: display.background || undefined,
                                                    color: display.color || undefined,
                                                }}
                                            >
                                                <SvgPreview svg={item.svg} size={display.size} />
                                            </div>
                                            <div className="icon-card__meta">
                                                <span className="candidate-meta__name">
                                                    <InlineTextEditor
                                                        value={item.className}
                                                        required
                                                        saveHandler={async (value) => {
                                                            const name = value.trim();
                                                            if (name) {
                                                                updateCandidate(item.key, { className: name });
                                                            }
                                                        }}
                                                    />
                                                </span>
                                                <TagEditor
                                                    bare
                                                    value={item.tags || []}
                                                    onChange={(tags) => updateCandidate(item.key, { tags })}
                                                />
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </Dialog.Content>
            <Dialog.Action align="right">
                <button
                    className="ui-btn"
                    type="button"
                    onClick={() => {
                        reset();
                        setOpen(false);
                    }}
                >
                    取消
                </button>
                <button className="ui-btn primary" type="button" disabled={saving || checkedCount === 0} onClick={() => void submit()}>
                    {saving ? "导入中..." : `导入 ${checkedCount} 个图标`}
                </button>
            </Dialog.Action>
        </Dialog>
    );
};
