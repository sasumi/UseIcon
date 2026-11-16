import { CATEGORY_HISTORY_STORAGE_KEY } from "@/config";

/** 本机最多保留的分类历史条数 */
const CATEGORY_HISTORY_LIMIT = 20;

/** 读取本机记录的分类历史（最近使用的在前） */
export const readCategoryHistory = (): string[] => {
    try {
        const raw = localStorage.getItem(CATEGORY_HISTORY_STORAGE_KEY);
        const list: unknown = raw ? JSON.parse(raw) : [];
        return Array.isArray(list) ? list.filter((item): item is string => typeof item === "string" && item.trim() !== "") : [];
    } catch {
        return [];
    }
};

/** 记录使用过的分类（去重后最近使用在前） */
export const rememberCategory = (category: string): void => {
    const value = category.trim();
    if (!value) {
        return;
    }
    try {
        const list = [value, ...readCategoryHistory().filter((item) => item !== value)].slice(0, CATEGORY_HISTORY_LIMIT);
        localStorage.setItem(CATEGORY_HISTORY_STORAGE_KEY, JSON.stringify(list));
    } catch {
        // 忽略存储异常
    }
};

/** 合并多组分类候选：去重并保持传入顺序 */
export const mergeCategories = (...groups: (string[] | undefined)[]): string[] => {
    const set = new Set<string>();
    groups.forEach((group) => {
        (group || []).forEach((item) => {
            const value = item.trim();
            if (value) {
                set.add(value);
            }
        });
    });
    return Array.from(set);
};
