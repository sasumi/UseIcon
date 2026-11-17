import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DropdownMenu, LoadingHolder, MenuItemDivider, Select, Toast } from "minreact-ui";
import type { MenuEntry } from "minreact-ui";
import { CODE_TEMPLATE_PRESETS, DEFAULT_CODE_TEMPLATE, DEFAULT_ICON_SIZE, EXTMODE_CODE_HEIGHT_KEY, PROJECT_SORT_STORAGE_PREFIX } from "@/config";
import { navigate, extModePath, projectPath } from "@/router/useRoute";
import { useAuthStore } from "@/store/authStore";
import { useCodeTypeStore } from "@/store/codeTypeStore";
import type { CodeType } from "@/store/codeTypeStore";
import { useDisplayStore } from "@/store/displayStore";
import { openLoginDialog } from "@/store/loginDialogStore";
import { useProjectStore } from "@/store/projectStore";
import type { IconItem, Project } from "@/types";
import { copyText } from "@/utils/download";
import { sortIconsBySimilarity } from "@/utils/iconMatcher";
import { getProjectAccess } from "@/utils/permission";
import { renderIconCode } from "@/utils/svg";
import { useIconPhashes } from "@/hooks/useIconPhashes";
import { usePanelHeight } from "@/hooks/usePanelHeight";
import { DisplayControl } from "@/components/library/DisplayPanel";
import { AppIcon } from "@/components/common/AppIcon";
import { EmptyState } from "@/components/common/EmptyState";
import { SvgPreview } from "@/components/common/SvgPreview";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { LoginDialog } from "@/components/account/LoginDialog";
import { CodeTypeDialog } from "@/components/extmode/CodeTypeDialog";
import { ProjectPicker } from "@/components/project/ProjectPicker";

const PROJECT_TEMPLATE_VALUE = "__project__";
const NEW_TYPE_VALUE = "__new_type__";

const CODE_PANEL_HEIGHT = {
    storageKey: EXTMODE_CODE_HEIGHT_KEY,
    defaultHeight: 190,
    min: 110,
    max: 420,
};

type SortMode = "default" | "name-asc" | "name-desc" | "smart" | "custom";

const SORT_ITEMS: MenuEntry[] = [
    { value: "default", label: "默认", icon: <AppIcon name="layers" /> },
    { value: "name-asc", label: "名称 A → Z", icon: <AppIcon name="arrow-down" /> },
    { value: "name-desc", label: "名称 Z → A", icon: <AppIcon name="arrow-up" /> },
    { value: "smart", label: "智能排序", icon: <AppIcon name="sparkles" /> },
    { value: "custom", label: "自定义排序", icon: <AppIcon name="more-vertical" /> },
];

const SORT_LABELS: Record<SortMode, string> = {
    default: "默认",
    "name-asc": "名称 A → Z",
    "name-desc": "名称 Z → A",
    smart: "智能排序",
    custom: "自定义排序",
};

/** 与项目列表共用同一份排序偏好 */
const readSortMode = (projectId: string): SortMode => {
    try {
        const saved = localStorage.getItem(`${PROJECT_SORT_STORAGE_PREFIX}${projectId}`);
        return saved && saved in SORT_LABELS ? (saved as SortMode) : "default";
    } catch {
        return "default";
    }
};

/**
 * 拓展模式：竖屏小窗页面，拖动 / 点击图标按「当前代码类型」生成代码。
 * 代码类型可以是项目模板、内置预设，或用户自己新增的类型。
 */
