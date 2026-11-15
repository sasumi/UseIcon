import { api } from "@/api";
import { EVENT_ACCOUNT_UPDATED, EVENT_AUTH_LOGOUT } from "@/api/auth";
import type { User } from "@/types";
import { onEvent } from "minutool";
import { create } from "zustand";

interface AuthState {
    user: User | null; // 当前登录用户
    ready: boolean; // 是否完成登录态恢复
    pending: boolean; // 是否正在请求
    restore: () => Promise<void>; // 恢复登录态
    applyLogin: (payload: { token?: string; user?: unknown }) => User; // 应用登录页回传的登录结果
    refresh: () => Promise<void>; // 刷新用户信息
    logout: () => Promise<void>; // 退出登录
    updateNickname: (nickname: string) => Promise<void>; // 修改昵称
    uploadAvatar: (file: File) => Promise<void>; // 上传头像
    setUser: (user: User | null) => void; // 直接设置用户
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    ready: false,
    pending: false,
    restore: async () => {
        const user = await api.auth.restoreSession();
        set({ user, ready: true });
        if (user) {
            void api.projects.ensureStarterProject();
        }
    },
    applyLogin: (payload) => {
        const user = api.auth.applyLoginResult(payload);
        set({ user, ready: true });
        void api.projects.ensureStarterProject();
        return user;
    },
    refresh: async () => {
        const user = await api.auth.refreshLoginUser();
        set({ user });
    },
    logout: async () => {
        await api.auth.logout();
        set({ user: null });
    },
    updateNickname: async (nickname) => {
        set({ pending: true });
        try {
            const user = await api.auth.changeNickname(nickname);
            set({ user });
        } finally {
            set({ pending: false });
        }
    },
    uploadAvatar: async (file) => {
        set({ pending: true });
        try {
            const user = await api.auth.changeAvatar(file);
            set({ user });
        } finally {
            set({ pending: false });
        }
    },
    setUser: (user) => set({ user }),
}));

// 登录页 / 其他标签页导致的账户变化，统一同步到 store
onEvent(EVENT_ACCOUNT_UPDATED, () => useAuthStore.setState({ user: api.auth.getLoginUser() }));
onEvent(EVENT_AUTH_LOGOUT, () => useAuthStore.setState({ user: null }));

/** 是否已登录 */
export const useIsLoggedIn = (): boolean => Boolean(useAuthStore((state) => state.user));
