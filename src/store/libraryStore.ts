import { api } from "@/api";
import type { FavoriteIcon, LibraryIcon } from "@/types";
import { create } from "zustand";

interface LibraryState {
    icons: LibraryIcon[]; // 公共库图标
    favorites: FavoriteIcon[]; // 个人收藏
    loading: boolean; // 是否加载中
    loaded: boolean; // 是否已加载
    fetchAll: () => Promise<void>; // 加载公共库与收藏
    refreshFavorites: () => Promise<void>; // 仅刷新收藏
    addFavorite: (input: Parameters<typeof api.favorites.addFavorite>[0]) => Promise<FavoriteIcon>; // 添加收藏
    updateFavorite: (favoriteId: string, patch: Partial<Pick<FavoriteIcon, "className" | "tags">>) => Promise<void>; // 更新收藏
    removeFavorite: (favoriteId: string) => Promise<void>; // 删除收藏
    findFavoriteByLibraryId: (libraryId: string) => FavoriteIcon | undefined; // 按公共库 ID 查收藏
}

// 并发调用复用同一个请求，避免父/子组件同时挂载时后一次调用被直接跳过
let fetchPromise: Promise<void> | null = null;

export const useLibraryStore = create<LibraryState>((set, get) => ({
    icons: [],
    favorites: [],
    loading: false,
    loaded: false,
    fetchAll: () => {
        if (fetchPromise) {
            return fetchPromise;
        }
        set({ loading: true });
        fetchPromise = Promise.all([api.favorites.listLibraryIcons(), api.favorites.listFavorites()])
            .then(([icons, favorites]) => set({ icons, favorites, loaded: true }))
            .catch((error: unknown) => {
                console.warn("加载公共库失败", error);
            })
            .finally(() => {
                fetchPromise = null;
                set({ loading: false });
            });
        return fetchPromise;
    },
    refreshFavorites: async () => {
        const favorites = await api.favorites.listFavorites();
        set({ favorites });
    },
    addFavorite: async (input) => {
        const favorite = await api.favorites.addFavorite(input);
        await get().refreshFavorites();
        return favorite;
    },
    updateFavorite: async (favoriteId, patch) => {
        await api.favorites.updateFavorite(favoriteId, patch);
        await get().refreshFavorites();
    },
    removeFavorite: async (favoriteId) => {
        await api.favorites.removeFavorite(favoriteId);
        await get().refreshFavorites();
    },
    findFavoriteByLibraryId: (libraryId) => get().favorites.find((item) => item.libraryId === libraryId),
}));

/** 所有收藏中出现过的标签 */
export const collectFavoriteTags = (favorites: FavoriteIcon[]): string[] =>
    Array.from(new Set(favorites.flatMap((item) => item.tags))).sort((a, b) => a.localeCompare(b, "zh-CN"));
