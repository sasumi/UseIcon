import { DEFAULT_CODE_TEMPLATE, DEFAULT_ICON_SIZE } from "@/config";
import { LIBRARY_ICON_MAP } from "@/data/library";
import type { IconItem, Project, ProjectMember, ProjectRole, ProjectVisibility, User } from "@/types";
import { getProjectAccess } from "@/utils/permission";
import { getLoginUser } from "./auth";
import { ApiError, assert, clone, createId, mockResponse, normalizeEmail } from "./base";
import { mutateDatabase, readDatabase } from "./db";
import { requireProjectAccess } from "./guard";
import { STARTER_ICON_NAMES } from "./seed";

const touch = (project: Project): void => {
    project.updatedAt = Date.now();
};

/** 用户 → 成员快照 */
export const memberFromUser = (user: User, role: ProjectRole): ProjectMember => ({
    userId: user.id,
    role,
    joinedAt: Date.now(),
    name: user.nickname || user.name,
    email: user.email || (user.name.includes("@") ? user.name : ""),
    avatarThumb: user.avatarThumb,
});

/** 分页结果 */
export interface PageResult<T> {
    items: T[]; // 当前页数据
    total: number; // 总条数
    hasMore: boolean; // 是否还有下一页
}

/** 当前用户可见的项目（按更新时间倒序） */
const visibleProjects = (): Project[] => {
    const user = getLoginUser();
    return readDatabase()
        .projects.filter((project) => getProjectAccess(project, user).canView)
        .sort((a, b) => b.updatedAt - a.updatedAt);
};

/** 当前用户可见的项目列表（全量） */
export const listProjects = (): Promise<Project[]> => mockResponse(() => visibleProjects().map(clone));

/** 分页加载项目（侧栏滚动加载） */
export const listProjectsPaged = (options: { offset?: number; limit?: number } = {}): Promise<PageResult<Project>> =>
    mockResponse(() => {
        const all = visibleProjects();
        const offset = Math.max(0, Math.floor(options.offset ?? 0));
        const limit = Math.max(1, Math.floor(options.limit ?? 12));
        const items = all.slice(offset, offset + limit).map(clone);
        return { items, total: all.length, hasMore: offset + items.length < all.length };
    }, 80);

/** 项目详情 */
export const getProject = (projectId: string): Promise<Project> =>
    mockResponse(() => clone(requireProjectAccess(projectId, "view")));

