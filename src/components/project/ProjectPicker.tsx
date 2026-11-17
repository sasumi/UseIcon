import { useEffect, useMemo, useState, type ReactNode } from "react";
import { EmptyHolder, LoadingHolder, Menu, Popover } from "minreact-ui";
import type { MenuEntry } from "minreact-ui";
import { api } from "@/api";
import { ACCESS_TYPE_PUBLIC } from "@/config";
import { useAuthStore } from "@/store/authStore";
import type { Project } from "@/types";
import { getProjectAccess } from "@/utils/permission";
import { AppIcon } from "@/components/common/AppIcon";

/** 未搜索时展示的最近项目数量 */
const RECENT_LIMIT = 10;

/**
 * 项目选择菜单：顶部搜索框，下方默认列出最近 10 个项目
 * 应用内所有「选项目」的地方统一使用它
 */
export const ProjectPicker = ({
    trigger,
    onSelect,
    currentId,
    editableOnly = false,
    disabled = false,
    placeholder = "搜索项目",
    emptyText = "暂无可选项目",
}: {
    trigger: ReactNode; // 触发元素
    onSelect: (project: Project) => void; // 选中项目后回调
    currentId?: string; // 当前项目 ID（列表中禁选）
    editableOnly?: boolean; // 只列出当前用户可编辑的项目
    disabled?: boolean; // 禁用弹层
    placeholder?: string; // 搜索框占位文字
    emptyText?: string; // 没有可选项目时的提示
}) => {
    const user = useAuthStore((state) => state.user);
    const [open, setOpen] = useState(false);
    const [keyword, setKeyword] = useState("");
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(false);

    // 每次展开都取全量项目，避免复用分页列表导致只看到首页数据
    useEffect(() => {
        if (!open) {
            return;
        }
        let alive = true;
        setLoading(true);
        void api.projects
            .listProjects()
            .then((list) => alive && setProjects(list))
            .catch(() => alive && setProjects([]))
            .finally(() => alive && setLoading(false));
        return () => {
            alive = false;
        };
    }, [open]);

    const visible = useMemo(() => {
        const allowed = projects.filter((project) => !editableOnly || getProjectAccess(project, user).canEdit);
        const query = keyword.trim().toLowerCase();
        if (!query) {
            return allowed.slice(0, RECENT_LIMIT);
        }
        return allowed.filter((project) => project.name.toLowerCase().includes(query));
    }, [projects, editableOnly, user, keyword]);

    const items: MenuEntry[] = visible.map((project) => ({
        value: project.id,
        label: project.name,
        icon: <AppIcon name={project.accessType === ACCESS_TYPE_PUBLIC ? "globe" : "lock"} />,
        disabled: project.id === currentId,
    }));

    const selectProject = (projectId: string) => {
        const project = projects.find((item) => item.id === projectId);
        setOpen(false);
        setKeyword("");
        if (project) {
            onSelect(project);
        }
    };

    const handleOpenChange = (next: boolean) => {
        if (disabled) {
            return;
        }
        setOpen(next);
        if (!next) {
            setKeyword("");
        }
    };

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <Popover.Trigger className="project-picker__trigger" aria-disabled={disabled}>
                {trigger}
            </Popover.Trigger>
            <Popover.Content className="project-picker">
                <div className="project-picker__search">
                    <AppIcon name="search" />
                    <input
                        className="project-picker__input"
                        type="search"
                        placeholder={placeholder}
                        value={keyword}
                        autoFocus
                        onChange={(event) => setKeyword(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter" && visible.length > 0) {
                                event.preventDefault();
                                selectProject(visible[0].id);
                            }
                        }}
                    />
                </div>
                <div className="project-picker__list">
                    {loading ? (
                        <LoadingHolder text="正在加载项目..." />
                    ) : items.length === 0 ? (
                        <EmptyHolder text={keyword.trim() ? "没有匹配的项目" : emptyText} />
                    ) : (
                        <Menu items={items} onChange={(value) => selectProject(String(value))} />
                    )}
                </div>
            </Popover.Content>
        </Popover>
    );
};
