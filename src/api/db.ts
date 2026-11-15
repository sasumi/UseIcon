import { DB_STORAGE_KEY } from "@/config";
import type { FavoriteIcon, IconItem, Project, User } from "@/types";
import { ApiError } from "./base";
import { createSeedDatabase } from "./seed";

/** 本地数据库结构（后期由 PHP 后台的表结构承接） */
export interface Database {
    version: number; // 数据结构版本
    projects: Project[]; // 项目
    icons: IconItem[]; // 项目图标
    favorites: FavoriteIcon[]; // 个人收藏
    userSnapshots: Record<string, User>; // 本机登录过的用户快照（成员展示与按邮箱查找）
    starterProjects: string[]; // 已创建过初始项目的用户 ID
}

const DB_VERSION = 5;

let cache: Database | null = null;

const isDatabase = (value: unknown): value is Database =>
    typeof value === "object" &&
    value !== null &&
    (value as Database).version === DB_VERSION &&
    Array.isArray((value as Database).projects) &&
    Array.isArray((value as Database).icons) &&
    Array.isArray((value as Database).favorites);

/** 旧版数据结构（图标使用 name / title / source） */
interface LegacyIcon {
    name?: string;
    title?: string;
    className?: string;
    source?: string;
    tags?: string[];
}

/** 把旧版数据迁移到当前结构：图标只保留 className + tags */
const migrateLegacyDatabase = (parsed: unknown): Database | null => {
    if (typeof parsed !== "object" || parsed === null) {
        return null;
    }
    const legacy = parsed as Partial<Database>;
    if (!Array.isArray(legacy.projects) || !Array.isArray(legacy.icons) || !Array.isArray(legacy.favorites)) {
        return null;
    }
    const icons = (legacy.icons as unknown as LegacyIcon[]).map((icon, index) => ({
        ...(icon as Record<string, unknown>),
        className: icon.className || icon.name || `icon-${index + 1}`,
        tags: Array.isArray(icon.tags) ? icon.tags : [],
    }));
    const favorites = (legacy.favorites as unknown as LegacyIcon[]).map((favorite, index) => ({
        ...(favorite as Record<string, unknown>),
        className: favorite.className || favorite.name || `icon-${index + 1}`,
        tags: Array.isArray(favorite.tags) ? favorite.tags : [],
    }));
    icons.forEach((icon) => {
        delete (icon as Record<string, unknown>).name;
        delete (icon as Record<string, unknown>).title;
        delete (icon as Record<string, unknown>).source;
    });
    favorites.forEach((favorite) => {
        delete (favorite as Record<string, unknown>).name;
        delete (favorite as Record<string, unknown>).title;
    });
    return {
        version: DB_VERSION,
        projects: legacy.projects as Database["projects"],
        icons: icons as unknown as Database["icons"],
        favorites: favorites as unknown as Database["favorites"],
        userSnapshots: legacy.userSnapshots || {},
        starterProjects: legacy.starterProjects || [],
    };
};

/** 写入本地存储（超出配额时给出可读错误） */
const persist = (db: Database): void => {
    try {
        localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(db));
    } catch (error) {
        console.error(error);
        throw new ApiError("本地存储空间不足，请清理部分图标，或切换到后台服务", "quota");
    }
};

/** 读取数据库（首次访问或版本不匹配时写入种子数据） */
export const readDatabase = (): Database => {
    if (cache) {
        return cache;
    }
    const raw = localStorage.getItem(DB_STORAGE_KEY);
    if (raw) {
        try {
            const parsed = JSON.parse(raw) as Database;
            if (isDatabase(parsed)) {
                cache = parsed;
                return parsed;
            }
            const migrated = migrateLegacyDatabase(parsed);
            if (migrated) {
                cache = migrated;
                persist(migrated);
                return migrated;
            }
        } catch (error) {
            console.warn("本地数据解析失败，重建种子数据", error);
        }
    }
    cache = createSeedDatabase(DB_VERSION);
    persist(cache);
    return cache;
};

/** 覆盖写入数据库 */
export const writeDatabase = (db: Database): void => {
    cache = db;
    persist(db);
};

/** 在事务中修改数据库，修改后自动写回 */
export const mutateDatabase = <T>(mutator: (db: Database) => T): T => {
    const db = readDatabase();
    const result = mutator(db);
    persist(db);
    return result;
};

/** 重置为种子数据 */
export const resetDatabase = (): void => {
    cache = createSeedDatabase(DB_VERSION);
    persist(cache);
};

/** 订阅其他标签页对本地数据库的修改 */
export const subscribeDatabase = (listener: () => void): (() => void) => {
    const handler = (event: StorageEvent) => {
        if (event.key !== DB_STORAGE_KEY) {
            return;
        }
        cache = null;
        listener();
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
};
