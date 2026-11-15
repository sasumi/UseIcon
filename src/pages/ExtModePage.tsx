import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DropdownMenu, MenuItemDivider, Toast } from "minreact-ui";
import type { MenuEntry } from "minreact-ui";
import { CODE_TEMPLATE_PRESETS, DEFAULT_CODE_TEMPLATE, EXTMODE_CODE_HEIGHT_KEY } from "@/config";
import { navigate, projectPath } from "@/router/useRoute";
import { useAuthStore } from "@/store/authStore";
import { useCodeTypeStore } from "@/store/codeTypeStore";
import type { CodeType } from "@/store/codeTypeStore";
import { useProjectStore } from "@/store/projectStore";
import type { IconItem } from "@/types";
import { copyText } from "@/utils/download";
import { getProjectAccess } from "@/utils/permission";
import { renderIconCode } from "@/utils/svg";
import { usePanelHeight } from "@/hooks/usePanelHeight";
import { AppIcon } from "@/components/common/AppIcon";
import { EmptyState } from "@/components/common/EmptyState";
import { SvgPreview } from "@/components/common/SvgPreview";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { CodeTypeDialog } from "@/components/extmode/CodeTypeDialog";

const PROJECT_TEMPLATE_VALUE = "__project__";
const NEW_TYPE_VALUE = "__new_type__";

/**
 * ExtMode：竖屏小窗模式，拖动 / 点击图标按「当前代码类型」生成代码。
 * 代码类型可以是项目模板、内置预设，或用户自己新增的类型。
 */
