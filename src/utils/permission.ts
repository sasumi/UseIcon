import { ACCESS_TYPE_PUBLIC } from "@/config";
import type { Project, ProjectAccess, ProjectRole, User } from "@/types";

/** 角色名称 */
export const ROLE_LABELS: Record<ProjectRole, string> = {
    admin: "管理员",
    editor: "协作人员",
    viewer: "普通用户",
};

/** 角色权限说明 */
export const ROLE_DESCRIPTIONS: Record<ProjectRole, string> = {
    admin: "管理项目设置、成员与全部图标",
    editor: "上传、编辑、删除项目图标",
    viewer: "仅查看并复制图标代码",
};

/** 角色排序（成员列表展示用） */
export const ROLE_ORDER: ProjectRole[] = ["admin", "editor", "viewer"];

const NO_ACCESS: ProjectAccess = {
    role: null,
    isGuest: true,
    canView: false,
    canEdit: false,
    canManage: false,
};

/** 计算当前用户在项目中的权限 */
export const getProjectAccess = (project: Project | null | undefined, user: User | null): ProjectAccess => {
    if (!project) {
        return NO_ACCESS;
    }
    const member = user ? project.members.find((item) => item.userId === user.id) : undefined;
    if (member) {
        return {
            role: member.role,
            isGuest: false,
            canView: true,
            canEdit: member.role !== "viewer",
            canManage: member.role === "admin",
        };
    }
    const canView = project.accessType === ACCESS_TYPE_PUBLIC;
    return {
        role: null,
        isGuest: !user,
        canView,
        canEdit: false,
        canManage: false,
    };
};

/** 是否可以加入项目（仅 members 与公开项目） */
export const canListProject = (project: Project, user: User | null): boolean => getProjectAccess(project, user).canView;

/** 角色是否可编辑图标 */
export const roleCanEdit = (role: ProjectRole | null): boolean => role === "admin" || role === "editor";

/** 角色是否可管理项目 */
export const roleCanManage = (role: ProjectRole | null): boolean => role === "admin";
