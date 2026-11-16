import * as auth from "./auth";
import * as favorites from "./favorites";
import * as icons from "./icons";
import * as library from "./library";
import * as projects from "./projects";

/**
 * 统一 API 出口：
 * - auth：api.tthaoke.com 的真实用户体系（登录 / 注册 / 头像 / 昵称）
 * - projects / icons / favorites：uiapi.tthaoke.com 的项目 / 项目图标 / 收藏接口
 * - library：uiapi.tthaoke.com 的公共图标库接口（所有人可读，白名单用户可维护）
 */
export const api = {
    auth,
    projects,
    icons,
    library,
    favorites,
};

export { ApiError } from "./http";
