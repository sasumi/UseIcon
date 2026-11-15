import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DropdownMenu, Select, Toast } from "minreact-ui";
import type { MenuEntry } from "minreact-ui";
import { api } from "@/api";
import { PROJECT_SORT_STORAGE_PREFIX } from "@/config";
import { extModePath, navigate, projectPath } from "@/router/useRoute";
import { useAuthStore } from "@/store/authStore";
import { openLoginDialog } from "@/store/loginDialogStore";
import { cartItemFromProjectIcon, useCartStore } from "@/store/cartStore";
import { useLibraryStore } from "@/store/libraryStore";
import { useProjectStore } from "@/store/projectStore";
import type { IconItem } from "@/types";
import { copyText, downloadSvg } from "@/utils/download";
import { getProjectAccess } from "@/utils/permission";
import { renderIconCode } from "@/utils/svg";
import { AppIcon } from "@/components/common/AppIcon";
import { EmptyState } from "@/components/common/EmptyState";
import { SidePanel } from "@/components/common/SidePanel";
import { BatchOptimizeDialog } from "@/components/project/BatchOptimizeDialog";
import { BatchRenameDialog } from "@/components/project/BatchRenameDialog";
import { ExportMenu } from "@/components/project/ExportMenu";
import { IconCard } from "@/components/project/IconCard";
import { DisplayControl } from "@/components/library/DisplayPanel";
import { IconDetailDialog } from "@/components/project/IconDetailDialog";
import { PickLibraryDialog } from "@/components/project/PickLibraryDialog";
import { ProjectFormDialog } from "@/components/project/ProjectFormDialog";
import { ProjectSettingsDialog } from "@/components/project/ProjectSettingsDialog";
import { UploadDialog } from "@/components/project/UploadDialog";

type SortMode = "default" | "name-asc" | "name-desc" | "custom";

