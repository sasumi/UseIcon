import { api } from "@/api";
import type { LibraryPageResult } from "@/api/library";
import type { FavoriteIcon, LibraryCategoryCount, LibraryIcon } from "@/types";
import { favoriteKeyOf } from "@/utils/iconDedupe";
import { create } from "zustand";

/** 公共库每页条数（滚动加载） */
const LIBRARY_PAGE_SIZE = 60;

/** 刷新时一次最多重新拉取的条数（与后台 page_size 上限一致） */
const LIBRARY_PAGE_MAX = 200;

/** 公共库列表筛选条件 */
export interface LibraryFilters {
    keyword?: string; // 搜索关键词
    category?: string; // 分类
}

interface LibraryState {
    icons: LibraryIcon[]; // 当前筛选下已加载的公共库图标
    total: number; // 当前筛选下的图标总数
    hasMore: boolean; // 是否还有未加载的图标
    categories: LibraryCategoryCount[]; // 全库分类统计（不受筛选影响）
    keyword: string; // 已加载列表的搜索关键词
    category: string; // 已加载列表的分类
    canEdit: boolean; // 当前用户是否可维护公共库
    favorites: FavoriteIcon[]; // 个人收藏
    loadingMore: boolean; // 加载下一页中
    loadLibrary: (filters?: LibraryFilters) => Promise<LibraryPageResult>; // 按筛选加载第一页（失败抛错，由页面 useAsync 接管）
    loadMoreLibrary: (filters?: LibraryFilters) => Promise<void>; // 加载下一页（失败抛错）
    refreshLibrary: (filters?: LibraryFilters) => Promise<void>; // 重新加载已加载的部分（增删改后，失败抛错）
    fetchFavorites: () => Promise<FavoriteIcon[]>; // 加载个人收藏（失败抛错，由页面 useAsync 接管）
    addFavorite: (input: Parameters<typeof api.favorites.addFavorite>[0]) => Promise<FavoriteIcon>; // 添加收藏
    addFavorites: (
        inputs: Parameters<typeof api.favorites.addFavorite>[0][],
    ) => Promise<{ added: number; ignored: number }>; // 批量收藏（自动去重，返回新增与忽略数量）
    updateFavorite: (favoriteId: string, patch: Partial<Pick<FavoriteIcon, "className" | "category" | "tags">>) => Promise<void>; // 更新收藏
    removeFavorite: (favoriteId: string) => Promise<void>; // 删除收藏
    findFavoriteByRefId: (refId: string) => FavoriteIcon | undefined; // 按来源图标 ID 查收藏
}

/** 请求序号：筛选切换时丢弃旧请求的返回 */
let requestToken = 0;

/** 收藏写操作后重新拉取列表：刷新失败不影响本次写入结果，列表下次加载会自愈 */
const reloadFavorites = (get: () => LibraryState): Promise<void> =>
    get()
        .fetchFavorites()
        .then(
            () => undefined,
            () => undefined,
        );

const initialState: Pick<
    LibraryState,
    "icons" | "total" | "hasMore" | "categories" | "keyword" | "category" | "canEdit" | "favorites" | "loadingMore"
> = {
    icons: [],
    total: 0,
    hasMore: false,
    categories: [],
    keyword: "",
    category: "",
    canEdit: false,
    favorites: [],
    loadingMore: false,
};

export const useLibraryStore = create<LibraryState>((set, get) => ({
    ...initialState,
    loadLibrary: async (filters) => {
        const keyword = (filters?.keyword ?? "").trim();
        const category = filters?.category ?? "";
        const changed = keyword !== get().keyword || category !== get().category;
        const token = ++requestToken;
        set({
            keyword,
            category,
            loadingMore: false,
            // 筛选变化时先清空，避免旧图标残留在新结果里；同筛选重进页面则保留旧列表
            ...(changed ? { icons: [], total: 0, hasMore: false } : {}),
        });
        const page = await api.library.listLibraryIconsPaged({ offset: 0, limit: LIBRARY_PAGE_SIZE, keyword, category });
        if (token === requestToken) {
            set({
                icons: page.items,
                total: page.total,
                hasMore: page.hasMore,
                canEdit: page.canEdit,
                categories: page.categories,
            });
        }
        return page;
    },
    loadMoreLibrary: async (filters) => {
        const { icons, hasMore, loadingMore } = get();
        if (!hasMore || loadingMore) {
            return;
        }
        const token = requestToken;
        set({ loadingMore: true });
        try {
            const page = await api.library.listLibraryIconsPaged({
                offset: icons.length,
                limit: LIBRARY_PAGE_SIZE,
                keyword: (filters?.keyword ?? "").trim(),
                category: filters?.category ?? "",
            });
            if (token !== requestToken) {
                return;
            }
            const merged = new Map(get().icons.map((icon) => [icon.iconId, icon]));
            page.items.forEach((icon) => merged.set(icon.iconId, icon));
            set({
                icons: Array.from(merged.values()),
                total: page.total,
                hasMore: page.hasMore,
                canEdit: page.canEdit,
                categories: page.categories,
            });
        } finally {
            if (token === requestToken) {
                set({ loadingMore: false });
            }
        }
    },
    refreshLibrary: async (filters) => {
        const { icons } = get();
        const limit = Math.min(Math.max(icons.length, LIBRARY_PAGE_SIZE), LIBRARY_PAGE_MAX);
        const token = ++requestToken;
        set({ loadingMore: false });
        const page = await api.library.listLibraryIconsPaged({
            offset: 0,
            limit,
            keyword: (filters?.keyword ?? "").trim(),
            category: filters?.category ?? "",
        });
        if (token !== requestToken) {
            return;
        }
        set({
            icons: page.items,
            total: page.total,
            hasMore: page.hasMore,
            canEdit: page.canEdit,
            categories: page.categories,
        });
    },
    fetchFavorites: async () => {
        const favorites = await api.favorites.listFavorites();
        set({ favorites });
        return favorites;
    },
    addFavorite: async (input) => {
        // 收藏去重：同一来源图标（refId 优先）已收藏时直接复用，避免重复记录
        const key = favoriteKeyOf(input);
        const existed = get().favorites.find((item) => favoriteKeyOf(item) === key);
        if (existed) {
            return existed;
        }
        const favorite = await api.favorites.addFavorite(input);
        await reloadFavorites(get);
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
        await reloadFavorites(get);
        const added = results.filter((item) => item.status === "fulfilled").length;
        if (added === 0) {
            const failed = results.find((item): item is PromiseRejectedResult => item.status === "rejected");
            throw failed?.reason ?? new Error("收藏失败");
        }
        return { added, ignored: ignored + (pending.length - added) };
    },
    updateFavorite: async (favoriteId, patch) => {
        await api.favorites.updateFavorite(favoriteId, patch);
        await reloadFavorites(get);
    },
    removeFavorite: async (favoriteId) => {
        await api.favorites.removeFavorite(favoriteId);
        await reloadFavorites(get);
    },
    findFavoriteByRefId: (refId) => get().favorites.find((item) => item.refId === refId),
}));

