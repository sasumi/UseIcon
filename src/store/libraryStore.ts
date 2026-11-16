import { api } from "@/api";
import type { FavoriteIcon, LibraryCategoryCount, LibraryIcon } from "@/types";
import { favoriteKeyOf } from "@/utils/iconDedupe";
import { create } from "zustand";

/** 公共库每页条数（滚动加载） */
const LIBRARY_PAGE_SIZE = 60;

/** 刷新时一次最多重新拉取的条数（与后台 page_size 上限一致） */
const LIBRARY_PAGE_MAX = 200;

interface LibraryState {
    icons: LibraryIcon[]; // 当前筛选下已加载的公共库图标
    total: number; // 当前筛选下的图标总数
    hasMore: boolean; // 是否还有未加载的图标
    categories: LibraryCategoryCount[]; // 全库分类统计（不受筛选影响）
    keyword: string; // 当前生效的搜索关键词
    category: string; // 当前生效的分类
    canEdit: boolean; // 当前用户是否可维护公共库
    favorites: FavoriteIcon[]; // 个人收藏
    loading: boolean; // 首屏（或筛选后）加载中
    loadingMore: boolean; // 加载下一页中
    loaded: boolean; // 是否已加载过
    loadLibrary: (filters?: { keyword?: string; category?: string }) => Promise<void>; // 按筛选加载第一页
    loadMoreLibrary: () => Promise<void>; // 加载下一页
    refreshLibrary: () => Promise<void>; // 重新加载已加载的部分（增删改后）
    fetchFavorites: () => Promise<void>; // 加载个人收藏
    addFavorite: (input: Parameters<typeof api.favorites.addFavorite>[0]) => Promise<FavoriteIcon>; // 添加收藏
    addFavorites: (
        inputs: Parameters<typeof api.favorites.addFavorite>[0][],
    ) => Promise<{ added: number; ignored: number }>; // 批量收藏（自动去重，返回新增与忽略数量）
    updateFavorite: (favoriteId: string, patch: Partial<Pick<FavoriteIcon, "className" | "category" | "tags">>) => Promise<void>; // 更新收藏
    removeFavorite: (favoriteId: string) => Promise<void>; // 删除收藏
    findFavoriteByLibraryId: (libraryId: string) => FavoriteIcon | undefined; // 按公共库 ID 查收藏
}

/** 请求序号：筛选切换时丢弃旧请求的返回 */
let requestToken = 0;

const initialState: Pick<
    LibraryState,
    "icons" | "total" | "hasMore" | "categories" | "keyword" | "category" | "canEdit" | "favorites" | "loading" | "loadingMore" | "loaded"
> = {
    icons: [],
    total: 0,
    hasMore: false,
    categories: [],
    keyword: "",
    category: "",
    canEdit: false,
    favorites: [],
    loading: false,
    loadingMore: false,
    loaded: false,
};

