import { api } from "@/api";
import type { IconItem, IconPatch, Project } from "@/types";
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
    detailLoading: boolean; // 项目详情加载中
    detailError: string | null; // 项目详情加载错误
    loadProjects: () => Promise<Project[]>; // 加载全部项目（搜索时使用）
    loadProjectPage: () => Promise<void>; // 加载项目列表首页
    loadMoreProjects: () => Promise<void>; // 加载下一页项目
    loadProject: (projectId: string) => Promise<Project | null>; // 加载项目详情与图标
    refreshCurrent: () => Promise<void>; // 重新拉取当前项目
    setCurrent: (project: Project | null) => void; // 直接替换当前项目（更新设置后）
    updateIcons: (icons: IconPatch[]) => void; // 局部更新图标列表
    setIconsOrder: (orderedIds: string[]) => void; // 按给定顺序重排本地图标
    removeIcons: (iconIds: string[]) => void; // 局部删除
    reset: () => void; // 清空状态
}

export const useProjectStore = create<ProjectState>((set, get) => ({
    projects: [],
    projectTotal: 0,
    projectHasMore: false,
    projectLoadingMore: false,
    listLoading: false,
    listLoaded: false,
    current: null,
    icons: [],
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
    loadProject: async (projectId) => {
        set({ detailLoading: true, detailError: null });
        try {
            const project = await api.projects.getProject(projectId);
            const icons = await api.icons.listIcons(projectId);
            set({ current: project, icons, detailLoading: false });
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
        set({ current: project, icons });
    },
    setCurrent: (project) => set({ current: project }),
    updateIcons: (updated) => {
        const map = new Map(updated.map((icon) => [icon.id, icon]));
        set({ icons: get().icons.map((icon) => (map.has(icon.id) ? { ...icon, ...map.get(icon.id) } : icon)) });
    },
    setIconsOrder: (orderedIds) => {
        const map = new Map(get().icons.map((icon) => [icon.id, icon]));
        const next = orderedIds.map((id) => map.get(id)).filter((icon): icon is IconItem => Boolean(icon));
        get().icons.forEach((icon) => {
            if (!orderedIds.includes(icon.id)) {
                next.push(icon);
            }
        });
        set({ icons: next });
    },
    removeIcons: (iconIds) => {
        const ids = new Set(iconIds);
        set({ icons: get().icons.filter((icon) => !ids.has(icon.id)) });
    },
    reset: () =>
        set({
            projects: [],
            projectTotal: 0,
            projectHasMore: false,
            projectLoadingMore: false,
            listLoaded: false,
            current: null,
            icons: [],
            detailError: null,
        }),
}));
