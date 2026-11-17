/** 图标去重键：来源图标 ID 优先，其次类名（小写） */
export const iconKeyOf = (icon: { className: string; refId?: string }): string =>
    icon.refId ? `ref:${icon.refId}` : `class:${icon.className.trim().toLowerCase()}`;

/** 收藏去重键：来源图标 ID 优先，其次项目 + 类名 */
export const favoriteKeyOf = (icon: { className: string; refId?: string; projectId?: string }): string => {
    if (icon.refId) {
        return `ref:${icon.refId}`;
    }
    if (icon.projectId) {
        return `project:${icon.projectId}:${icon.className.trim().toLowerCase()}`;
    }
    return `class:${icon.className.trim().toLowerCase()}`;
};

/**
 * 剔除已存在 / 本批重复的候选图标（来源图标 ID 或类名相同都算重复）
 * @param candidates 待加入的图标
 * @param existing 目标项目已有图标
 */
export const filterDuplicateIcons = <T extends { className: string; refId?: string }>(
    candidates: T[],
    existing: { className: string; refId?: string }[],
): { kept: T[]; ignored: number } => {
    const keys = new Set(existing.map(iconKeyOf));
    const names = new Set(existing.map((icon) => icon.className.trim().toLowerCase()));
    const kept: T[] = [];
    let ignored = 0;

    candidates.forEach((icon) => {
        const key = iconKeyOf(icon);
        const name = icon.className.trim().toLowerCase();
        if (keys.has(key) || names.has(name)) {
            ignored += 1;
            return;
        }
        keys.add(key);
        names.add(name);
        kept.push(icon);
    });

    return { kept, ignored };
};
