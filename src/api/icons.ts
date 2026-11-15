import type { IconInput, IconItem, IconOptimizeOptions, LibraryIcon } from "@/types";
import { LIBRARY_ICON_MAP } from "@/data/library";
import { normalizeSvg, optimizeSvg, sanitizeIconName, uniqueIconName } from "@/utils/svg";
import { getLoginUser } from "./auth";
import { ApiError, assert, clone, createId, mockResponse } from "./base";
import { mutateDatabase, readDatabase } from "./db";
import { requireProjectAccess } from "./guard";

const assertEditAccessForIcons = (iconIds: string[]): string[] => {
    const db = readDatabase();
    const projectIds = new Set<string>();
    iconIds.forEach((iconId) => {
        const icon = db.icons.find((item) => item.id === iconId);
        assert(icon, "图标不存在或已被删除", "not-found");
        projectIds.add(icon!.projectId);
    });
    projectIds.forEach((projectId) => requireProjectAccess(projectId, "edit"));
    return Array.from(projectIds);
};

const cleanTags = (tags: string[] | undefined): string[] =>
    Array.from(new Set((tags || []).map((tag) => tag.trim()).filter(Boolean))).slice(0, 8);

const ensureUniqueName = (projectId: string, name: string, excludeId?: string): string => {
    const existed = readDatabase()
        .icons.filter((item) => item.projectId === projectId && item.id !== excludeId)
        .map((item) => item.className);
    return uniqueIconName(name, existed);
};

/** 项目图标列表 */
export const listIcons = (projectId: string): Promise<IconItem[]> =>
    mockResponse(() => {
        requireProjectAccess(projectId, "view");
        return readDatabase()
            .icons.filter((item) => item.projectId === projectId)
            .sort((a, b) => a.createdAt - b.createdAt)
            .map(clone);
    });

/** 单个图标 */
export const getIcon = (iconId: string): IconItem =>
    clone(
        readDatabase().icons.find((item) => item.id === iconId) ||
            (() => {
                throw new ApiError("图标不存在或已被删除", "not-found");
            })(),
    );

/** 批量新建图标 */
export const createIcons = (projectId: string, inputs: IconInput[]): Promise<IconItem[]> =>
    mockResponse(() => {
        requireProjectAccess(projectId, "edit");
        assert(inputs.length > 0, "没有可导入的图标");
        return saveIcons(projectId, inputs.map((input) => ({ ...input })));
    });

/** 从公共库添加图标 */
export const addIconsFromLibrary = (projectId: string, libraryIds: string[]): Promise<IconItem[]> =>
    mockResponse(() => {
        requireProjectAccess(projectId, "edit");
        const inputs: IconInput[] = libraryIds.map((libraryId) => {
            const libraryIcon: LibraryIcon | undefined = LIBRARY_ICON_MAP[libraryId];
            assert(libraryIcon, "公共库图标不存在", "not-found");
            return {
                className: libraryIcon!.className,
                svg: libraryIcon!.svg,
                tags: libraryIcon!.tags.slice(0, 3),
                libraryId: libraryIcon!.id,
            };
        });
        return saveIcons(projectId, inputs);
    });

/** 写入图标（已校验权限），返回新建的图标 */
const saveIcons = (projectId: string, inputs: IconInput[]): IconItem[] => {
    const user = getLoginUser();
    assert(user, "请先登录", "unauthorized");
    return mutateDatabase((db) => {
        const project = db.projects.find((item) => item.id === projectId);
        const created: IconItem[] = [];
        const collected: string[] = db.icons.filter((item) => item.projectId === projectId).map((item) => item.className);
        inputs.forEach((input) => {
            let svg: string;
            try {
                svg = normalizeSvg(input.svg);
            } catch {
                throw new ApiError(`图标「${input.className}」的 SVG 无法解析`, "invalid-svg");
            }
            const className = uniqueIconName(input.className, collected);
            collected.push(className);
            const icon: IconItem = {
                id: createId("i"),
                projectId,
                className,
                svg,
                tags: cleanTags(input.tags),
                libraryId: input.libraryId,
                createdBy: user!.id,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };
            db.icons.push(icon);
            created.push(icon);
        });
        if (project) {
            project.updatedAt = Date.now();
        }
        return clone(created);
    });
};

