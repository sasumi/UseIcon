import { DEFAULT_CODE_TEMPLATE, DEFAULT_ICON_SIZE } from "@/config";
import { LIBRARY_ICON_MAP } from "@/data/library";
import type { Database } from "./db";
import type { IconItem, Project } from "@/types";

const DAY = 86_400_000;
const now = Date.now();

/** 公开示例项目：成员为空，任何登录用户/游客可只读浏览 */
const SAMPLE_PROJECT: Project = {
    id: "p-sample",
    name: "开源示例图标库（公开）",
    description: "对外公开的示例项目：登录用户与游客都可以浏览、复制代码，但不能修改。",
    ownerId: "",
    visibility: "public",
    allowGuest: true,
    iconSize: DEFAULT_ICON_SIZE,
    codeTemplate: DEFAULT_CODE_TEMPLATE,
    members: [],
    createdAt: now - 30 * DAY,
    updatedAt: now - 1 * DAY,
};

const SAMPLE_LIB_ICONS = ["code", "terminal", "grid", "list", "download", "upload", "link", "star"];

const buildSampleIcons = (): IconItem[] =>
    SAMPLE_LIB_ICONS.map((className, index) => {
        const libraryIcon = LIBRARY_ICON_MAP[`lib-${className}`];
        return {
            id: `i-sample-${className}`,
            projectId: SAMPLE_PROJECT.id,
            className: libraryIcon.className,
            svg: libraryIcon.svg,
            tags: libraryIcon.tags.slice(0, 2),
            libraryId: libraryIcon.id,
            createdBy: "",
            createdAt: now - 20 * DAY + index * 3600_000,
            updatedAt: now - 10 * DAY,
        };
    });

/** 创建初始数据库 */
export const createSeedDatabase = (version: number): Database => ({
    version,
    projects: [SAMPLE_PROJECT],
    icons: buildSampleIcons(),
    favorites: [],
    userSnapshots: {},
    starterProjects: [],
});

/** 新用户初始项目使用的图标（公共库 className） */
export const STARTER_ICON_NAMES = ["plus", "close", "check", "search", "arrow-right", "chevron-down", "user", "settings"];
