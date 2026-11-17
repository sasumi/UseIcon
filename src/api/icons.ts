import type { IconInput, IconItem, IconOptimizeOptions } from "@/types";
import { normalizeSvg, optimizeSvg, sanitizeIconName } from "@/utils/svg";
import { ApiError, iconGetJSON, iconPostJSON } from "./http";

const cleanTags = (tags: string[] | undefined): string[] =>
    Array.from(new Set((tags || []).map((tag) => tag.trim()).filter(Boolean))).slice(0, 8);

/** 项目图标列表（按自定义排序值，未设置时按创建时间） */
export const listIcons = (projectId: string): Promise<IconItem[]> =>
    iconGetJSON("icon/getList", { project_id: projectId }).then((data) => (data?.list ?? []) as IconItem[]);

/** 按 icon_id 批量取图标 */
export const listIconsByIds = (iconIds: string[]): Promise<IconItem[]> =>
    iconGetJSON("icon/getListByIds", { icon_ids: iconIds.join(",") }).then((data) => (data?.list ?? []) as IconItem[]);

/** 单次提交给后台的图标数量上限（多出来的分多次提交） */
const CREATE_CHUNK_SIZE = 100;

/** 批量新建图标 */
export const createIcons = async (projectId: string, inputs: IconInput[]): Promise<IconItem[]> => {
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
        return { className: input.className, category: input.category?.trim() || "", svg, tags: cleanTags(input.tags), refId: input.refId };
    });

    const created: IconItem[] = [];
    for (let start = 0; start < icons.length; start += CREATE_CHUNK_SIZE) {
        const chunk = icons.slice(start, start + CREATE_CHUNK_SIZE);
        const data = await iconPostJSON("icon/create", { project_id: projectId, icons: chunk });
        created.push(...((data?.list ?? []) as IconItem[]));
    }
    return created;
};

/** 从公共库添加图标（由后台按公共库数据复制快照，ref_id 记公共库图标的 icon_id） */
export const addIconsFromLibrary = (projectId: string, iconIds: string[]): Promise<IconItem[]> => {
    if (iconIds.length === 0) {
        return Promise.reject(new ApiError("请选择公共库图标"));
    }
    return iconPostJSON("icon/addFromLibrary", { project_id: projectId, icon_ids: iconIds }).then(
        (data) => (data?.list ?? []) as IconItem[],
    );
};

/** 更新图标 */
export const updateIcon = (
    iconId: string,
    patch: Partial<Pick<IconItem, "className" | "category" | "svg" | "tags">>,
): Promise<IconItem> => {
    const item: Record<string, unknown> = { iconId };
    if (patch.className !== undefined) {
        item.className = sanitizeIconName(patch.className);
    }
    if (patch.category !== undefined) {
        item.category = patch.category.trim();
    }
    if (patch.svg !== undefined) {
        try {
            item.svg = normalizeSvg(patch.svg);
        } catch {
            return Promise.reject(new ApiError("SVG 无法解析", "invalid-svg"));
        }
    }
    if (patch.tags !== undefined) {
        item.tags = cleanTags(patch.tags);
    }
    return iconPostJSON("icon/saveBatch", { items: [item] }).then((data) => (data?.list ?? [])[0] as IconItem);
};

/** 批量删除 */
export const deleteIcons = (iconIds: string[]): Promise<void> => {
    if (iconIds.length === 0) {
        return Promise.reject(new ApiError("请先选择图标"));
    }
    return iconPostJSON("icon/remove", { icon_ids: iconIds }).then(() => undefined);
};

/** 保存自定义排序（按传入顺序写入排序号） */
export const reorderIcons = (projectId: string, orderedIds: string[]): Promise<void> => {
    if (orderedIds.length === 0) {
        return Promise.reject(new ApiError("没有可排序的图标"));
    }
    return iconPostJSON("icon/reorder", { project_id: projectId, icon_ids: orderedIds }).then(() => undefined);
};

/** 批量优化图标（SVG 处理在浏览器完成，结果一次性提交） */
export const optimizeIcons = async (iconIds: string[], options: IconOptimizeOptions): Promise<IconItem[]> => {
    if (iconIds.length === 0) {
        throw new ApiError("请先选择图标");
    }
    const icons = await listIconsByIds(iconIds);
    const items: { iconId: string; svg: string }[] = [];
    icons.forEach((icon) => {
        try {
            items.push({ iconId: icon.iconId, svg: optimizeSvg(icon.svg, options) });
        } catch (error) {
            console.warn(`图标 ${icon.className} 优化失败`, error);
        }
    });
    if (items.length === 0) {
        throw new ApiError("没有图标被成功优化", "invalid-svg");
    }
    const data = await iconPostJSON("icon/saveBatch", { items });
    return (data?.list ?? []) as IconItem[];
};

/** 批量重命名（前缀 / 后缀 / 查找替换，重名由后台自动加序号） */
export const renameIcons = (
    iconIds: string[],
    options: { prefix?: string; suffix?: string; find?: string; replace?: string },
): Promise<IconItem[]> => {
    if (iconIds.length === 0) {
        return Promise.reject(new ApiError("请先选择图标"));
    }
    return listIconsByIds(iconIds)
        .then((icons) => {
            const items = icons.map((icon) => {
                let className = icon.className;
                if (options.find) {
                    className = className.split(options.find).join(options.replace || "");
                }
                return { iconId: icon.iconId, className: `${options.prefix || ""}${className}${options.suffix || ""}` };
            });
            return iconPostJSON("icon/saveBatch", { items });
        })
        .then((data) => (data?.list ?? []) as IconItem[]);
};