/** 更新图标 */
export const updateIcon = (
    iconId: string,
    patch: Partial<Pick<IconItem, "className" | "svg" | "tags">>,
): Promise<IconItem> =>
    mockResponse(() => {
        assertEditAccessForIcons([iconId]);
        return mutateDatabase((db) => {
            const icon = db.icons.find((item) => item.id === iconId)!;
            if (patch.className !== undefined) {
                const className = sanitizeIconName(patch.className);
                assert(className.length > 0, "图标类名不能为空");
                icon.className = ensureUniqueName(icon.projectId, className, iconId);
            }
            if (patch.svg !== undefined) {
                let svg: string;
                try {
                    svg = normalizeSvg(patch.svg);
                } catch {
                    throw new ApiError("SVG 无法解析", "invalid-svg");
                }
                icon.svg = svg;
            }
            if (patch.tags !== undefined) {
                icon.tags = cleanTags(patch.tags);
            }
            icon.updatedAt = Date.now();
            return clone(icon);
        });
    });

/** 批量删除图标 */
export const deleteIcons = (iconIds: string[]): Promise<void> =>
    mockResponse(() => {
        assert(iconIds.length > 0, "请先选择图标");
        assertEditAccessForIcons(iconIds);
        mutateDatabase((db) => {
            const ids = new Set(iconIds);
            db.icons = db.icons.filter((item) => !ids.has(item.id));
        });
    });

/** 批量优化图标 */
export const optimizeIcons = (iconIds: string[], options: IconOptimizeOptions): Promise<IconItem[]> =>
    mockResponse(() => {
        assert(iconIds.length > 0, "请先选择图标");
        assertEditAccessForIcons(iconIds);
        return mutateDatabase((db) => {
            const updated: IconItem[] = [];
            db.icons.forEach((icon) => {
                if (!iconIds.includes(icon.id)) {
                    return;
                }
                try {
                    icon.svg = optimizeSvg(icon.svg, options);
                    icon.updatedAt = Date.now();
                    updated.push(icon);
                } catch (error) {
                    console.warn(`图标 ${icon.className} 优化失败`, error);
                }
            });
            assert(updated.length > 0, "没有图标被成功优化", "invalid-svg");
            return clone(updated);
        });
    });

/** 批量重命名（前缀 / 后缀 / 查找替换） */
export const renameIcons = (
    iconIds: string[],
    options: { prefix?: string; suffix?: string; find?: string; replace?: string },
): Promise<IconItem[]> =>
    mockResponse(() => {
        assert(iconIds.length > 0, "请先选择图标");
        assertEditAccessForIcons(iconIds);
        return mutateDatabase((db) => {
            const updated: IconItem[] = [];
            const projectId = db.icons.find((item) => item.id === iconIds[0])!.projectId;
            const collected: string[] = db.icons
                .filter((item) => item.projectId === projectId && !iconIds.includes(item.id))
                .map((item) => item.className);
            db.icons.forEach((icon) => {
                if (!iconIds.includes(icon.id)) {
                    return;
                }
                let className = icon.className;
                if (options.find) {
                    className = className.split(options.find).join(options.replace || "");
                }
                className = `${options.prefix || ""}${className}${options.suffix || ""}`;
                className = uniqueIconName(className, collected);
                collected.push(className);
                icon.className = className;
                icon.updatedAt = Date.now();
                updated.push(icon);
            });
            return clone(updated);
        });
    });

/** 公共库搜索用的全部图标（含分类） */
export { listLibraryIcons } from "./favorites";
