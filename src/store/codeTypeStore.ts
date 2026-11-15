import { CODE_TYPES_STORAGE_KEY, DEFAULT_CODE_TEMPLATE } from "@/config";
import { create } from "zustand";

/** 自定义代码类型（用户自建的出码模板） */
export interface CodeType {
    id: string; // 唯一标识，作为下拉项的值
    name: string; // 类型名称
    template: string; // 代码模板
}

const readTypes = (): CodeType[] => {
    try {
        const raw = localStorage.getItem(CODE_TYPES_STORAGE_KEY);
        if (!raw) {
            return [];
        }
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as CodeType[]).filter((item) => item && item.id && item.name) : [];
    } catch {
        return [];
    }
};

const writeTypes = (types: CodeType[]): void => {
    localStorage.setItem(CODE_TYPES_STORAGE_KEY, JSON.stringify(types));
};

interface CodeTypeState {
    types: CodeType[]; // 自定义类型列表
    addType: (name: string, template?: string) => CodeType | null; // 新增（重名返回 null）
    updateType: (id: string, patch: { name?: string; template?: string }) => boolean; // 修改（重名返回 false）
    removeType: (id: string) => void; // 删除
}

export const useCodeTypeStore = create<CodeTypeState>((set, get) => ({
    types: readTypes(),
    addType: (name, template) => {
        const trimmed = name.trim();
        if (!trimmed || get().types.some((item) => item.name === trimmed)) {
            return null;
        }
        const type: CodeType = { id: `custom-${Date.now().toString(36)}`, name: trimmed, template: template || DEFAULT_CODE_TEMPLATE };
        const next = [...get().types, type];
        writeTypes(next);
        set({ types: next });
        return type;
    },
    updateType: (id, patch) => {
        const current = get().types.find((item) => item.id === id);
        if (!current) {
            return false;
        }
        const name = patch.name === undefined ? current.name : patch.name.trim();
        if (!name) {
            return false;
        }
        if (get().types.some((item) => item.id !== id && item.name === name)) {
            return false;
        }
        const next = get().types.map((item) =>
            item.id === id ? { ...item, name, template: patch.template === undefined ? item.template : patch.template } : item,
        );
        writeTypes(next);
        set({ types: next });
        return true;
    },
    removeType: (id) => {
        const next = get().types.filter((item) => item.id !== id);
        writeTypes(next);
        set({ types: next });
    },
}));