export const ExtModePage = ({ projectId }: { projectId: string }) => {
    const user = useAuthStore((state) => state.user);
    const ready = useAuthStore((state) => state.ready);
    const project = useProjectStore((state) => state.current);
    const projects = useProjectStore((state) => state.projects);
    const icons = useProjectStore((state) => state.icons);
    const loading = useProjectStore((state) => state.detailLoading);
    const error = useProjectStore((state) => state.detailError);
    const loadProject = useProjectStore((state) => state.loadProject);
    const loadProjects = useProjectStore((state) => state.loadProjects);

    const [keyword, setKeyword] = useState("");
    const [tag, setTag] = useState("");
    const [sortMode, setSortMode] = useState<SortMode>("default");
    const [templateValue, setTemplateValue] = useState(PROJECT_TEMPLATE_VALUE);
    const [code, setCode] = useState("");
    const [codeTypeDialogOpen, setCodeTypeDialogOpen] = useState(false);
    const [editingType, setEditingType] = useState<CodeType | null>(null);
    const codeTypes = useCodeTypeStore((state) => state.types);
    const removeType = useCodeTypeStore((state) => state.removeType);
    const display = useDisplayStore((state) => state.display);
    const { height: codeHeight, panelRef: codePanelRef, resizerProps: codeResizerProps } = usePanelHeight(CODE_PANEL_HEIGHT);
    const loginPrompted = useRef(false);

    // 拓展模式要求登录：登录态恢复完成后仍未登录时，主动弹出一次登录框
    useEffect(() => {
        if (ready && !user && !loginPrompted.current) {
            loginPrompted.current = true;
            openLoginDialog();
        }
    }, [ready, user]);

    useEffect(() => {
        if (!user) {
            return;
        }
        void loadProject(projectId);
    }, [projectId, user, loadProject]);

    // 下拉切换项目需要完整项目列表
    useEffect(() => {
        if (!user) {
            return;
        }
        void loadProjects();
    }, [user, loadProjects]);

    // 切换项目时重置筛选与代码，并恢复该项目的排序偏好
    useEffect(() => {
        setKeyword("");
        setTag("");
        setCode("");
        setSortMode(readSortMode(projectId));
    }, [projectId]);

    const access = useMemo(() => getProjectAccess(project, user), [project, user]);
    const phashes = useIconPhashes(icons, sortMode === "smart");

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

    const size = DEFAULT_ICON_SIZE;
    const previewSize = display.size + display.padding * 2;

    const switchProject = (next: Project) => {
        if (next.id === project?.id) {
            return;
        }
        navigate(extModePath(next.id));
    };

    const tags = useMemo(() => {
        const set = new Set<string>();
        icons.forEach((icon) => icon.tags.forEach((item) => set.add(item)));
        return Array.from(set).slice(0, 24);
    }, [icons]);

    const filtered = useMemo(() => {
        const query = keyword.trim().toLowerCase();
        const matched = icons.filter((icon) => {
            if (tag && !icon.tags.includes(tag)) {
                return false;
            }
            if (!query) {
                return true;
            }
            return icon.className.toLowerCase().includes(query) || icon.tags.some((item) => item.toLowerCase().includes(query));
        });
        if (sortMode === "name-asc") {
            return [...matched].sort((a, b) => a.className.localeCompare(b.className, "zh"));
        }
        if (sortMode === "name-desc") {
            return [...matched].sort((a, b) => b.className.localeCompare(a.className, "zh"));
        }
        if (sortMode === "smart") {
            return sortIconsBySimilarity(matched, (icon) => icon.phash || phashes.get(icon.svg) || "");
        }
        return matched;
    }, [icons, keyword, tag, sortMode, phashes]);

    const changeSort = (value: unknown) => {
        if (typeof value !== "string" || !(value in SORT_LABELS)) {
            return;
        }
        const next = value as SortMode;
        setSortMode(next);
        try {
            localStorage.setItem(`${PROJECT_SORT_STORAGE_PREFIX}${projectId}`, next);
        } catch {
            // 忽略存储异常
        }
    };

    const codeFor = (icon: IconItem): string => renderIconCode(template, icon, size);

    const insert = (text: string) => {
        setCode((prev) => `${prev}${text}`);
    };

    if (!ready) {
        return (
            <div className="extmode-app">
                <LoadingHolder text="正在恢复登录态..." />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="extmode-app">
                <header className="extmode-header">
                    <span className="extmode-logo">UI</span>
                    <span className="extmode-title ellipsis">拓展模式</span>
                    <div className="spacer" />
                    <ThemeToggle />
                </header>
                <div className="extmode-login">
                    <EmptyState text="拓展模式需要登录后使用：登录即可读取你的项目与图标">
                        <button className="ui-btn primary" type="button" onClick={() => openLoginDialog()}>
                            去登录
                        </button>
                    </EmptyState>
                </div>
                <LoginDialog />
            </div>
        );
    }

    if (error) {
        return (
            <div className="extmode-app">
                <EmptyState text={error} variant="error" />
            </div>
        );
    }

    if (!project || project.id !== projectId) {
        // 切换项目时详情尚未返回，先按加载中处理，避免短暂显示上一个项目
        return (
            <div className="extmode-app">
                {loading || project ? <LoadingHolder text="加载中..." /> : <EmptyState text="项目不存在" />}
            </div>
        );
    }

    if (!access.canView) {
        return (
            <div className="extmode-app">
                <EmptyState text="无权访问该项目" />
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
                {projects.length > 1 && (
                    <ProjectPicker
                        currentId={project.id}
                        onSelect={switchProject}
                        trigger={
                            <button className="ui-icon-btn small extmode-project-switch" type="button" title="切换项目">
                                <AppIcon name="chevron-down" />
                            </button>
                        }
                    />
                )}
                <div className="spacer" />
                <ThemeToggle />
                <button className="ui-icon-btn" type="button" title="在完整页面打开" onClick={() => navigate(projectPath(project.id))}>
                    <AppIcon name="arrow-up-right" />
                </button>
            </header>

            <div className="extmode-toolbar">
                <div className="ui-search extmode-search">
                    <AppIcon name="search" />
                    <input
                        className="ui-input"
                        type="search"
                        placeholder="搜索图标"
                        value={keyword}
                        onChange={(event) => setKeyword(event.target.value)}
                    />
                </div>
                <DropdownMenu
                    items={SORT_ITEMS}
                    value={sortMode}
                    onChange={changeSort}
                    trigger={
                        <button
                            type="button"
                            className={`ui-btn small button-tonal select-like extmode-sort ${sortMode !== "default" ? "has-value" : ""}`}
                            title="排序方式"
                        >
                            {SORT_LABELS[sortMode]}
                        </button>
                    }
                />
                {tags.length > 0 && (
                    <Select
                        key={`${project.id}:${tag}`}
                        items={[
                            { value: "", label: "全部标签", icon: <AppIcon name="layers" /> },
                            ...tags.map((item) => ({ value: item, label: item, icon: <AppIcon name="tag" /> })),
                        ]}
                        value={tag}
                        placeholder="标签"
                        onChange={(value) => setTag(typeof value === "string" ? value : "")}
                        triggerClassName={`ui-btn small button-tonal extmode-tag ${tag ? "has-value" : ""}`}
                    />
                )}
                <DisplayControl />
            </div>

            <div className="extmode-grid-wrap">
                {icons.length === 0 ? (
                    <EmptyState text="项目里还没有图标" />
                ) : filtered.length === 0 ? (
                    <EmptyState text="没有匹配的图标" />
                ) : (
                    <ul className="extmode-grid" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${Math.max(74, previewSize + 20)}px, 1fr))` }}>
                        {filtered.map((icon) => (
                            <li
                                key={icon.iconId}
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
                                <span
                                    className="extmode-icon__preview"
                                    style={{
                                        width: previewSize,
                                        height: previewSize,
                                        padding: display.padding,
                                        background: display.background || undefined,
                                        color: display.color || undefined,
                                    }}
                                >
                                    <SvgPreview svg={icon.svg} size={display.size} />
                                </span>
                                <span className="extmode-icon__name">{icon.className}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div {...codeResizerProps} />
            <div className="extmode-code" ref={codePanelRef} style={code ? { height: codeHeight ?? CODE_PANEL_HEIGHT.defaultHeight } : undefined}>
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
                    {code && (
                        <button className="ui-icon-btn small" type="button" title="清空代码" onClick={() => setCode("")}>
                            <AppIcon name="trash" />
                        </button>
                    )}
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
                        className="extmode-editor"
                        readOnly
                        spellCheck={false}
                        value={code}
                        title="只读预览：点击或拖动图标即可插入代码"
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

