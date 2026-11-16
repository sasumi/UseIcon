import type { Project, ProjectRole, ProjectVisibility } from "@/types";
import { iconGetJSON, iconPostJSON } from "./http";

/** 分页结果 */
export interface PageResult<T> {
    items: T[]; // 当前页数据
    total: number; // 总条数
    hasMore: boolean; // 是否还有下一页
}

/** 项目列表（当前用户可见的项目，按更新时间倒序） */
export const listProjects = (): Promise<Project[]> =>
    iconGetJSON("project/getList").then((data) => (data?.list ?? []) as Project[]);

/** 分页加载项目（侧栏滚动加载） */
export const listProjectsPaged = (options: { offset?: number; limit?: number } = {}): Promise<PageResult<Project>> => {
    const offset = Math.max(0, Math.floor(options.offset ?? 0));
    const limit = Math.max(1, Math.floor(options.limit ?? 12));
    const page = Math.floor(offset / limit) + 1;
    return iconGetJSON("project/getListPage", { page, page_size: limit }).then((data) => {
        const items = (data?.list ?? []) as Project[];
        const total = Number(data?.total ?? 0);
        return { items, total, hasMore: offset + items.length < total };
    });
};

/** 项目详情 */
export const getProject = (projectId: string): Promise<Project> => iconGetJSON("project/detail", { id: projectId });

/** 新建项目 */
export const createProject = (input: {
    name: string;
    description?: string;
    visibility?: ProjectVisibility;
    allowGuest?: boolean;
    iconSize?: number;
}): Promise<Project> =>
    iconPostJSON("project/create", {
        name: input.name,
        description: input.description ?? "",
        visibility: input.visibility,
        allow_guest: input.allowGuest,
        icon_size: input.iconSize,
    });

/** 新用户首次登录时分配一个属于自己的初始项目（仅一次，且已有项目时跳过） */
export const ensureStarterProject = (): Promise<Project | null> =>
    iconPostJSON("project/ensureStarter", {}).then((data) => (data?.project ?? null) as Project | null);

/** 更新项目设置 */
export const updateProject = (
    projectId: string,
    patch: Partial<Pick<Project, "name" | "description" | "visibility" | "allowGuest" | "iconSize" | "codeTemplate">>,
): Promise<Project> => {
    const payload: Record<string, unknown> = { id: projectId };
    if (patch.name !== undefined) {
        payload.name = patch.name;
    }
    if (patch.description !== undefined) {
        payload.description = patch.description;
    }
    if (patch.visibility !== undefined) {
        payload.visibility = patch.visibility;
    }
    if (patch.allowGuest !== undefined) {
        payload.allow_guest = patch.allowGuest;
    }
    if (patch.iconSize !== undefined) {
        payload.icon_size = patch.iconSize;
    }
    if (patch.codeTemplate !== undefined) {
        payload.code_template = patch.codeTemplate;
    }
    return iconPostJSON("project/update", payload);
};

/** 删除项目（连带删除项目内图标） */
export const deleteProject = (projectId: string): Promise<void> =>
    iconPostJSON("project/remove", { id: projectId }).then(() => undefined);

/** 添加成员（对方需登录过一次 UseIcon，可用邮箱 / 登录名 / 昵称查找） */
export const addMember = (projectId: string, account: string, role: ProjectRole): Promise<Project> =>
    iconPostJSON("project/addMember", { id: projectId, account, role });

/** 修改成员角色 */
export const updateMemberRole = (projectId: string, userId: string, role: ProjectRole): Promise<Project> =>
    iconPostJSON("project/updateMemberRole", { id: projectId, user_id: userId, role });

/** 移除成员 */
export const removeMember = (projectId: string, userId: string): Promise<Project> =>
    iconPostJSON("project/removeMember", { id: projectId, user_id: userId });