/** 新建项目 */
export const createProject = (input: {
    name: string;
    description?: string;
    visibility?: ProjectVisibility;
    allowGuest?: boolean;
    iconSize?: number;
}): Promise<Project> =>
    mockResponse(() => {
        const user = getLoginUser();
        assert(user, "请先登录", "unauthorized");
        assert(input.name.trim().length > 0, "请输入项目名称");
        const project: Project = {
            id: createId("p"),
            name: input.name.trim(),
            description: (input.description || "").trim(),
            ownerId: user!.id,
            visibility: input.visibility || "team",
            allowGuest: Boolean(input.allowGuest),
            iconSize: input.iconSize || DEFAULT_ICON_SIZE,
            codeTemplate: DEFAULT_CODE_TEMPLATE,
            members: [memberFromUser(user!, "admin")],
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        mutateDatabase((db) => {
            db.projects.push(project);
            db.userSnapshots[user!.id] = user!;
        });
        return clone(project);
    });

/**
 * 新用户首次登录时分配一个属于自己的初始项目（仅一次，且已有项目时跳过）
 */
export const ensureStarterProject = (): Promise<Project | null> =>
    mockResponse(() => {
        const user = getLoginUser();
        if (!user) {
            return null;
        }
        const db = readDatabase();
        if (db.starterProjects.includes(user.id)) {
            return null;
        }
        const hasOwn = db.projects.some((project) => project.members.some((member) => member.userId === user.id));
        if (hasOwn) {
            mutateDatabase((database) => {
                database.starterProjects.push(user.id);
                database.userSnapshots[user.id] = user;
            });
            return null;
        }

        const project: Project = {
            id: createId("p"),
            name: "我的图标库",
            description: "自动创建的初始项目，可重命名或删除后新建。",
            ownerId: user.id,
            visibility: "team",
            allowGuest: false,
            iconSize: DEFAULT_ICON_SIZE,
            codeTemplate: DEFAULT_CODE_TEMPLATE,
            members: [memberFromUser(user, "admin")],
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        const icons: IconItem[] = STARTER_ICON_NAMES.map((className) => {
            const libraryIcon = LIBRARY_ICON_MAP[`lib-${className}`];
            return {
                id: createId("i"),
                projectId: project.id,
                className: libraryIcon.className,
                svg: libraryIcon.svg,
                tags: [],
                libraryId: libraryIcon.id,
                createdBy: user.id,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };
        });
        mutateDatabase((database) => {
            database.projects.push(project);
            database.icons.push(...icons);
            database.starterProjects.push(user.id);
            database.userSnapshots[user.id] = user;
        });
        return clone(project);
    });

/** 更新项目设置 */
export const updateProject = (
    projectId: string,
    patch: Partial<Pick<Project, "name" | "description" | "visibility" | "allowGuest" | "iconSize" | "codeTemplate">>,
): Promise<Project> =>
    mockResponse(() => {
        const project = requireProjectAccess(projectId, "manage");
        if (patch.name !== undefined) {
            assert(patch.name.trim().length > 0, "项目名称不能为空");
            project.name = patch.name.trim();
        }
        if (patch.description !== undefined) {
            project.description = patch.description.trim();
        }
        if (patch.visibility !== undefined) {
            project.visibility = patch.visibility;
        }
        if (patch.allowGuest !== undefined) {
            project.allowGuest = patch.allowGuest;
        }
        if (patch.iconSize !== undefined) {
            assert(patch.iconSize > 0 && patch.iconSize <= 256, "图标尺寸需在 1 - 256 之间");
            project.iconSize = patch.iconSize;
        }
        if (patch.codeTemplate !== undefined) {
            project.codeTemplate = patch.codeTemplate;
        }
        touch(project);
        return clone(project);
    });

/** 删除项目（连带删除项目内图标） */
export const deleteProject = (projectId: string): Promise<void> =>
    mockResponse(() => {
        requireProjectAccess(projectId, "manage");
        mutateDatabase((db) => {
            db.projects = db.projects.filter((item) => item.id !== projectId);
            db.icons = db.icons.filter((item) => item.projectId !== projectId);
        });
    });

/** 按邮箱或登录名查找本机登录过的用户 */
export const findUserByAccount = (account: string): User | null => {
    const key = normalizeEmail(account);
    const snapshots = Object.values(readDatabase().userSnapshots);
    return snapshots.find((user) => normalizeEmail(user.email) === key || normalizeEmail(user.name) === key) || null;
};

/** 添加成员（对方需在本设备登录过 UseIcon） */
export const addMember = (projectId: string, account: string, role: ProjectRole): Promise<Project> =>
    mockResponse(() => {
        const project = requireProjectAccess(projectId, "manage");
        const target = findUserByAccount(account);
        if (!target) {
            throw new ApiError("未找到该用户：请让 TA 在本设备登录一次 UseIcon，或检查邮箱 / 登录名", "not-found");
        }
        if (project.members.some((item) => item.userId === target.id)) {
            throw new ApiError("该用户已经是项目成员", "duplicated");
        }
        project.members.push(memberFromUser(target, role));
        touch(project);
        return clone(project);
    });

/** 修改成员角色 */
export const updateMemberRole = (projectId: string, userId: string, role: ProjectRole): Promise<Project> =>
    mockResponse(() => {
        const project = requireProjectAccess(projectId, "manage");
        const member = project.members.find((item) => item.userId === userId);
        assert(member, "成员不存在", "not-found");
        assert(userId !== project.ownerId, "不能修改创建者的角色", "forbidden");
        member!.role = role;
        touch(project);
        return clone(project);
    });

/** 移除成员 */
export const removeMember = (projectId: string, userId: string): Promise<Project> =>
    mockResponse(() => {
        const project = requireProjectAccess(projectId, "manage");
        assert(userId !== project.ownerId, "不能移除项目创建者", "forbidden");
        project.members = project.members.filter((item) => item.userId !== userId);
        touch(project);
        return clone(project);
    });

/** 按 ID 批量获取用户快照 */
export const getUsers = (ids: string[]): Record<string, User> => {
    const snapshots = readDatabase().userSnapshots;
    const map: Record<string, User> = {};
    ids.forEach((id) => {
        if (snapshots[id]) {
            map[id] = snapshots[id];
        }
    });
    return map;
};