export const useLibraryStore = create<LibraryState>((set, get) => ({
    ...initialState,
    loadLibrary: async (filters) => {
        const keyword = (filters?.keyword ?? get().keyword).trim();
        const category = filters?.category ?? get().category;
        const changed = keyword !== get().keyword || category !== get().category;
        const token = ++requestToken;
        set({
            keyword,
            category,
            loading: true,
            loadingMore: false,
            // 筛选变化时先清空，避免旧图标残留在新结果里
            ...(changed ? { icons: [], total: 0, hasMore: false } : {}),
        });
        try {
            const page = await api.library.listLibraryIconsPaged({ offset: 0, limit: LIBRARY_PAGE_SIZE, keyword, category });
            if (token !== requestToken) {
                return;
            }
            set({
                icons: page.items,
                total: page.total,
                hasMore: page.hasMore,
                canEdit: page.canEdit,
                categories: page.categories,
                loaded: true,
            });
        } catch (error) {
            console.warn("加载公共库失败", error);
        } finally {
            if (token === requestToken) {
                set({ loading: false });
            }
        }
    },
    loadMoreLibrary: async () => {
        const { icons, hasMore, loadingMore, loading, keyword, category } = get();
        if (!hasMore || loadingMore || loading) {
            return;
        }
        const token = requestToken;
        set({ loadingMore: true });
        try {
            const page = await api.library.listLibraryIconsPaged({
                offset: icons.length,
                limit: LIBRARY_PAGE_SIZE,
                keyword,
                category,
            });
            if (token !== requestToken) {
                return;
            }
            const merged = new Map(get().icons.map((icon) => [icon.id, icon]));
            page.items.forEach((icon) => merged.set(icon.id, icon));
            set({
                icons: Array.from(merged.values()),
                total: page.total,
                hasMore: page.hasMore,
                canEdit: page.canEdit,
                categories: page.categories,
            });
        } catch (error) {
            console.warn("加载公共库下一页失败", error);
        } finally {
            if (token === requestToken) {
                set({ loadingMore: false });
            }
        }
    },
    refreshLibrary: async () => {
        const { icons, keyword, category } = get();
        const limit = Math.min(Math.max(icons.length, LIBRARY_PAGE_SIZE), LIBRARY_PAGE_MAX);
        const token = ++requestToken;
        set({ loading: icons.length === 0, loadingMore: false });
        try {
            const page = await api.library.listLibraryIconsPaged({ offset: 0, limit, keyword, category });
            if (token !== requestToken) {
                return;
            }
            set({
                icons: page.items,
                total: page.total,
                hasMore: page.hasMore,
                canEdit: page.canEdit,
                categories: page.categories,
                loaded: true,
            });
        } catch (error) {
            console.warn("刷新公共库失败", error);
        } finally {
            if (token === requestToken) {
                set({ loading: false });
            }
        }
    },
    fetchFavorites: async () => {
        try {
            const favorites = await api.favorites.listFavorites();
            set({ favorites });
        } catch (error) {
            console.warn("加载收藏失败", error);
        }
    },
    addFavorite: async (input) => {
        // 收藏去重：同一图标（公共库 ID 优先）已收藏时直接复用，避免重复记录
        const key = favoriteKeyOf(input);
        const existed = get().favorites.find((item) => favoriteKeyOf(item) === key);
        if (existed) {
            return existed;
        }
        const favorite = await api.favorites.addFavorite(input);
        await get().fetchFavorites();
        return favorite;
    },
    addFavorites: async (inputs) => {
        // 先按已有收藏与本批重复去重，只提交新增的图标
        const keys = new Set(get().favorites.map(favoriteKeyOf));
        const pending: Parameters<typeof api.favorites.addFavorite>[0][] = [];
        inputs.forEach((input) => {
            const key = favoriteKeyOf(input);
            if (keys.has(key)) {
                return;
            }
            keys.add(key);
            pending.push(input);
        });
        const ignored = inputs.length - pending.length;
        if (pending.length === 0) {
            return { added: 0, ignored };
        }
        const results = await Promise.allSettled(pending.map((input) => api.favorites.addFavorite(input)));
        await get().fetchFavorites();
        const added = results.filter((item) => item.status === "fulfilled").length;
        if (added === 0) {
            const failed = results.find((item): item is PromiseRejectedResult => item.status === "rejected");
            throw failed?.reason ?? new Error("收藏失败");
        }
        return { added, ignored: ignored + (pending.length - added) };
    },
    updateFavorite: async (favoriteId, patch) => {
        await api.favorites.updateFavorite(favoriteId, patch);
        await get().fetchFavorites();
    },
    removeFavorite: async (favoriteId) => {
        await api.favorites.removeFavorite(favoriteId);
        await get().fetchFavorites();
    },
    findFavoriteByLibraryId: (libraryId) => get().favorites.find((item) => item.libraryId === libraryId),
}));

