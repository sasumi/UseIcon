import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DropdownMenu, EmptyHolder, LoadingHolder, Select, Toast } from "minreact-ui";
import type { MenuEntry } from "minreact-ui";
import { api } from "@/api";
import { PROJECT_SORT_STORAGE_PREFIX } from "@/config";
import { useClearOnBlankClick } from "@/hooks/useClearOnBlankClick";
import { useDragSelect } from "@/hooks/useDragSelect";
import { useTimedTip } from "@/hooks/useTimedTip";
import { extModePath, navigate, projectPath } from "@/router/useRoute";
import { useAuthStore } from "@/store/authStore";
import { openLoginDialog } from "@/store/loginDialogStore";
import { cartItemFromProjectIcon, useCartStore } from "@/store/cartStore";
import { useLibraryStore } from "@/store/libraryStore";
import { useProjectStore } from "@/store/projectStore";
import type { IconItem } from "@/types";
import { copyText, downloadSvg } from "@/utils/download";
import { favoriteKeyOf } from "@/utils/iconDedupe";
import { getProjectAccess } from "@/utils/permission";
import { renderIconCode } from "@/utils/svg";
import { AppIcon } from "@/components/common/AppIcon";
import { EmptyState } from "@/components/common/EmptyState";
import { SidePanel } from "@/components/common/SidePanel";
import { TipBubble } from "@/components/common/TipBubble";
import { BatchOptimizeDialog } from "@/components/project/BatchOptimizeDialog";
import { BatchRenameDialog } from "@/components/project/BatchRenameDialog";
import { ExportMenu } from "@/components/project/ExportMenu";
import { IconCard } from "@/components/project/IconCard";
import { DisplayControl } from "@/components/library/DisplayPanel";
import { IconDetailDialog } from "@/components/project/IconDetailDialog";
import type { IconDetailPatch } from "@/components/project/IconDetailDialog";
import { PickLibraryDialog } from "@/components/project/PickLibraryDialog";
import { ProjectFormDialog } from "@/components/project/ProjectFormDialog";
import { ProjectBasicsDialog } from "@/components/project/ProjectBasicsDialog";
import { ProjectMembersDialog } from "@/components/project/ProjectMembersDialog";
import { ProjectTemplateDialog } from "@/components/project/ProjectTemplateDialog";
import { UploadDialog } from "@/components/project/UploadDialog";

type SortMode = "default" | "name-asc" | "name-desc" | "custom";

type SettingsDialogKey = "basics" | "members" | "template" | null;

const SETTINGS_ITEMS: MenuEntry[] = [
    { value: "basics", label: "基础设置", icon: <AppIcon name="settings" /> },
    { value: "members", label: "成员与权限", icon: <AppIcon name="users" /> },
    { value: "template", label: "代码模板", icon: <AppIcon name="code" /> },
];

const SORT_ITEMS: MenuEntry[] = [
    { value: "default", label: "默认顺序", icon: <AppIcon name="layers" /> },
    { value: "name-asc", label: "名称 A → Z", icon: <AppIcon name="arrow-down" /> },
    { value: "name-desc", label: "名称 Z → A", icon: <AppIcon name="arrow-up" /> },
    { value: "custom", label: "自定义排序", icon: <AppIcon name="more-vertical" /> },
];

const SORT_LABELS: Record<SortMode, string> = {
    default: "默认顺序",
    "name-asc": "名称 A → Z",
    "name-desc": "名称 Z → A",
    custom: "自定义排序",
};

const readSortMode = (projectId: string): SortMode => {
    try {
        const saved = localStorage.getItem(`${PROJECT_SORT_STORAGE_PREFIX}${projectId}`);
        return saved && saved in SORT_LABELS ? (saved as SortMode) : "default";
    } catch {
        return "default";
    }
};

