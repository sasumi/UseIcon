import { CART_STORAGE_KEY } from "@/config";
import type { IconInput } from "@/types";
import { create } from "zustand";

/** 采集条目 */
export interface CartItem {
    key: string; // 唯一键
    className: string; // 图标类名
    tags: string[]; // 标签
    svg: string; // SVG 源码
    source: "library" | "project"; // 来源
    refId?: string; // 来源图标 ID（icon_id）
    projectId?: string; // 来源项目
}

interface CartState {
    items: CartItem[]; // 车内条目
    open: boolean; // 面板是否展开
    setOpen: (open: boolean) => void; // 控制面板
    add: (item: CartItem) => boolean; // 采集，返回是否新增
    remove: (key: string) => void; // 移除
    toggle: (item: CartItem) => void; // 加入 / 移出
    clear: () => void; // 清空
    has: (key: string) => boolean; // 是否已在车内
}

/** 读取采集（兼容旧版 name / title / libraryId / iconId 结构） */
const readCart = (): CartItem[] => {
    try {
        const raw = localStorage.getItem(CART_STORAGE_KEY);
        const list = raw
            ? (JSON.parse(raw) as (CartItem & { name?: string; title?: string; libraryId?: string; iconId?: string })[])
            : [];
        if (!Array.isArray(list)) {
            return [];
        }
        return list.map((item) => ({
            key: item.key,
            className: item.className || item.name || "icon",
            tags: Array.isArray(item.tags) ? item.tags : [],
            svg: item.svg,
            source: item.source,
            refId: item.refId || item.libraryId || item.iconId,
            projectId: item.projectId,
        }));
    } catch {
        return [];
    }
};

const persistCart = (items: CartItem[]): void => {
    try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
        // 忽略 storage 异常
    }
};

export const useCartStore = create<CartState>((set, get) => ({
    items: readCart(),
    open: false,
    setOpen: (open) => set({ open }),
    add: (item) => {
        if (get().items.some((existing) => existing.key === item.key)) {
            return false;
        }
        const items = [...get().items, item];
        persistCart(items);
        set({ items });
        return true;
    },
    remove: (key) => {
        const items = get().items.filter((item) => item.key !== key);
        persistCart(items);
        set({ items });
    },
    toggle: (item) => {
        if (get().items.some((existing) => existing.key === item.key)) {
            get().remove(item.key);
        } else {
            get().add(item);
        }
    },
    clear: () => {
        persistCart([]);
        set({ items: [] });
    },
    has: (key) => get().items.some((item) => item.key === key),
}));

/** 公共库图标 → 采集条目 */
export const cartItemFromLibrary = (icon: { iconId: string; className: string; tags: string[]; svg: string }): CartItem => ({
    key: `library:${icon.iconId}`,
    className: icon.className,
    tags: icon.tags,
    svg: icon.svg,
    source: "library",
    refId: icon.iconId,
});

/** 项目图标 → 采集条目 */
export const cartItemFromProjectIcon = (projectId: string, icon: { iconId: string; className: string; tags: string[]; svg: string }): CartItem => ({
    key: `project:${projectId}:${icon.iconId}`,
    className: icon.className,
    tags: icon.tags,
    svg: icon.svg,
    source: "project",
    projectId,
    refId: icon.iconId,
});

/** 收藏项 → 采集条目 */
export const cartItemFromFavorite = (
    favorite: { id: string; className: string; tags: string[]; svg: string; source: "library" | "project"; refId?: string; projectId?: string },
): CartItem => ({
    key: favorite.refId ? `ref:${favorite.refId}` : `favorite:${favorite.id}`,
    className: favorite.className,
    tags: favorite.tags,
    svg: favorite.svg,
    source: favorite.source,
    refId: favorite.refId,
    projectId: favorite.projectId,
});

/** 采集条目 → 新建图标入参（ref_id 记录来源图标的 icon_id） */
export const cartItemsToInputs = (items: CartItem[]): IconInput[] =>
    items.map((item) => ({
        className: item.className,
        svg: item.svg,
        tags: item.tags,
        refId: item.refId,
    }));
