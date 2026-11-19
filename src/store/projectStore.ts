import { api } from "@/api";
import type { IconItem, IconPatch, Project } from "@/types";
import { broadcastProjectIconsChanged } from "@/utils/projectSync";
import { create } from "zustand";

/** 侧栏项目列表每页条数 */
const PROJECT_PAGE_SIZE = 12;

interface ProjectState {
    projects: Project[]; // 当前用户可见的项目（分页累积）
    projectTotal: number; // 可见项目总数
    projectHasMore: boolean; // 是否还有未加载的项目
    projectLoadingMore: boolean; // 是否正在加载下一页
    listLoading: boolean; // 首页加载中
    listLoaded: boolean; // 项目列表是否已加载过（空列表时也不必重复请求）
    current: Project | null; // 当前打开的项目
    icons: IconItem[]; // 当前项目的图标
    iconCounts: Record<string, number>; // 各项目图标数量（侧栏展示，随增删联动）
    detailLoading: boolean; // 项目详情加载中
    detailError: string | null; // 项目详情加载错误
    loadProjects: () => Promise<Project[]>; // 加载全部项目（搜索时使用）
    loadProjectPage: () => Promise<void>; // 加载项目列表首页
    loadMoreProjects: () => Promise<void>; // 加载下一页项目
    loadIconCounts: (projectIds: string[]) => Promise<void>; // 拉取项目图标数量
    refreshIconCount: (projectId: string) => Promise<void>; // 重新拉取单个项目的图标数量
    loadProject: (projectId: string) => Promise<Project | null>; // 加载项目详情与图标
    refreshCurrent: () => Promise<void>; // 重新拉取当前项目
    setCurrent: (project: Project | null) => void; // 直接替换当前项目（更新设置后）
    upsertProject: (project: Project) => void; // 项目信息变化后同步列表与当前项目
    removeProject: (projectId: string) => void; // 删除项目后同步列表、数量与当前项目
    addIconCount: (projectId: string, delta: number) => void; // 增删图标后同步侧栏数量
    updateIcons: (icons: IconPatch[]) => void; // 局部更新图标列表
    setIconsOrder: (orderedIds: string[]) => void; // 按给定顺序重排本地图标
    removeIcons: (iconIds: string[]) => void; // 局部删除
    reset: () => void; // 清空状态
}

/** 侧栏数量请求序号：列表变化时丢弃旧请求的返回 */
let iconCountToken = 0;