/** 项目工作区：侧栏项目列表 + 主区图标管理（未指定项目时默认打开第一个；支持框选与批量采集 / 收藏） */
export const ProjectPage = ({ projectId }: { projectId?: string }) => {
    const user = useAuthStore((state) => state.user);
    const projects = useProjectStore((state) => state.projects);
    const listLoading = useProjectStore((state) => state.listLoading);
    const project = useProjectStore((state) => state.current);
    const icons = useProjectStore((state) => state.icons);
    const loading = useProjectStore((state) => state.detailLoading);
    const error = useProjectStore((state) => state.detailError);
    const loadProject = useProjectStore((state) => state.loadProject);
    const refreshCurrent = useProjectStore((state) => state.refreshCurrent);
    const setCurrent = useProjectStore((state) => state.setCurrent);
    const updateIcons = useProjectStore((state) => state.updateIcons);
    const removeIcons = useProjectStore((state) => state.removeIcons);

    const [keyword, setKeyword] = useState("");
    const [tag, setTag] = useState("");
    const [category, setCategory] = useState("");
    const [selected, setSelected] = useState<string[]>([]);
    const gridRef = useRef<HTMLUListElement | null>(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [pickOpen, setPickOpen] = useState(false);
    const [settingsDialog, setSettingsDialog] = useState<SettingsDialogKey>(null);
    const [optimizeOpen, setOptimizeOpen] = useState(false);
    const [renameOpen, setRenameOpen] = useState(false);
    const [detail, setDetail] = useState<IconItem | null>(null);
    const [sortMode, setSortMode] = useState<SortMode>("default");
    const [dragIconId, setDragIconId] = useState<string | null>(null);
    const [dropTarget, setDropTarget] = useState<{ id: string; position: "before" | "after" } | null>(null);

    const favorites = useLibraryStore((state) => state.favorites);
    const addFavorite = useLibraryStore((state) => state.addFavorite);
    const addFavorites = useLibraryStore((state) => state.addFavorites);
    const removeFavorite = useLibraryStore((state) => state.removeFavorite);
    const cartItems = useCartStore((state) => state.items);
    const toggleCart = useCartStore((state) => state.toggle);
    const { tip: cartTip, show: showCartTip } = useTimedTip();

    // 未指定项目时默认打开第一个项目
    useEffect(() => {
        if (projectId || listLoading || projects.length === 0) {
            return;
        }
        navigate(projectPath(projects[0].id), { replace: true });
    }, [projectId, listLoading, projects]);

    useEffect(() => {
        setSelected([]);
        setKeyword("");
        setTag("");
        setCategory("");
        if (projectId) {
            void loadProject(projectId);
        }
    }, [projectId, loadProject]);

    // 每个项目分别记住排序偏好
    useEffect(() => {
        setSortMode(projectId ? readSortMode(projectId) : "default");
    }, [projectId]);

    const access = useMemo(() => getProjectAccess(project, user), [project, user]);

    const tags = useMemo(() => {
        const set = new Set<string>();
        icons.forEach((icon) => icon.tags.forEach((item) => set.add(item)));
        return Array.from(set).slice(0, 24);
    }, [icons]);

    const categories = useMemo(() => {
        const set = new Set<string>();
        icons.forEach((icon) => icon.category && set.add(icon.category));
        return Array.from(set).sort((a, b) => a.localeCompare(b, "zh-CN"));
    }, [icons]);

    const filtered = useMemo(() => {
        const query = keyword.trim().toLowerCase();
        const matched = icons.filter((icon) => {
            if (tag && !icon.tags.includes(tag)) {
                return false;
            }
            if (category && icon.category !== category) {
                return false;
            }
            if (!query) {
                return true;
            }
            return (
                icon.className.toLowerCase().includes(query) ||
                (icon.category || "").toLowerCase().includes(query) ||
                icon.tags.some((item) => item.toLowerCase().includes(query))
            );
        });
        if (sortMode === "name-asc") {
            return [...matched].sort((a, b) => a.className.localeCompare(b.className));
        }
        if (sortMode === "name-desc") {
            return [...matched].sort((a, b) => b.className.localeCompare(a.className));
        }
        return matched;
    }, [icons, keyword, tag, category, sortMode]);

    const selectedIcons = useMemo(() => icons.filter((icon) => selected.includes(icon.id)), [icons, selected]);
    const canSort = sortMode === "custom" && access.canEdit;
    const dragBox = useDragSelect({
        containerRef: gridRef,
        enabled: access.canEdit && filtered.length > 0,
        onSelect: (ids, additive) => setSelected((prev) => (additive ? Array.from(new Set([...prev, ...ids])) : ids)),
    });
    useClearOnBlankClick(() => setSelected((prev) => (prev.length === 0 ? prev : [])));
    const template = project?.codeTemplate || "";
    const iconSize = project?.iconSize || 24;
    const activeProjectId = project?.id || projectId || "";

    const codeFor = (icon: IconItem): string => renderIconCode(template, icon, iconSize);

    const favoriteOf = (icon: IconItem) =>
        favorites.find(
            (item) => favoriteKeyOf(item) === favoriteKeyOf({ className: icon.className, libraryId: icon.libraryId, projectId: activeProjectId }),
        );
    const inCart = (icon: IconItem) => cartItems.some((item) => item.key === `project:${activeProjectId}:${icon.id}`);

    const toggleIconFavorite = (icon: IconItem) => {
        if (!user) {
            Toast.showInfo("登录后即可收藏图标");
            openLoginDialog();
            return;
        }
        const existed = favoriteOf(icon);
        if (existed) {
            void removeFavorite(existed.id).catch((error: unknown) =>
                Toast.showError(error instanceof Error ? error.message : "操作失败"),
            );
            return;
        }
        void addFavorite({
            className: icon.className,
            category: icon.category,
            svg: icon.svg,
            tags: icon.tags,
            source: "project",
            projectId,
            libraryId: icon.libraryId || undefined,
        }).catch((error: unknown) => Toast.showError(error instanceof Error ? error.message : "收藏失败"));
    };

    const toggleIconCart = (icon: IconItem) => {
        toggleCart(cartItemFromProjectIcon(activeProjectId, icon));
    };

    const changeSort = (value: unknown) => {
        if (typeof value !== "string" || !(value in SORT_LABELS)) {
            return;
        }
        const next = value as SortMode;
        setSortMode(next);
        if (projectId) {
            try {
                localStorage.setItem(`${PROJECT_SORT_STORAGE_PREFIX}${projectId}`, next);
            } catch {
                // 忽略存储异常
            }
        }
    };

    /** 自定义排序：把拖动的图标插入到目标位置并及时保存 */
    const dropOnIcon = (targetId: string, position: "before" | "after") => {
        if (!dragIconId || dragIconId === targetId) {
            setDragIconId(null);
            setDropTarget(null);
            return;
        }
        const ids = icons.map((icon) => icon.id);
        const from = ids.indexOf(dragIconId);
        setDragIconId(null);
        setDropTarget(null);
        if (from < 0) {
            return;
        }
        ids.splice(from, 1);
        const targetIndex = ids.indexOf(targetId);
        if (targetIndex < 0) {
            return;
        }
        ids.splice(position === "before" ? targetIndex : targetIndex + 1, 0, dragIconId);
        useProjectStore.getState().setIconsOrder(ids);
        void api.icons.reorderIcons(activeProjectId, ids).catch((err: unknown) => {
            Toast.showError(err instanceof Error ? err.message : "排序保存失败");
            void refreshCurrent();
        });
    };

    const addSelectedToCart = () => {
        let added = 0;
        selectedIcons.forEach((icon) => {
            const item = cartItemFromProjectIcon(activeProjectId, icon);
            if (!cartItems.some((entry) => entry.key === item.key)) {
                toggleCart(item);
                added += 1;
            }
        });
        const ignored = selectedIcons.length - added;
        showCartTip(
            added > 0
                ? `已加入采集车 ${added} 个图标${ignored > 0 ? `，忽略 ${ignored} 个已存在` : ""}`
                : `所选 ${ignored} 个图标均已在采集车中`,
        );
    };

    /** 批量收藏：已收藏过的图标跳过并在提示里说明忽略数量 */
    const addSelectedToFavorites = () => {
        if (!user) {
            Toast.showInfo("登录后即可收藏图标");
            openLoginDialog();
            return;
        }
        void addFavorites(
            selectedIcons.map((icon) => ({
                className: icon.className,
                category: icon.category,
                svg: icon.svg,
                tags: icon.tags,
                source: "project" as const,
                projectId: activeProjectId,
                libraryId: icon.libraryId || undefined,
            })),
        )
            .then(({ added, ignored }) => {
                if (added === 0) {
                    Toast.showInfo(`所选 ${ignored} 个图标都已在收藏中，已忽略`);
                    return;
                }
                Toast.showSuccess(`已收藏 ${added} 个图标${ignored > 0 ? `，忽略 ${ignored} 个已存在` : ""}`);
            })
            .catch((error: unknown) => Toast.showError(error instanceof Error ? error.message : "收藏失败"));
    };

    const toggleSelect = (iconId: string, checked: boolean) => {
        setSelected((prev) => (checked ? Array.from(new Set([...prev, iconId])) : prev.filter((item) => item !== iconId)));
    };

    const allSelected = filtered.length > 0 && filtered.every((icon) => selected.includes(icon.id));

    const toggleSelectAll = (checked: boolean) => {
        setSelected(checked ? filtered.map((icon) => icon.id) : []);
    };

    const afterChange = () => {
        setSelected([]);
        void refreshCurrent();
    };

    const removeSelected = () => {
        if (selected.length === 0) {
            return;
        }
        const ids = selected;
        void Dialog.confirm({
            title: "删除",
            message: `确定删除选中的 ${ids.length} 个图标吗？此操作不可恢复。`,
            confirmText: "删除",
        })
            .then(() =>
                api.icons
                    .deleteIcons(ids)
                    .then(() => {
                        removeIcons(ids);
                        setSelected([]);
                        Toast.showSuccess("已删除所选图标");
                    })
                    .catch((error: unknown) => Toast.showError(error instanceof Error ? error.message : "删除失败")),
            )
            .catch(() => undefined);
    };

    const copyIconCode = (icon: IconItem) =>
        void copyText(codeFor(icon)).then(
            () => Toast.showSuccess(`已复制 ${icon.className} 的代码`),
            () => Toast.showError("复制失败"),
        );

    const saveDetail = async (patch: IconDetailPatch) => {
        if (!detail) {
            return;
        }
        updateIcons([await api.icons.updateIcon(detail.id, patch)]);
    };

    const deleteDetail = () => {
        if (!detail) {
            return;
        }
        void api.icons
            .deleteIcons([detail.id])
            .then(() => {
                removeIcons([detail.id]);
                Toast.showSuccess("图标已删除");
            })
            .catch((error: unknown) => Toast.showError(error instanceof Error ? error.message : "删除失败"));
    };

    const openExtMode = () => {
        if (!project) {
            return;
        }
        const url = `${window.location.origin}${window.location.pathname}#${extModePath(project.id)}`;
        window.open(url, `useicon-extmode-${project.id}`, "width=420,height=900,menubar=no,toolbar=no");
    };

    const sidebar = (
        <SidePanel storageKey="projects" defaultWidth={236} minWidth={168}>
            <ProjectList activeId={projectId || ""} onCreate={() => setCreateOpen(true)} />
        </SidePanel>
    );

    const createDialog = (
        <ProjectFormDialog
            open={createOpen}
            setOpen={setCreateOpen}
            onCreated={(created) => navigate(projectPath(created.id))}
        />
    );

    if (!projectId) {
        return (
            <>
                {sidebar}
                <div className="content-panel padded">
                    {listLoading ? (
                        <LoadingHolder text="正在加载项目..." />
                    ) : (
                        <EmptyState text={user ? "还没有项目，创建一个开始管理代码图标" : "登录后即可创建与管理项目"}>
                            {user ? (
                                <button className="ui-btn primary" type="button" onClick={() => setCreateOpen(true)}>
                                    新建项目
                                </button>
                            ) : (
                                <button className="ui-btn primary" type="button" onClick={() => openLoginDialog()}>
                                    去登录
                                </button>
                            )}
                        </EmptyState>
                    )}
                </div>
                <ProjectFormDialog
                    open={createOpen}
                    setOpen={setCreateOpen}
                    onCreated={(created) => navigate(projectPath(created.id))}
                />
            </>
        );
    }

    if (error) {
        return (
            <>
                {sidebar}
                <div className="content-panel padded">
                    <EmptyState text={error} variant="error">
                        <button className="ui-btn" type="button" onClick={() => navigate("/projects")}>
                            返回项目列表
                        </button>
                    </EmptyState>
                </div>
                {createDialog}
            </>
        );
    }

    if (!project || (loading && project.id !== projectId)) {
        return (
            <>
                {sidebar}
                <div className="content-panel padded">
                    <LoadingHolder text="正在加载项目..." />
                </div>
                {createDialog}
            </>
        );
    }

    if (!access.canView) {
        return (
            <>
                {sidebar}
                <div className="content-panel padded">
                    <EmptyState text="你没有访问该项目的权限（内部项目仅成员可见）" />
                </div>
                {createDialog}
            </>
        );
    }

    return (
        <>
            {sidebar}

            <div className="content-panel padded with-icon-scroll">
                <div className="project-header">
                    <div className="project-header__main">
                        <div className="project-header__title">
                            <h2>
                                <AppIcon
                                    name={project.visibility === "public" ? "globe" : "lock"}
                                    className="project-header__visibility"
                                    title={project.visibility === "public" ? "公开项目" : "内部项目（仅成员可见）"}
                                />
                                {project.name}
                            </h2>
                            {project.allowGuest && <span className="ui-badge guest">允许游客</span>}
                        </div>
                        <p className="project-header__desc">{project.description || "暂无描述"}</p>
                    </div>
                    <div className="project-header__actions">
                        <button className="ui-btn small" type="button" title="在新窗口打开竖屏拓展模式" onClick={openExtMode}>
                            <AppIcon name="monitor" />
                            拓展模式
                        </button>
                        {access.canEdit && (
                            <button className="ui-btn small primary" type="button" onClick={() => setUploadOpen(true)}>
                                <AppIcon name="upload" />
                                上传图标
                            </button>
                        )}
                        <ExportMenu
                            icons={selectedIcons.length > 0 ? selectedIcons : icons}
                            projectName={project.name}
                            size={iconSize}
                            label="导出"
                        />
                        {access.canManage && (
                            <DropdownMenu
                                items={SETTINGS_ITEMS}
                                onChange={(value) => setSettingsDialog(value as SettingsDialogKey)}
                                trigger={
                                    <span className="ui-btn small">
                                        <AppIcon name="settings" />
                                        设置
                                    </span>
                                }
                            />
                        )}
                    </div>
                </div>

                <div className="content-toolbar project-toolbar">
                    {filtered.length > 0 && (
                        <label className="ui-row ui-note">
                            <input type="checkbox" checked={allSelected} onChange={(event) => toggleSelectAll(event.target.checked)} />
                            全选（{filtered.length}）
                        </label>
                    )}
                    {selected.length > 0 && (
                        <div className="batch-actions">
                            <span className="batch-actions__count">已选 {selected.length} 个</span>
                            <span className="tip-anchor">
                                <button className="ui-btn small" type="button" onClick={addSelectedToCart}>
                                    <AppIcon name="cart" />
                                    采集
                                </button>
                                <TipBubble text={cartTip} />
                            </span>
                            <button className="ui-btn small" type="button" onClick={addSelectedToFavorites}>
                                <AppIcon name="star" />
                                收藏
                            </button>
                            <button className="ui-btn small" type="button" onClick={() => setOptimizeOpen(true)}>
                                <AppIcon name="settings" />
                                优化
                            </button>
                            <button className="ui-btn small" type="button" onClick={() => setRenameOpen(true)}>
                                <AppIcon name="edit" />
                                重命名
                            </button>
                            <ExportMenu icons={selectedIcons} projectName={project.name} size={iconSize} label="导出" />
                            <button className="ui-btn small danger" type="button" onClick={removeSelected}>
                                <AppIcon name="trash" />
                                删除
                            </button>
                        </div>
                    )}
                    <div className="spacer" />
                    <div className="ui-search project-toolbar__search">
                        <AppIcon name="search" />
                        <input
                            className="ui-input"
                            type="search"
                            placeholder="搜索"
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
                                className={`ui-btn small button-tonal select-like project-toolbar__sort ${sortMode !== "default" ? "has-value" : ""}`}
                            >
                                {SORT_LABELS[sortMode]}
                            </button>
                        }
                    />
                    <Select
                        key={`${project.id}:category`}
                        items={[
                            { value: "", label: "全部分类", icon: <AppIcon name="layers" /> },
                            ...categories.map((item) => ({ value: item, label: item, icon: <AppIcon name="folder" /> })),
                        ]}
                        value={category}
                        placeholder="分类"
                        onChange={(value) => setCategory(typeof value === "string" ? value : "")}
                        triggerClassName={`ui-btn small button-tonal project-toolbar__category ${category ? "has-value" : ""}`}
                    />
                    <Select
                        key={`${project.id}:${tag}`}
                        items={[
                            { value: "", label: "全部标签", icon: <AppIcon name="layers" /> },
                            ...tags.map((item) => ({ value: item, label: item, icon: <AppIcon name="tag" /> })),
                        ]}
                        value={tag}
                        placeholder="标签"
                        onChange={(value) => setTag(typeof value === "string" ? value : "")}
                        triggerClassName={`ui-btn small button-tonal project-toolbar__tag ${tag ? "has-value" : ""}`}
                    />
                    <DisplayControl />
                </div>

                {icons.length === 0 ? (
                    <EmptyState text={access.canEdit ? "项目里还没有图标，上传或从公共库添加" : "项目里还没有图标"}>
                        {access.canEdit && (
                            <div className="toolbar">
                                <button className="ui-btn primary" type="button" onClick={() => setUploadOpen(true)}>
                                    上传图标
                                </button>
                                <button className="ui-btn" type="button" onClick={() => setPickOpen(true)}>
                                    从公共库添加
                                </button>
                            </div>
                        )}
                    </EmptyState>
                ) : filtered.length === 0 ? (
                    <EmptyState text="没有匹配当前筛选条件的图标" />
                ) : (
                    <div className="icon-scroll">
                        <ul ref={gridRef} className={`icon-grid ${sortMode === "custom" ? "is-sortable" : ""}`}>
                        {filtered.map((icon) => (
                            <li
                                key={icon.id}
                                data-select-id={icon.id}
                                className={[
                                    dragIconId === icon.id ? "dragging" : "",
                                    dropTarget?.id === icon.id ? `drop-${dropTarget.position}` : "",
                                ]
                                    .filter(Boolean)
                                    .join(" ")}
                                draggable={canSort}
                                onDragStart={(event) => {
                                    if (!canSort) {
                                        return;
                                    }
                                    setDragIconId(icon.id);
                                    event.dataTransfer.effectAllowed = "move";
                                    event.dataTransfer.setData("text/plain", icon.id);
                                }}
                                onDragOver={(event) => {
                                    if (!canSort) {
                                        return;
                                    }
                                    event.preventDefault();
                                    event.dataTransfer.dropEffect = "move";
                                    if (dragIconId === icon.id) {
                                        setDropTarget(null);
                                        return;
                                    }
                                    // 光标落在卡片左半边插到前面，右半边插到后面
                                    const rect = event.currentTarget.getBoundingClientRect();
                                    const position = event.clientX < rect.left + rect.width / 2 ? "before" : "after";
                                    setDropTarget((prev) =>
                                        prev?.id === icon.id && prev.position === position ? prev : { id: icon.id, position },
                                    );
                                }}
                                onDragLeave={(event) => {
                                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                                        setDropTarget((prev) => (prev?.id === icon.id ? null : prev));
                                    }
                                }}
                                onDrop={(event) => {
                                    if (!canSort) {
                                        return;
                                    }
                                    event.preventDefault();
                                    const rect = event.currentTarget.getBoundingClientRect();
                                    const position =
                                        dropTarget?.id === icon.id
                                            ? dropTarget.position
                                            : event.clientX < rect.left + rect.width / 2
                                              ? "before"
                                              : "after";
                                    dropOnIcon(icon.id, position);
                                }}
                                onDragEnd={() => {
                                    setDragIconId(null);
                                    setDropTarget(null);
                                }}
                            >
                                <IconCard
                                    icon={icon}
                                    code={codeFor(icon)}
                                    draggable={!canSort}
                                    selected={selected.includes(icon.id)}
                                    selectable={access.canEdit}
                                    canEdit={access.canEdit}
                                    favorite={Boolean(favoriteOf(icon))}
                                    inCart={inCart(icon)}
                                    onToggleSelect={(checked) => toggleSelect(icon.id, checked)}
                                    onOpen={() => setDetail(icon)}
                                    onCopy={() => copyIconCode(icon)}
                                    onCart={() => toggleIconCart(icon)}
                                    onFavorite={() => toggleIconFavorite(icon)}
                                    onDownload={() => downloadSvg(icon, iconSize)}
                                    onDelete={() => {
                                        void Dialog.confirm({
                                            title: "删除",
                                            message: `确定删除「${icon.className}」吗？此操作不可恢复。`,
                                            confirmText: "删除",
                                        })
                                            .then(() =>
                                                api.icons
                                                    .deleteIcons([icon.id])
                                                    .then(() => {
                                                        removeIcons([icon.id]);
                                                        Toast.showSuccess("图标已删除");
                                                    })
                                                    .catch((error: unknown) =>
                                                        Toast.showError(error instanceof Error ? error.message : "删除失败"),
                                                    ),
                                            )
                                            .catch(() => undefined);
                                    }}
                                />
                            </li>
                        ))}
                        </ul>
                    </div>
                )}

                {dragBox && (
                    <div
                        className="drag-select-box"
                        style={{ left: dragBox.left, top: dragBox.top, width: dragBox.width, height: dragBox.height }}
                    />
                )}
            </div>

            <UploadDialog open={uploadOpen} setOpen={setUploadOpen} projectId={project.id} onImported={afterChange} />
            <PickLibraryDialog open={pickOpen} setOpen={setPickOpen} projectId={project.id} onAdded={afterChange} />
            <BatchOptimizeDialog
                open={optimizeOpen}
                setOpen={setOptimizeOpen}
                iconIds={selected}
                defaultSize={iconSize}
                onDone={(updated) => {
                    updateIcons(updated);
                    setSelected([]);
                }}
            />
            <BatchRenameDialog
                open={renameOpen}
                setOpen={setRenameOpen}
                iconIds={selected}
                onDone={(updated) => {
                    updateIcons(updated);
                    setSelected([]);
                }}
            />
            <ProjectBasicsDialog
                open={settingsDialog === "basics"}
                setOpen={(open) => setSettingsDialog(open ? "basics" : null)}
                project={project}
                onUpdated={(updated) => setCurrent(updated)}
                onDeleted={() => {
                    void useProjectStore.getState().loadProjects();
                    navigate("/projects");
                }}
            />
            <ProjectMembersDialog
                open={settingsDialog === "members"}
                setOpen={(open) => setSettingsDialog(open ? "members" : null)}
                project={project}
                onUpdated={(updated) => setCurrent(updated)}
            />
            <ProjectTemplateDialog
                open={settingsDialog === "template"}
                setOpen={(open) => setSettingsDialog(open ? "template" : null)}
                project={project}
                onUpdated={(updated) => setCurrent(updated)}
            />
            <IconDetailDialog
                open={Boolean(detail)}
                setOpen={(open) => !open && setDetail(null)}
                icon={detail}
                template={template}
                size={iconSize}
                canEdit={access.canEdit}
                categories={categories}
                favorite={detail ? Boolean(favoriteOf(detail)) : false}
                inCart={detail ? inCart(detail) : false}
                onFavorite={() => detail && toggleIconFavorite(detail)}
                onCart={() => detail && toggleIconCart(detail)}
                onSave={saveDetail}
                onDelete={deleteDetail}
            />
            {createDialog}
        </>
    );
};

