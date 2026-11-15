import type { Project } from "@/types";
import { getProjectAccess } from "@/utils/permission";
import { getLoginUser } from "./auth";
import { assert } from "./base";
import { readDatabase } from "./db";

/** 按 ID 取项目（不存在则报错） */
export const findProject = (projectId: string): Project => {
    const project = readDatabase().projects.find((item) => item.id === projectId);
    assert(project, "项目不存在或已被删除", "not-found");
    return project!;
};

/** 校验当前用户对项目的操作权限，返回项目引用 */
export const requireProjectAccess = (projectId: string, level: "view" | "edit" | "manage"): Project => {
    const project = findProject(projectId);
    const access = getProjectAccess(project, getLoginUser());
    assert(access.canView, "无权访问该项目", "forbidden");
    if (level === "edit") {
        assert(access.canEdit, "当前角色没有编辑权限", "forbidden");
    }
    if (level === "manage") {
        assert(access.canManage, "仅项目管理员可执行此操作", "forbidden");
    }
    return project;
};
