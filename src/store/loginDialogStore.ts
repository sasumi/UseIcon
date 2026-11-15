import { create } from "zustand";

interface LoginDialogState {
    open: boolean; // 是否显示登录对话框
    setOpen: (open: boolean) => void; // 显隐控制
}

/** 登录对话框的全局开关：任意位置都能唤起统一登录 */
export const useLoginDialogStore = create<LoginDialogState>((set) => ({
    open: false,
    setOpen: (open) => set({ open }),
}));

/** 打开登录对话框（未登录的操作可直接调用） */
export const openLoginDialog = (): void => useLoginDialogStore.getState().setOpen(true);
