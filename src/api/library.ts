import type { IconInput, IconOptimizeOptions, LibraryCategoryCount, LibraryIcon, PageResult } from "@/types";
import { normalizeSvg, optimizeSvg, sanitizeIconName } from "@/utils/svg";
import { ApiError, iconGetJSON, iconPostJSON } from "./http";

/** 单次提交给后台的图标数量上限（多出来的分多次提交） */
const CREATE_CHUNK_SIZE = 100;

/** 公共库列表结果 */
export interface LibraryResult {
    icons: LibraryIcon[]; // 公共库图标
    canEdit: boolean; // 当前用户是否可维护公共库
}

/** 公共库分页结果 */
export interface LibraryPageResult extends PageResult<LibraryIcon> {
    canEdit: boolean; // 当前用户是否可维护公共库
    categories: LibraryCategoryCount[]; // 全库分类统计（不受筛选影响）
}

const cleanTags = (tags: string[] | undefined): string[] =>
    Array.from(new Set((tags || []).map((tag) => tag.trim()).filter(Boolean))).slice(0, 8);

/** 需要保存的公共库图标字段 */
export interface LibraryIconPatch {
    className?: string; // 图标类名
    category?: string; // 分类
    tags?: string[]; // 标签
    svg?: string; // SVG 源码
}

/** 一次取全量时的分页大小（与后台 page_size 上限一致） */
const FULL_LIST_PAGE_SIZE = 200;

/** 公共库图标全量列表（含当前用户是否可维护，供需要一次取全量的场景使用） */
export const listLibraryIcons = async (): Promise<LibraryResult> => {
    const icons: LibraryIcon[] = [];
    let canEdit = false;
    for (let page = 1; ; page++) {
        const data = await iconGetJSON("library/getList", { page, page_size: FULL_LIST_PAGE_SIZE });
        const list = (data?.list ?? []) as LibraryIcon[];
        icons.push(...list);
        canEdit = Boolean(data?.canEdit);
        if (list.length === 0 || icons.length >= Number(data?.total ?? 0)) {
            break;
        }
    }
    return { icons, canEdit };
};

/** 分页加载公共库图标（主列表滚动加载） */
export const listLibraryIconsPaged = (
    options: { offset?: number; limit?: number; keyword?: string; category?: string } = {},
): Promise<LibraryPageResult> => {
    const offset = Math.max(0, Math.floor(options.offset ?? 0));
    const limit = Math.max(1, Math.floor(options.limit ?? 60));
    const page = Math.floor(offset / limit) + 1;
    return iconGetJSON("library/getList", {
        page,
        page_size: limit,
        keyword: options.keyword?.trim() || undefined,
        category: options.category?.trim() || undefined,
    }).then((data) => {
        const items = (data?.list ?? []) as LibraryIcon[];
        const total = Number(data?.total ?? 0);
        return {
            items,
            total,
            hasMore: offset + items.length < total,
            canEdit: Boolean(data?.canEdit),
            categories: (data?.categories ?? []) as LibraryCategoryCount[],
        };
    });
};

/** 批量新增公共库图标（类名由后台全库去重） */
export const createLibraryIcons = async (inputs: IconInput[]): Promise<LibraryIcon[]> => {
    if (inputs.length === 0) {
        throw new ApiError("没有可导入的图标");
    }
    const icons = inputs.map((input) => {
        let svg: string;
        try {
            svg = normalizeSvg(input.svg);
        } catch {
            throw new ApiError(`图标「${input.className}」的 SVG 无法解析`, "invalid-svg");
        }
        return { className: input.className, svg, tags: cleanTags(input.tags), category: input.category };
    });

    const created: LibraryIcon[] = [];
    for (let start = 0; start < icons.length; start += CREATE_CHUNK_SIZE) {
        const chunk = icons.slice(start, start + CREATE_CHUNK_SIZE);
        const data = await iconPostJSON("library/create", { icons: chunk });
        created.push(...((data?.list ?? []) as LibraryIcon[]));
    }
    return created;
};

/** 批量保存公共库图标修改（编辑、批量优化、批量重命名共用） */
export const saveLibraryIcons = (items: (LibraryIconPatch & { iconId: string })[]): Promise<LibraryIcon[]> =>
    iconPostJSON("library/saveBatch", { items: items.map((item) => ({ ...item, tags: item.tags && cleanTags(item.tags) })) }).then(
        (data) => (data?.list ?? []) as LibraryIcon[],
    );

/** 更新单个公共库图标 */
export const updateLibraryIcon = (iconId: string, patch: LibraryIconPatch): Promise<LibraryIcon> => {
    const item: LibraryIconPatch & { iconId: string } = { iconId };
    if (patch.className !== undefined) {
        item.className = sanitizeIconName(patch.className);
    }
    if (patch.category !== undefined) {
        item.category = patch.category.trim();
    }
    if (patch.tags !== undefined) {
        item.tags = cleanTags(patch.tags);
    }
    if (patch.svg !== undefined) {
        try {
            item.svg = normalizeSvg(patch.svg);
        } catch {
            return Promise.reject(new ApiError("SVG 无法解析", "invalid-svg"));
        }
    }
    return saveLibraryIcons([item]).then((list) => list[0]);
};

/** 批量删除公共库图标 */
export const deleteLibraryIcons = (iconIds: string[]): Promise<void> => {
    if (iconIds.length === 0) {
        return Promise.reject(new ApiError("请先选择图标"));
    }
    return iconPostJSON("library/remove", { icon_ids: iconIds }).then(() => undefined);
};

/** 批量优化公共库图标（SVG 处理在浏览器完成，结果一次性提交） */
export const optimizeLibraryIcons = (icons: LibraryIcon[], options: IconOptimizeOptions): Promise<LibraryIcon[]> => {
    const items: (LibraryIconPatch & { iconId: string })[] = [];
    icons.forEach((icon) => {
        try {
            items.push({ iconId: icon.iconId, svg: optimizeSvg(icon.svg, options) });
        } catch (error) {
            console.warn(`公共库图标 ${icon.className} 优化失败`, error);
        }
    });
    if (items.length === 0) {
        return Promise.reject(new ApiError("没有图标被成功优化", "invalid-svg"));
    }
    return saveLibraryIcons(items);
};

/** 批量重命名公共库图标（重名由后台自动加序号） */
export const renameLibraryIcons = (
    icons: LibraryIcon[],
    options: { prefix?: string; suffix?: string; find?: string; replace?: string },
): Promise<LibraryIcon[]> => {
    const items = icons.map((icon) => {
        let className = icon.className;
        if (options.find) {
            className = className.split(options.find).join(options.replace || "");
        }
        return { iconId: icon.iconId, className: `${options.prefix || ""}${className}${options.suffix || ""}` };
    });
    return saveLibraryIcons(items);
};
