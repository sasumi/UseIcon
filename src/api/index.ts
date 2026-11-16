import * as auth from "./auth";
import * as favorites from "./favorites";
import * as icons from "./icons";
import * as projects from "./projects";

/**
 * 统一 API 出口：
 * - auth：api.tthaoke.com 的真实用户体系（登录 / 注册 / 头像 / 昵称）
 * - projects / icons / favorites：uiapi.tthaoke.com 的业务接口（项目 / 图标 / 收藏）
 */
export const api = {
    auth,
    projects,
    icons,
    favorites,
};

export { ApiError } from "./http";