export const useProjectStore = create<ProjectState>((set, get) => ({
    projects: [],
    projectTotal: 0,
    projectHasMore: false,
    projectLoadingMore: false,
    listLoading: false,
    listLoaded: false,
    current: null,
    icons: [],
    iconCounts: {},
    detailLoading: false,
    detailError: null,
    loadProjects: async () => {
        set({ listLoading: true });
        try {
            const projects = await api.projects.listProjects();
            set({ projects, projectTotal: projects.length, projectHasMore: false, listLoaded: true });
            return projects;
        } finally {
            set({ listLoading: false });
        }
    },
    loadProjectPage: async () => {
        set({ listLoading: true });
        try {
            const page = await api.projects.listProjectsPaged({ offset: 0, limit: PROJECT_PAGE_SIZE });
            set({ projects: page.items, projectTotal: page.total, projectHasMore: page.hasMore, listLoaded: true });
        } finally {
            set({ listLoading: false });
        }
    },
    loadMoreProjects: async () => {
        const { projects, projectHasMore, projectLoadingMore } = get();
        if (!projectHasMore || projectLoadingMore) {
            return;
        }
        set({ projectLoadingMore: true });
        try {
            const page = await api.projects.listProjectsPaged({ offset: projects.length, limit: PROJECT_PAGE_SIZE });
            const merged = new Map(get().projects.map((item) => [item.id, item]));
            page.items.forEach((item) => merged.set(item.id, item));
            set({ projects: Array.from(merged.values()), projectTotal: page.total, projectHasMore: page.hasMore });
        } finally {
            set({ projectLoadingMore: false });
        }
    },
    loadIconCounts: async (projectIds) => {
        const token = ++iconCountToken;
        if (projectIds.length === 0) {
            set({ iconCounts: {} });
            return;
        }
        const counts = await Promise.all(
            projectIds.map((projectId) =>
                api.icons
                    .listIcons(projectId)
                    .then((list) => list.length)
                    .catch(() => 0),
            ),
        );
        if (token !== iconCountToken) {
            return;
        }
        const map: Record<string, number> = {};
        projectIds.forEach((projectId, index) => {
            map[projectId] = counts[index];
        });
        set({ iconCounts: map });
    },
    refreshIconCount: async (projectId) => {
        const icons = await api.icons.listIcons(projectId);
        set({ iconCounts: { ...get().iconCounts, [projectId]: icons.length } });
    },
    loadProject: async (projectId) => {
        set({ detailLoading: true, detailError: null });
        try {
            const project = await api.projects.getProject(projectId);
            const icons = await api.icons.listIcons(projectId);
            set({
                current: project,
                icons,
                iconCounts: { ...get().iconCounts, [projectId]: icons.length },
                detailLoading: false,
            });
            return project;
        } catch (error) {
            set({
                current: null,
                icons: [],
                detailLoading: false,
                detailError: error instanceof Error ? error.message : "项目加载失败",
            });
            return null;
        }
    },
    refreshCurrent: async () => {
        const projectId = get().current?.id;
        if (!projectId) {
            return;
        }
        const project = await api.projects.getProject(projectId);
        const icons = await api.icons.listIcons(projectId);
        set({
            current: project,
            icons,
            iconCounts: { ...get().iconCounts, [projectId]: icons.length },
        });
    },
    setCurrent: (project) => set({ current: project }),
    upsertProject: (project) =>
        set({
            current: get().current?.id === project.id ? project : get().current,
            projects: get().projects.map((item) => (item.id === project.id ? project : item)),
        }),
    removeProject: (projectId) => {
        const { projects, projectTotal, iconCounts, current, icons } = get();
        const removed = projects.some((item) => item.id === projectId);
        const isCurrent = current?.id === projectId;
        set({
            projects: projects.filter((item) => item.id !== projectId),
            projectTotal: Math.max(0, projectTotal - (removed ? 1 : 0)),
            iconCounts: Object.fromEntries(Object.entries(iconCounts).filter(([id]) => id !== projectId)),
            current: isCurrent ? null : current,
            icons: isCurrent ? [] : icons,
            detailError: isCurrent ? null : get().detailError,
        });
    },
    addIconCount: (projectId, delta) => {
        const { iconCounts } = get();
        const known = iconCounts[projectId];
        if (known === undefined) {
            // 数量未知时直接回源，避免按增量算出错误数值
            void get()
                .refreshIconCount(projectId)
                .catch(() => undefined);
        } else {
            set({ iconCounts: { ...iconCounts, [projectId]: Math.max(0, known + delta) } });
        }
        if (delta !== 0) {
            broadcastProjectIconsChanged(projectId);
        }
    },
    updateIcons: (updated) => {
        const map = new Map(updated.map((icon) => [icon.iconId, icon]));
        set({ icons: get().icons.map((icon) => (map.has(icon.iconId) ? { ...icon, ...map.get(icon.iconId) } : icon)) });
        const projectId = get().current?.id;
        if (projectId && updated.length > 0) {
            broadcastProjectIconsChanged(projectId);
        }
    },
    setIconsOrder: (orderedIds) => {
        const map = new Map(get().icons.map((icon) => [icon.iconId, icon]));
        const next = orderedIds.map((id) => map.get(id)).filter((icon): icon is IconItem => Boolean(icon));
        get().icons.forEach((icon) => {
            if (!orderedIds.includes(icon.iconId)) {
                next.push(icon);
            }
        });
        set({ icons: next });
    },
    removeIcons: (iconIds) => {
        const ids = new Set(iconIds);
        const { icons, current, iconCounts } = get();
        const next = icons.filter((icon) => !ids.has(icon.iconId));
        const removed = icons.length - next.length;
        const projectId = current?.id;
        set({
            icons: next,
            ...(projectId && removed > 0
                ? { iconCounts: { ...iconCounts, [projectId]: Math.max(0, (iconCounts[projectId] ?? icons.length) - removed) } }
                : {}),
        });
        if (projectId && removed > 0) {
            broadcastProjectIconsChanged(projectId);
        }
    },
    reset: () => {
        iconCountToken += 1;
        set({
            projects: [],
            projectTotal: 0,
            projectHasMore: false,
            projectLoadingMore: false,
            listLoaded: false,
            current: null,
            icons: [],
            iconCounts: {},
            detailError: null,
        });
    },
}));
