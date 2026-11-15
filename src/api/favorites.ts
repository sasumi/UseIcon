import { LIBRARY_ICONS } from "@/data/library";
import type { FavoriteIcon, LibraryIcon } from "@/types";
import { normalizeSvg, sanitizeIconName } from "@/utils/svg";
import { getLoginUser } from "./auth";
import { assert, clone, createId, mockResponse } from "./base";
import { mutateDatabase, readDatabase } from "./db";

const cleanTags = (tags: string[] | undefined): string[] =>
    Array.from(new Set((tags || []).map((tag) => tag.trim()).filter(Boolean))).slice(0, 12);

/** 当前用户的收藏列表 */
export const listFavorites = (): Promise<FavoriteIcon[]> =>
    mockResponse(() => {
        const user = getLoginUser();
        if (!user) {
            return [];
        }
        return readDatabase()
            .favorites.filter((item) => item.userId === user.id)
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .map(clone);
    }, 80);

/**
 * 添加收藏：同一公共库图标 / 同一项目图标只保留一条
 */
export const addFavorite = (input: {
    className: string;
    svg: string;
    tags?: string[];
    source: "library" | "project";
    libraryId?: string;
    projectId?: string;
}): Promise<FavoriteIcon> =>
    mockResponse(() => {
        const user = getLoginUser();
        assert(user, "登录后才可收藏图标", "unauthorized");
        return mutateDatabase((db) => {
            const existed = db.favorites.find(
                (item) =>
                    item.userId === user!.id &&
                    ((input.libraryId && item.libraryId === input.libraryId) ||
                        (!input.libraryId && input.projectId && item.projectId === input.projectId && item.className === input.className)),
            );
            if (existed) {
                existed.tags = cleanTags([...existed.tags, ...(input.tags || [])]);
                existed.updatedAt = Date.now();
                return clone(existed);
            }
            const favorite: FavoriteIcon = {
                id: createId("f"),
                userId: user!.id,
                className: sanitizeIconName(input.className),
                svg: normalizeSvg(input.svg),
                tags: cleanTags(input.tags),
                source: input.source,
                libraryId: input.libraryId,
                projectId: input.projectId,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };
            db.favorites.push(favorite);
            return clone(favorite);
        });
    }, 100);

/** 更新收藏（类名 / 标签） */
export const updateFavorite = (
    favoriteId: string,
    patch: Partial<Pick<FavoriteIcon, "className" | "tags">>,
): Promise<FavoriteIcon> =>
    mockResponse(() => {
        const user = getLoginUser();
        assert(user, "请先登录", "unauthorized");
        return mutateDatabase((db) => {
            const favorite = db.favorites.find((item) => item.id === favoriteId && item.userId === user!.id);
            assert(favorite, "收藏不存在", "not-found");
            if (patch.className !== undefined) {
                favorite!.className = sanitizeIconName(patch.className);
            }
            if (patch.tags !== undefined) {
                favorite!.tags = cleanTags(patch.tags);
            }
            favorite!.updatedAt = Date.now();
            return clone(favorite!);
        });
    }, 80);

/** 删除收藏 */
export const removeFavorite = (favoriteId: string): Promise<void> =>
    mockResponse(() => {
        const user = getLoginUser();
        assert(user, "请先登录", "unauthorized");
        mutateDatabase((db) => {
            db.favorites = db.favorites.filter((item) => !(item.id === favoriteId && item.userId === user!.id));
        });
    }, 80);

/** 公共库图标 */
export const listLibraryIcons = (): Promise<LibraryIcon[]> => mockResponse(() => LIBRARY_ICONS, 40);