const SORT_ITEMS: MenuEntry[] = [
    { value: "default", label: "默认顺序", icon: <AppIcon name="layers" /> },
    { value: "name-asc", label: "名称 A → Z", icon: <AppIcon name="arrow-down" /> },
    { value: "name-desc", label: "名称 Z → A", icon: <AppIcon name="arrow-up" /> },
    { value: "custom", label: "自定义排序", icon: <AppIcon name="move" /> },
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

/** 项目工作区：侧栏项目列表 + 主区图标管理（未指定项目时默认打开第一个） */
export const ProjectPage = ({ projectId }: { projectId?: string }) => {
    const user = useAuthStore((state) => state.user);
    const projects = useProjectStore((state) => state.projects);
    const listLoading = useProjectStore((state) => state.listLoading);
    const loadProjectPage = useProjectStore((state) => state.loadProjectPage);
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
    const [selected, setSelected] = useState<string[]>([]);
    const [createOpen, setCreateOpen] = useState(false);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [pickOpen, setPickOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [optimizeOpen, setOptimizeOpen] = useState(false);
    const [renameOpen, setRenameOpen] = useState(false);
    const [detail, setDetail] = useState<IconItem | null>(null);
    const [sortMode, setSortMode] = useState<SortMode>("default");
    const [dragIconId, setDragIconId] = useState<string | null>(null);

    const favorites = useLibraryStore((state) => state.favorites);
    const addFavorite = useLibraryStore((state) => state.addFavorite);
    const removeFavorite = useLibraryStore((state) => state.removeFavorite);
    const cartItems = useCartStore((state) => state.items);
    const toggleCart = useCartStore((state) => state.toggle);
    const setCartOpen = useCartStore((state) => state.setOpen);

    useEffect(() => {
        if (!projectId) {
            void loadProjectPage();
        }
    }, [projectId, loadProjectPage]);

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
            return [...matched].sort((a, b) => a.className.localeCompare(b.className));
        }
        if (sortMode === "name-desc") {
            return [...matched].sort((a, b) => b.className.localeCompare(a.className));
        }
        return matched;
    }, [icons, keyword, tag, sortMode]);

    const selectedIcons = useMemo(() => icons.filter((icon) => selected.includes(icon.id)), [icons, selected]);
    const canSort = sortMode === "custom" && access.canEdit;
    const template = project?.codeTemplate || "";
    const iconSize = project?.iconSize || 24;
    const activeProjectId = project?.id || projectId || "";

    const codeFor = (icon: IconItem): string => renderIconCode(template, icon, iconSize);

    const favoriteOf = (icon: IconItem) => favorites.find((item) => item.projectId === activeProjectId && item.className === icon.className);
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
            svg: icon.svg,
            tags: icon.tags,
            source: "project",
            projectId,
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
    const dropOnIcon = (targetId: string) => {
        if (!dragIconId || dragIconId === targetId) {
            setDragIconId(null);
            return;
        }
        const ids = icons.map((icon) => icon.id);
        const from = ids.indexOf(dragIconId);
        const to = ids.indexOf(targetId);
        setDragIconId(null);
        if (from < 0 || to < 0) {
            return;
        }
        ids.splice(to, 0, ...ids.splice(from, 1));
        useProjectStore.getState().setIconsOrder(ids);
        void api.icons.reorderIcons(activeProjectId, ids).catch((err: unknown) => {
            Toast.showError(err instanceof Error ? err.message : "排序保存失败");
            void refreshCurrent();
        });
    };

    const addSelectedToCart = () => {
        selectedIcons.forEach((icon) => {
            const item = cartItemFromProjectIcon(activeProjectId, icon);
            if (!cartItems.some((entry) => entry.key === item.key)) {
                toggleCart(item);
            }
        });
        setCartOpen(true);
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
            title: "删除图标",
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
                        <div className="ui-loading">正在加载项目...</div>
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
                    <EmptyState text={error} icon="warning">
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
                    <div className="ui-loading">正在加载项目...</div>
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
                    <EmptyState text="你没有访问该项目的权限（内部项目仅成员可见）" icon="lock" />
                </div>
                {createDialog}
            </>
        );
    }

    return (
        <>
            {sidebar}

            <div className="content-panel padded">
                <div className="project-header">
                    <div className="project-header__main">
                        <div className="project-header__title">
                            <h2>{project.name}</h2>
                            <span className={`ui-badge ${project.visibility === "public" ? "public" : "viewer"}`}>
                                {project.visibility === "public" ? "公开项目" : "内部项目"}
                            </span>
                            {project.allowGuest && <span className="ui-badge guest">允许游客</span>}
                        </div>
                        <p className="project-header__desc">{project.description || "暂无描述"}</p>
                    </div>
                    <div className="project-header__actions">
                        <button className="ui-btn small" type="button" onClick={openExtMode}>
                            <AppIcon name="monitor" />
                            ExtMode
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
                            <button className="ui-btn small" type="button" onClick={() => setSettingsOpen(true)}>
                                <AppIcon name="settings" />
                                设置
                            </button>
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
                            <button className="ui-btn small" type="button" onClick={addSelectedToCart}>
                                <AppIcon name="cart" />
                                采集
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
                    <EmptyState text="没有匹配当前筛选条件的图标" icon="search" />
                ) : (
                    <ul className={`icon-grid ${sortMode === "custom" ? "is-sortable" : ""}`}>
                        {filtered.map((icon) => (
                            <li
                                key={icon.id}
                                className={dragIconId === icon.id ? "dragging" : ""}
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
                                }}
                                onDrop={(event) => {
                                    if (!canSort) {
                                        return;
                                    }
                                    event.preventDefault();
                                    dropOnIcon(icon.id);
                                }}
                                onDragEnd={() => setDragIconId(null)}
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
                                            title: "删除图标",
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
            <ProjectSettingsDialog
                open={settingsOpen}
                setOpen={setSettingsOpen}
                project={project}
                onUpdated={(updated) => setCurrent(updated)}
                onDeleted={() => {
                    void useProjectStore.getState().loadProjects();
                    navigate("/projects");
                }}
            />
            <IconDetailDialog
                open={Boolean(detail)}
                setOpen={(open) => !open && setDetail(null)}
                icon={detail}
                template={template}
                size={iconSize}
                canEdit={access.canEdit}
                favorite={detail ? Boolean(favoriteOf(detail)) : false}
                inCart={detail ? inCart(detail) : false}
                onFavorite={() => detail && toggleIconFavorite(detail)}
                onCart={() => detail && toggleIconCart(detail)}
                onUpdated={(updated) => updateIcons([updated])}
                onDeleted={(iconId) => removeIcons([iconId])}
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
    const loadProjects = useProjectStore((state) => state.loadProjects);
    const loadProjectPage = useProjectStore((state) => state.loadProjectPage);
    const loadMoreProjects = useProjectStore((state) => state.loadMoreProjects);
    const [keyword, setKeyword] = useState("");
    const [counts, setCounts] = useState<Record<string, number>>({});
    const sentinelRef = useRef<HTMLDivElement | null>(null);

    // 直接打开项目详情时列表可能尚未加载（例如从 ExtMode 返回）
    useEffect(() => {
        if (projects.length === 0 && !listLoading) {
            void loadProjectPage();
        }
    }, [projects.length, listLoading, loadProjectPage]);

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
                    <input className="ui-input" placeholder="筛选项目" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
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
                {filtered.length === 0 && <p className="ui-note side-tip">没有匹配的项目</p>}
                <div ref={sentinelRef} className="project-list__more">
                    {projectLoadingMore ? "加载中..." : !projectHasMore && projectTotal > 0 ? `共 ${projectTotal} 个项目` : ""}
                </div>
            </div>
        </>
    );
};