/** 侧栏项目列表：切换项目、查看图标数量、新建项目 */
const ProjectList = ({ activeId, onCreate }: { activeId: string; onCreate: () => void }) => {
    const user = useAuthStore((state) => state.user);
    const projects = useProjectStore((state) => state.projects);
    const projectTotal = useProjectStore((state) => state.projectTotal);
    const projectHasMore = useProjectStore((state) => state.projectHasMore);
    const projectLoadingMore = useProjectStore((state) => state.projectLoadingMore);
    const listLoading = useProjectStore((state) => state.listLoading);
    const listLoaded = useProjectStore((state) => state.listLoaded);
    const loadProjects = useProjectStore((state) => state.loadProjects);
    const loadProjectPage = useProjectStore((state) => state.loadProjectPage);
    const loadMoreProjects = useProjectStore((state) => state.loadMoreProjects);
    const [keyword, setKeyword] = useState("");
    const [counts, setCounts] = useState<Record<string, number>>({});
    const sentinelRef = useRef<HTMLDivElement | null>(null);

    // 列表只加载一次：直接打开项目详情（如从 ExtMode 返回）时补一次，空列表也不会反复请求
    useEffect(() => {
        if (!listLoaded && !listLoading) {
            void loadProjectPage();
        }
    }, [listLoaded, listLoading, loadProjectPage]);

    // 搜索需要覆盖未加载的项目时，直接取全量
    useEffect(() => {
        if (keyword.trim() && projectHasMore) {
            void loadProjects();
        }
    }, [keyword, projectHasMore, loadProjects]);

    // 侧栏滚动到底部（或首屏内容不足）时加载下一页
    useEffect(() => {
        const body = sentinelRef.current?.closest(".side-panel__body") as HTMLElement | null;
        if (!body) {
            return;
        }
        let timer = 0;
        const check = () => {
            if (body.scrollTop + body.clientHeight >= body.scrollHeight - 48) {
                void loadMoreProjects();
            }
        };
        // 等布局稳定后再判断，避免内容不足一屏或刚好到底时卡住
        timer = window.setTimeout(check, 80);
        body.addEventListener("scroll", check, { passive: true });
        return () => {
            window.clearTimeout(timer);
            body.removeEventListener("scroll", check);
        };
    }, [loadMoreProjects, projectHasMore, projects.length]);

    useEffect(() => {
        if (projects.length === 0) {
            setCounts({});
            return;
        }
        let alive = true;
        void Promise.all(projects.map((item) => api.icons.listIcons(item.id).then((list) => list.length).catch(() => 0))).then((lists) => {
            if (!alive) {
                return;
            }
            const map: Record<string, number> = {};
            projects.forEach((item, index) => {
                map[item.id] = lists[index];
            });
            setCounts(map);
        });
        return () => {
            alive = false;
        };
    }, [projects]);

    const filtered = useMemo(() => {
        const query = keyword.trim().toLowerCase();
        if (!query) {
            return projects;
        }
        return projects.filter((item) => item.name.toLowerCase().includes(query) || item.description.toLowerCase().includes(query));
    }, [projects, keyword]);

    return (
        <>
            <div className="side-panel__header">
                项目
                <div className="spacer" />
                <button
                    className="ui-btn small primary"
                    type="button"
                    title={user ? "新建项目" : "登录后新建项目"}
                    onClick={() => (user ? onCreate() : openLoginDialog())}
                >
                    <AppIcon name="plus" />
                    新建
                </button>
            </div>
            <div className="side-panel__body">
                <div className="ui-search project-list__search">
                    <AppIcon name="search" />
                    <input
                        className="ui-input"
                        type="search"
                        placeholder="筛选项目"
                        value={keyword}
                        onChange={(event) => setKeyword(event.target.value)}
                    />
                </div>
                <div className="nav-list">
                    {filtered.map((item) => (
                        <div
                            key={item.id}
                            className={`nav-item project-list__item ${activeId === item.id ? "active" : ""}`}
                            title={`${item.name}${item.description ? `\n${item.description}` : ""}`}
                            onClick={() => navigate(projectPath(item.id))}
                        >
                            {item.visibility === "public" ? <AppIcon name="folder" /> : <AppIcon name="lock" />}
                            <span className="ellipsis">{item.name}</span>
                            <span className="nav-item__count">{counts[item.id] ?? 0}</span>
                        </div>
                    ))}
                </div>
                {filtered.length === 0 && <EmptyHolder text="没有匹配的项目" />}
                <div ref={sentinelRef} className="project-list__more">
                    {projectLoadingMore ? (
                        <LoadingHolder text="加载中..." />
                    ) : !projectHasMore && projectTotal > 0 ? (
                        `共 ${projectTotal} 个项目`
                    ) : (
                        ""
                    )}
                </div>
            </div>
        </>
    );
};
