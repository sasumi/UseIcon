import type { IconInput, IconOptimizeOptions, LibraryIcon } from "@/types";
import { normalizeSvg, optimizeSvg, sanitizeIconName } from "@/utils/svg";
import { ApiError, iconGetJSON, iconPostJSON } from "./http";

/** 单次提交给后台的图标数量上限（多出来的分多次提交） */
const CREATE_CHUNK_SIZE = 100;

/** 公共库列表结果 */
export interface LibraryResult {
    icons: LibraryIcon[]; // 公共库图标
    canEdit: boolean; // 当前用户是否可维护公共库
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

/** 公共库图标列表（含当前用户是否可维护） */
export const listLibraryIcons = (): Promise<LibraryResult> =>
    iconGetJSON("library/getList").then((data) => ({
        icons: (data?.list ?? []) as LibraryIcon[],
        canEdit: Boolean(data?.canEdit),
    }));

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
export const saveLibraryIcons = (items: (LibraryIconPatch & { id: string })[]): Promise<LibraryIcon[]> =>
    iconPostJSON("library/saveBatch", { items: items.map((item) => ({ ...item, tags: item.tags && cleanTags(item.tags) })) }).then(
        (data) => (data?.list ?? []) as LibraryIcon[],
    );

/** 更新单个公共库图标 */
export const updateLibraryIcon = (iconId: string, patch: LibraryIconPatch): Promise<LibraryIcon> => {
    const item: LibraryIconPatch & { id: string } = { id: iconId };
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
    return iconPostJSON("library/remove", { ids: iconIds }).then(() => undefined);
};

/** 批量优化公共库图标（SVG 处理在浏览器完成，结果一次性提交） */
export const optimizeLibraryIcons = (icons: LibraryIcon[], options: IconOptimizeOptions): Promise<LibraryIcon[]> => {
    const items: (LibraryIconPatch & { id: string })[] = [];
    icons.forEach((icon) => {
        try {
            items.push({ id: icon.id, svg: optimizeSvg(icon.svg, options) });
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
        return { id: icon.id, className: `${options.prefix || ""}${className}${options.suffix || ""}` };
    });
    return saveLibraryIcons(items);
};
