import { useRef, useState } from "react";
import { DIALOG_SIZE_LARGE, Dialog, Tabs, Toast } from "minreact-ui";
import type { TabItem } from "minreact-ui";
import { api } from "@/api";
import type { IconCandidate } from "@/types";
import { parseIconfontSource } from "@/utils/iconfont";
import { imageFileToSvg } from "@/utils/image";
import { nameFromFileName, normalizeSvg } from "@/utils/svg";
import { AppIcon } from "@/components/common/AppIcon";
import { FileDropZone } from "@/components/common/FileDropZone";
import { SvgPreview } from "@/components/common/SvgPreview";

type UploadTab = "svg" | "image" | "iconfont";

/** 图标上传 / 导入对话框 */
export const UploadDialog = ({
    open,
    setOpen,
    projectId,
    onImported,
}: {
    open: boolean; // 是否打开
    setOpen: (open: boolean) => void; // 显隐控制
    projectId: string; // 目标项目
    onImported: () => void; // 导入完成回调
}) => {
    const [tab, setTab] = useState<UploadTab>("svg");
    const [candidates, setCandidates] = useState<IconCandidate[]>([]);
    const [iconfontText, setIconfontText] = useState("");
    const [prefix, setPrefix] = useState("");
    const [busy, setBusy] = useState(false);
    const [saving, setSaving] = useState(false);
    const handledFiles = useRef(new WeakSet<File>());

    const reset = () => {
        setCandidates([]);
        setIconfontText("");
        setPrefix("");
        setBusy(false);
        setSaving(false);
        setTab("svg");
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

    const handleFile = async (file: File) => {
        setBusy(true);
        try {
            const className = nameFromFileName(file.name);
            if (tab === "svg") {
                const text = await file.text();
                mergeCandidates([{ key: `svg-${file.name}-${file.lastModified}`, className, svg: normalizeSvg(text), tags: [], checked: true }]);
            } else if (tab === "image") {
                const svg = await imageFileToSvg(file);
                mergeCandidates([{ key: `image-${file.name}-${file.lastModified}`, className, svg, tags: [], checked: true }]);
            } else {
                const text = await file.text();
                mergeCandidates(parseIconfontSource(text));
            }
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
        try {
            const items = parseIconfontSource(iconfontText);
            if (items.length === 0) {
                Toast.showWarning("没有解析到图标");
                return;
            }
            mergeCandidates(items);
            setIconfontText("");
            Toast.showSuccess(`解析到 ${items.length} 个图标`);
        } catch (error) {
            Toast.showError(error instanceof Error ? error.message : "解析失败");
        }
    };

    const toggleCandidate = (key: string, checked: boolean) => {
        setCandidates((prev) => prev.map((item) => (item.key === key ? { ...item, checked } : item)));
    };

    const updateCandidate = (key: string, patch: Partial<IconCandidate>) => {
        setCandidates((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));
    };

    const checkedCount = candidates.filter((item) => item.checked).length;

    const submit = async () => {
        const selected = candidates.filter((item) => item.checked);
        if (selected.length === 0) {
            Toast.showWarning("请先勾选要导入的图标");
            return;
        }
        setSaving(true);
        try {
            await api.icons.createIcons(
                projectId,
                selected.map((item) => ({
                    className: `${prefix}${item.className}`,
                    svg: item.svg,
                    tags: item.tags,
                    libraryId: item.libraryId,
                })),
            );
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

    const tabs: TabItem[] = [
        {
            trigger: "SVG 文件",
            content: (
                <div className="upload-tab">
                    <FileDropZone
                        multiple
                        accept=".svg,image/svg+xml"
                        onChange={pickFiles}
                        icon={<AppIcon name="upload" />}
                        title="选择或拖入 SVG 文件"
                        description="支持一次选择多个 .svg 文件，导入后自动标准化"
                    />
                </div>
            ),
        },
        {
            trigger: "图片转 SVG",
            content: (
                <div className="upload-tab">
                    <FileDropZone
                        multiple
                        accept="image/png,image/jpeg,image/webp"
                        onChange={pickFiles}
                        icon={<AppIcon name="image" />}
                        title="选择或拖入图片"
                        description="PNG / JPG / WebP 会按最大 512px 压缩后内嵌到 SVG 中"
                    />
                    <p className="ui-note">位图图标无法矢量放大；需要无损缩放时请上传原始 SVG。</p>
                </div>
            ),
        },
        {
            trigger: "iconfont 导入",
            content: (
                <div className="upload-tab">
                    <FileDropZone
                        accept=".js,.svg,text/javascript,image/svg+xml"
                        onChange={pickFiles}
                        icon={<AppIcon name="code" />}
                        title="选择 iconfont.js 或 iconfont.svg"
                        description="iconfont 下载包中的 Symbol（iconfont.js）或 SVG 字体（iconfont.svg）"
                    />
                    <div className="ui-field">
                        <label>或粘贴 iconfont 内容</label>
                        <textarea
                            className="ui-textarea"
                            placeholder="<svg><symbol id=&quot;icon-xxx&quot; ...></symbol></svg>"
                            value={iconfontText}
                            onChange={(event) => setIconfontText(event.target.value)}
                        />
                    </div>
                    <div className="toolbar">
                        <button className="ui-btn" type="button" onClick={parseClipboardText}>
                            <AppIcon name="refresh" />
                            解析粘贴内容
                        </button>
                    </div>
                </div>
            ),
        },
    ];

    return (
        <Dialog open={open} setOpen={setOpen} width={DIALOG_SIZE_LARGE} clickMaskerToClose>
            <Dialog.Title>上传 / 导入图标</Dialog.Title>
            <Dialog.Content>
                <div className="dialog-body">
                    <Tabs
                        items={tabs}
                        index={tab === "svg" ? 0 : tab === "image" ? 1 : 2}
                        onIndexChange={(index) => setTab(index === 0 ? "svg" : index === 1 ? "image" : "iconfont")}
                    />
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
                                <button className="ui-btn small" type="button" onClick={() => setCandidates((prev) => prev.map((item) => ({ ...item, checked: true })))}>
                                    全选
                                </button>
                                <button className="ui-btn small" type="button" onClick={() => setCandidates([])}>
                                    清空
                                </button>
                            </div>
                            <ul className="candidate-list">
                                {candidates.map((item) => (
                                    <li key={item.key} className="candidate-item">
                                        <input type="checkbox" checked={Boolean(item.checked)} onChange={(event) => toggleCandidate(item.key, event.target.checked)} />
                                        <SvgPreview svg={item.svg} size={22} />
                                        <input
                                            className="ui-input"
                                            value={item.className}
                                            onChange={(event) => updateCandidate(item.key, { className: event.target.value })}
                                        />
                                        <input
                                            className="ui-input"
                                            placeholder="标签（逗号分隔）"
                                            value={(item.tags || []).join(", ")}
                                            onChange={(event) =>
                                                updateCandidate(item.key, {
                                                    tags: event.target.value.split(/[,，\s]+/).filter(Boolean),
                                                })
                                            }
                                        />
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