export const ExtModePage = ({ projectId }: { projectId: string }) => {
    const user = useAuthStore((state) => state.user);
    const project = useProjectStore((state) => state.current);
    const icons = useProjectStore((state) => state.icons);
    const loading = useProjectStore((state) => state.detailLoading);
    const error = useProjectStore((state) => state.detailError);
    const loadProject = useProjectStore((state) => state.loadProject);

    const [keyword, setKeyword] = useState("");
    const [templateValue, setTemplateValue] = useState(PROJECT_TEMPLATE_VALUE);
    const [code, setCode] = useState("");
    const [codeTypeDialogOpen, setCodeTypeDialogOpen] = useState(false);
    const [editingType, setEditingType] = useState<CodeType | null>(null);
    const codeTypes = useCodeTypeStore((state) => state.types);
    const removeType = useCodeTypeStore((state) => state.removeType);
    const codeRef = useRef<HTMLTextAreaElement>(null);
    const { height: codeHeight, panelRef: codePanelRef, resizerProps: codeResizerProps } = usePanelHeight({
        storageKey: EXTMODE_CODE_HEIGHT_KEY,
        defaultHeight: 190,
        min: 110,
        max: 420,
    });

    useEffect(() => {
        void loadProject(projectId);
    }, [projectId, loadProject]);

    const access = useMemo(() => getProjectAccess(project, user), [project, user]);

    const template = useMemo(() => {
        if (templateValue === PROJECT_TEMPLATE_VALUE) {
            return project?.codeTemplate || DEFAULT_CODE_TEMPLATE;
        }
        return (
            codeTypes.find((type) => type.id === templateValue)?.template ||
            CODE_TEMPLATE_PRESETS.find((preset) => preset.name === templateValue)?.template ||
            DEFAULT_CODE_TEMPLATE
        );
    }, [templateValue, project, codeTypes]);

    const templateLabel = useMemo(() => {
        if (templateValue === PROJECT_TEMPLATE_VALUE) {
            return "项目模板";
        }
        return codeTypes.find((type) => type.id === templateValue)?.name || templateValue;
    }, [templateValue, codeTypes]);

    const removeTypeWithConfirm = useCallback(
        (type: CodeType) => {
            void Dialog.confirm({
                title: "删除代码模板",
                message: `确定删除代码模板「${type.name}」吗？`,
                confirmText: "删除",
            }).then(() => {
                removeType(type.id);
                if (templateValue === type.id) {
                    setTemplateValue(PROJECT_TEMPLATE_VALUE);
                }
                Toast.showInfo("代码模板已删除");
            });
        },
        [removeType, templateValue],
    );

    const typeItems: MenuEntry[] = useMemo(
        () => [
            { value: PROJECT_TEMPLATE_VALUE, label: "项目模板", icon: <AppIcon name="folder" /> },
            ...CODE_TEMPLATE_PRESETS.map((preset) => ({ value: preset.name, label: preset.name, icon: <AppIcon name="code" /> })),
            ...codeTypes.map((type) => ({
                value: type.id,
                label: (
                    <span className="code-type-item">
                        <span className="ellipsis">{type.name}</span>
                        <span className="code-type-item__actions">
                            <span
                                className="code-type-item__btn"
                                role="button"
                                tabIndex={-1}
                                title="修改"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    setEditingType(type);
                                    setCodeTypeDialogOpen(true);
                                }}
                            >
                                <AppIcon name="edit" />
                            </span>
                            <span
                                className="code-type-item__btn danger"
                                role="button"
                                tabIndex={-1}
                                title="删除"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    removeTypeWithConfirm(type);
                                }}
                            >
                                <AppIcon name="trash" />
                            </span>
                        </span>
                    </span>
                ),
                icon: <AppIcon name="code" />,
            })),
            MenuItemDivider,
            { value: NEW_TYPE_VALUE, label: "新增代码模板…", icon: <AppIcon name="plus" /> },
        ],
        [codeTypes, removeTypeWithConfirm],
    );

    const changeType = (value: unknown) => {
        if (typeof value !== "string") {
            return;
        }
        if (value === NEW_TYPE_VALUE) {
            setCodeTypeDialogOpen(true);
            return;
        }
        setTemplateValue(value);
    };

    const size = project?.iconSize || 24;

    const filtered = useMemo(() => {
        const query = keyword.trim().toLowerCase();
        if (!query) {
            return icons;
        }
        return icons.filter(
            (icon) => icon.className.toLowerCase().includes(query) || icon.tags.some((item) => item.toLowerCase().includes(query)),
        );
    }, [icons, keyword]);

    const codeFor = (icon: IconItem): string => renderIconCode(template, icon, size);

    const insert = (text: string) => {
        const element = codeRef.current;
        if (!element) {
            setCode((prev) => `${prev}${text}`);
            return;
        }
        const start = element.selectionStart ?? code.length;
        const end = element.selectionEnd ?? code.length;
        const next = `${code.slice(0, start)}${text}${code.slice(end)}`;
        setCode(next);
        requestAnimationFrame(() => {
            element.focus();
            const position = start + text.length;
            element.setSelectionRange(position, position);
        });
    };

    if (error) {
        return (
            <div className="extmode-app">
                <EmptyState text={error} icon="warning" />
            </div>
        );
    }

    if (!project) {
        return <div className="extmode-app">{loading ? <div className="ui-loading">加载中...</div> : <EmptyState text="项目不存在" />}</div>;
    }

    if (!access.canView) {
        return (
            <div className="extmode-app">
                <EmptyState text="无权访问该项目" icon="lock" />
            </div>
        );
    }

    return (
        <div className="extmode-app">
            <header className="extmode-header">
                <span className="extmode-logo">UI</span>
                <span className="extmode-title ellipsis" title={project.name}>
                    {project.name}
                </span>
                <span className="ui-chip">ExtMode</span>
                <div className="spacer" />
                <ThemeToggle />
                <button className="ui-icon-btn" type="button" title="在完整页面打开" onClick={() => navigate(projectPath(project.id))}>
                    <AppIcon name="arrow-up-right" />
                </button>
            </header>

            <div className="extmode-toolbar">
                <div className="ui-search extmode-search">
                    <AppIcon name="search" />
                    <input className="ui-input" placeholder="搜索图标" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
                </div>
            </div>

            <div className="extmode-grid-wrap">
                {filtered.length === 0 ? (
                    <EmptyState text="没有匹配的图标" icon="search" />
                ) : (
                    <ul className="extmode-grid">
                        {filtered.map((icon) => (
                            <li
                                key={icon.id}
                                className="extmode-icon"
                                draggable
                                title={`${icon.className}${icon.tags.length > 0 ? ` · ${icon.tags.join(" · ")}` : ""}\n拖动或点击插入代码`}
                                onDragStart={(event) => {
                                    const text = codeFor(icon);
                                    event.dataTransfer.setData("text/plain", text);
                                    event.dataTransfer.setData("text/html", icon.svg);
                                    event.dataTransfer.effectAllowed = "copy";
                                }}
                                onClick={() => {
                                    insert(codeFor(icon));
                                }}
                            >
                                <SvgPreview svg={icon.svg} size={Math.min(Math.max(size, 20), 32)} />
                                <span className="extmode-icon__name">{icon.className}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div {...codeResizerProps} />
            <div className="extmode-code" ref={codePanelRef} style={code && codeHeight ? { height: codeHeight } : undefined}>
                <div className="extmode-code__head">
                    <DropdownMenu
                        key={templateValue}
                        items={typeItems}
                        value={templateValue}
                        onChange={changeType}
                        trigger={
                            <button type="button" className="ui-btn small button-tonal select-like extmode-type-select">
                                {templateLabel}
                            </button>
                        }
                    />
                    <div className="spacer" />
                    <button
                        className="ui-icon-btn small"
                        type="button"
                        title="复制代码"
                        disabled={!code}
                        onClick={() =>
                            void copyText(code).then(
                                () => Toast.showSuccess("代码已复制"),
                                () => Toast.showError("复制失败"),
                            )
                        }
                    >
                        <AppIcon name="copy" />
                    </button>
                </div>
                {code ? (
                    <textarea
                        ref={codeRef}
                        className="extmode-editor"
                        spellCheck={false}
                        value={code}
                        onChange={(event) => setCode(event.target.value)}
                        onDragOver={(event) => {
                            event.preventDefault();
                            event.dataTransfer.dropEffect = "copy";
                        }}
                        onDrop={(event) => {
                            event.preventDefault();
                            const text = event.dataTransfer.getData("text/plain");
                            if (text) {
                                insert(text);
                            }
                        }}
                    />
                ) : null}
            </div>

            <CodeTypeDialog
                open={codeTypeDialogOpen}
                setOpen={(open) => {
                    setCodeTypeDialogOpen(open);
                    if (!open) {
                        setEditingType(null);
                    }
                }}
                editing={editingType}
                onSaved={(type) => setTemplateValue(type.id)}
            />
        </div>
    );
};

