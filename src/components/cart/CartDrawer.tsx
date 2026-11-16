import { useEffect, useState } from "react";
import { Toast } from "minreact-ui";
import { api } from "@/api";
import { cartItemsToInputs, useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { useProjectStore } from "@/store/projectStore";
import type { Project } from "@/types";
import { AppIcon } from "@/components/common/AppIcon";
import { EmptyState } from "@/components/common/EmptyState";
import { SvgPreview } from "@/components/common/SvgPreview";
import { ProjectPicker } from "@/components/project/ProjectPicker";
import { PANEL_WIDTH_STORAGE_PREFIX } from "@/config";
import { usePanelResize } from "@/hooks/usePanelResize";

/** 采集车悬浮按钮 */
export const CartFab = () => {
    const count = useCartStore((state) => state.items.length);
    const open = useCartStore((state) => state.open);
    const setOpen = useCartStore((state) => state.setOpen);
    if (open) {
        return null;
    }
    return (
        <button className="cart-fab" type="button" title="采集车：暂时收集图标，再批量加入项目" onClick={() => setOpen(true)}>
            <AppIcon name="cart" />
            {count > 0 && <span className="cart-fab__badge">{count}</span>}
        </button>
    );
};

/** 采集车面板：收集公共库 / 项目图标，批量加入项目 */
export const CartDrawer = () => {
    const items = useCartStore((state) => state.items);
    const open = useCartStore((state) => state.open);
    const setOpen = useCartStore((state) => state.setOpen);
    const remove = useCartStore((state) => state.remove);
    const clear = useCartStore((state) => state.clear);
    const user = useAuthStore((state) => state.user);
    const loadProjects = useProjectStore((state) => state.loadProjects);
    const [adding, setAdding] = useState(false);
    const { width, panelRef, resizerProps } = usePanelResize({
        storageKey: `${PANEL_WIDTH_STORAGE_PREFIX}cart`,
        defaultWidth: 352,
        min: 272,
        max: 640,
        direction: "right",
    });

    useEffect(() => {
        if (open && user) {
            void loadProjects();
        }
    }, [open, user, loadProjects]);

    const addDisabled = adding || items.length === 0;

    const addToProject = async (project: Project) => {
        if (addDisabled) {
            return;
        }
        setAdding(true);
        try {
            const created = await api.icons.createIcons(project.id, cartItemsToInputs(items));
            Toast.showSuccess(`已把 ${created.length} 个图标加入「${project.name}」`);
            clear();
            setOpen(false);
            void loadProjects();
        } catch (error) {
            Toast.showError(error instanceof Error ? error.message : "加入项目失败");
        } finally {
            setAdding(false);
        }
    };

    if (!open) {
        return null;
    }

    return (
        <>
            <div className="cart-mask" onClick={() => setOpen(false)} />
            <aside className="cart-drawer" ref={panelRef} style={width ? { width: `${width}px`, maxWidth: "100vw" } : undefined}>
                <div {...resizerProps} />
                <header className="cart-drawer__head">
                    <AppIcon name="cart" />
                    <strong>采集车</strong>
                    <span className="ui-chip">{items.length}</span>
                    <div className="spacer" />
                    <button className="ui-icon-btn" type="button" title="清空" onClick={clear} disabled={items.length === 0}>
                        <AppIcon name="trash" />
                    </button>
                    <button className="ui-icon-btn" type="button" title="关闭" onClick={() => setOpen(false)}>
                        <AppIcon name="close" />
                    </button>
                </header>

                <div className="cart-drawer__body">
                    {items.length === 0 ? (
                        <EmptyState text="采集车是空的：在公共库或项目图标上点击「采集」即可临时收藏" />
                    ) : (
                        <ul className="cart-list">
                            {items.map((item) => (
                                <li key={item.key} className="cart-item">
                                    <SvgPreview svg={item.svg} size={22} />
                                    <div className="cart-item__meta">
                                        <span className="cart-item__name">{item.className}</span>
                                        <span className="ui-note">{item.tags.length > 0 ? item.tags.join(" · ") : item.source === "library" ? "公共库" : "项目图标"}</span>
                                    </div>
                                    <span className="ui-chip">{item.source === "library" ? "公共库" : "项目"}</span>
                                    <button className="ui-icon-btn small" type="button" title="移出采集车" onClick={() => remove(item.key)}>
                                        <AppIcon name="close" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <footer className="cart-drawer__foot">
                    {user ? (
                        addDisabled ? (
                            <button className="ui-btn primary" type="button" disabled>
                                <AppIcon name="plus" />
                                {adding ? "加入中..." : "加入项目"}
                            </button>
                        ) : (
                            <ProjectPicker
                                editableOnly
                                emptyText="没有可编辑的项目，请先创建项目"
                                trigger={
                                    <span className="ui-btn primary">
                                        <AppIcon name="plus" />
                                        加入项目
                                    </span>
                                }
                                onSelect={(project) => void addToProject(project)}
                            />
                        )
                    ) : (
                        <p className="ui-note">登录后即可把采集车里的图标批量加入项目。</p>
                    )}
                </footer>
            </aside>
        </>
    );
};
