import { LOGIN_USER_STORAGE_KEY } from "@/config";
import { dispatchEvent } from "minutool";
import type { User } from "@/types";
import { ApiError, apiGetJSON, apiPostJSON, apiRequestJSON, getToken, setToken } from "./http";

export const EVENT_ACCOUNT_UPDATED = "useicon:account-updated";
export const EVENT_AUTH_LOGOUT = "useicon:auth-logout";

/** 后端要求登录的错误码 */
const CODE_LOGIN_REQUIRED = 403;

/** 后端用户信息 → 前端用户（下划线转驼峰，兼容已归一化的数据） */
export const normalizeUser = (raw: any): User => ({
    id: String(raw?.user_id ?? raw?.id ?? ""),
    name: raw?.name ?? "",
    nickname: raw?.nickname || raw?.name || "",
    email: raw?.email ?? "",
    avatarThumb: raw?.avatar_thumb ?? raw?.avatarThumb ?? "",
    state: raw?.state ?? "Normal",
    createTime: raw?.create_time ?? raw?.createTime ?? "",
});

/** 读取本地缓存的用户信息 */
export const getLoginUser = (): User | null => {
    try {
        const raw = localStorage.getItem(LOGIN_USER_STORAGE_KEY);
        return raw ? (JSON.parse(raw) as User) : null;
    } catch {
        return null;
    }
};

/** 写入/清除本地用户缓存 */
const cacheLoginUser = (user: User | null): void => {
    try {
        if (user) {
            localStorage.setItem(LOGIN_USER_STORAGE_KEY, JSON.stringify(user));
        } else {
            localStorage.removeItem(LOGIN_USER_STORAGE_KEY);
        }
    } catch {
        // 忽略 storage 异常
    }
};

/** 当前登录用户 ID */
export const getLoginUserId = (): string | null => getLoginUser()?.id || null;

/**
 * 应用登录结果（{ token, user }）：保存令牌与用户信息，并广播账户变更。
 * 登录页 iframe 回传的数据、以及 updateLoginUser 的返回值都用这个入口。
 */
export const applyLoginResult = (payload: { token?: string; user?: any }): User => {
    if (payload?.token) {
        setToken(payload.token);
    }
    const user = normalizeUser(payload?.user ?? payload);
    if (user.id) {
        cacheLoginUser(user);
        dispatchEvent(EVENT_ACCOUNT_UPDATED);
    }
    return user;
};

/** 是否存在本地令牌 */
export const hasToken = (): boolean => Boolean(getToken());

/** 拉取最新登录用户信息并刷新令牌，未登录时返回 null */
export const refreshLoginUser = (): Promise<User | null> =>
    apiGetJSON("auth/updateLoginUser").then((result) => {
        if (!result || !result.user || !normalizeUser(result.user).id) {
            setToken(null);
            cacheLoginUser(null);
            dispatchEvent(EVENT_AUTH_LOGOUT);
            return null;
        }
        return applyLoginResult(result);
    });

/** 恢复登录态：有令牌时向后端刷新，后端不可达时退回本地缓存 */
export const restoreSession = async (): Promise<User | null> => {
    if (!getToken()) {
        cacheLoginUser(null);
        return null;
    }
    try {
        return await refreshLoginUser();
    } catch (error) {
        if (error instanceof ApiError && error.code === CODE_LOGIN_REQUIRED) {
            setToken(null);
            cacheLoginUser(null);
            dispatchEvent(EVENT_AUTH_LOGOUT);
            return null;
        }
        // 网络异常时保留缓存，避免离线打开页面时丢失登录态
        return getLoginUser();
    }
};

/** 退出登录：通知后端清理会话，并清空本地令牌与缓存 */
export const logout = async (): Promise<void> => {
    try {
        await apiPostJSON("auth/logout");
    } catch (error) {
        console.warn("退出登录接口调用失败", error);
    }
    setToken(null);
    cacheLoginUser(null);
    dispatchEvent(EVENT_AUTH_LOGOUT);
};

/** 修改昵称，返回最新用户信息 */
export const changeNickname = (nickname: string): Promise<User | null> =>
    apiPostJSON("account/changeNickname", { nickname }).then(() => refreshLoginUser());

/** 上传头像（接口会刷新令牌与用户信息），返回最新用户信息 */
export const changeAvatar = (file: File): Promise<User | null> =>
    apiRequestJSON({ uri: "account/uploadAvatar", data: { file }, method: "POST" }).then(() => refreshLoginUser());
