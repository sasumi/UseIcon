import type { FavoriteIcon } from "@/types";
import { normalizeSvg, sanitizeIconName } from "@/utils/svg";
import { iconGetJSON, iconPostJSON } from "./http";

const cleanTags = (tags: string[] | undefined): string[] =>
    Array.from(new Set((tags || []).map((tag) => tag.trim()).filter(Boolean))).slice(0, 12);

/** 当前用户的收藏列表 */
export const listFavorites = (): Promise<FavoriteIcon[]> =>
    iconGetJSON("favorite/getList").then((data) => (data?.list ?? []) as FavoriteIcon[]);

/**
 * 添加收藏：同一公共库图标 / 同一项目图标只保留一条
 */
export const addFavorite = (input: {
    className: string;
    category?: string;
    svg: string;
    tags?: string[];
    source: "library" | "project";
    libraryId?: string;
    projectId?: string;
}): Promise<FavoriteIcon> => {
    let svg: string;
    try {
        svg = normalizeSvg(input.svg);
    } catch {
        return Promise.reject(new Error("SVG 解析失败，请检查文件内容"));
    }
    return iconPostJSON("favorite/add", {
        className: sanitizeIconName(input.className),
        category: (input.category || "").trim(),
        svg,
        tags: cleanTags(input.tags),
        source: input.source,
        libraryId: input.libraryId,
        projectId: input.projectId,
    });
};

/** 更新收藏（类名 / 分类 / 标签） */
export const updateFavorite = (
    favoriteId: string,
    patch: Partial<Pick<FavoriteIcon, "className" | "category" | "tags">>,
): Promise<FavoriteIcon> => {
    const payload: Record<string, unknown> = { id: favoriteId };
    if (patch.className !== undefined) {
        payload.className = sanitizeIconName(patch.className);
    }
    if (patch.category !== undefined) {
        payload.category = patch.category.trim();
    }
    if (patch.tags !== undefined) {
        payload.tags = cleanTags(patch.tags);
    }
    return iconPostJSON("favorite/update", payload);
};

/** 删除收藏 */
export const removeFavorite = (favoriteId: string): Promise<void> =>
    iconPostJSON("favorite/remove", { id: favoriteId }).then(() => undefined);
