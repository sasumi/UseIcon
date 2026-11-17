import { useEffect, useState } from "react";
import type { DragEvent } from "react";
import { Toast } from "minreact-ui";
import { api } from "@/api";
import { cartItemsToInputs, useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { useIconDragStore } from "@/store/iconDragStore";
import { useProjectStore } from "@/store/projectStore";
import type { Project } from "@/types";
import { filterDuplicateIcons } from "@/utils/iconDedupe";
import { hasIconDragItems, takeIconDragItems } from "@/utils/iconDrag";
import { AppIcon } from "@/components/common/AppIcon";
import { EmptyState } from "@/components/common/EmptyState";
import { SvgPreview } from "@/components/common/SvgPreview";
import { ProjectPicker } from "@/components/project/ProjectPicker";
import { PANEL_WIDTH_STORAGE_PREFIX } from "@/config";
import { usePanelResize } from "@/hooks/usePanelResize";

/** 采集悬浮按钮（支持把图标 / 选中的多个图标拖到这里直接采集） */
export const CartFab = () => {
    const count = useCartStore((state) => state.items.length);
    const open = useCartStore((state) => state.open);
    const setOpen = useCartStore((state) => state.setOpen);
    const add = useCartStore((state) => state.add);
    const dragging = useIconDragStore((state) => state.dragging);
    const [dropTarget, setDropTarget] = useState(false);
    if (open) {
        return null;
    }

    const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
        event.preventDefault();
        setDropTarget(false);
        useIconDragStore.getState().setDragging(false);
        if (!hasIconDragItems(event.dataTransfer)) {
            return;
        }
        const items = takeIconDragItems();
        if (items.length === 0) {
            return;
        }
        let added = 0;
        items.forEach((item) => {
            if (add(item)) {
                added += 1;
            }
        });
        const ignored = items.length - added;
        if (added > 0) {
            Toast.showSuccess(`已采集 ${added} 个图标${ignored > 0 ? `，忽略 ${ignored} 个已在采集` : ""}`);
        } else {
            Toast.showInfo(`这 ${ignored} 个图标已在采集中`);
        }
    };

    return (
        <button
            className={`cart-fab ${dragging ? "is-drag-ready" : ""} ${dropTarget ? "is-drop-target" : ""}`}
            type="button"
            title={dragging ? "把图标拖到这里即可采集" : "采集：点击展开；拖入图标可直接采集"}
            onClick={() => setOpen(true)}
            onDragOver={(event) => {
                if (!hasIconDragItems(event.dataTransfer)) {
                    return;
                }
                setDropTarget(true);
                event.preventDefault();
                event.dataTransfer.dropEffect = "copy";
            }}
            onDragLeave={(event) => {
                // 进入子元素时也会触发 dragleave，用坐标判断是否真的离开了按钮
                const rect = event.currentTarget.getBoundingClientRect();
                const outside =
                    event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
                if (outside) {
                    setDropTarget(false);
                }
            }}
            onDrop={handleDrop}
        >
            <AppIcon name="cart" />
            {count > 0 && <span className="cart-fab__badge">{count}</span>}
        </button>
    );
};

/** 采集面板：收集公共库 / 项目图标，批量加入项目 */
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
            // 目标项目已有的图标（公共库 ID 或类名相同）直接跳过
            const projectIcons = await api.icons.listIcons(project.id);
            const { kept, ignored } = filterDuplicateIcons(cartItemsToInputs(items), projectIcons);
            if (kept.length === 0) {
                Toast.showInfo(`所选 ${ignored} 个图标都已在「${project.name}」中，已忽略`);
                return;
            }
            const created = await api.icons.createIcons(project.id, kept);
            Toast.showSuccess(
                `已把 ${created.length} 个图标加入「${project.name}」${ignored > 0 ? `，忽略 ${ignored} 个已存在的图标` : ""}`,
            );
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
                    <strong>采集</strong>
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
                        <EmptyState text="采集是空的：在公共库或项目图标上点击「采集」即可临时收藏" />
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
                                    <button className="ui-icon-btn small" type="button" title="移出采集" onClick={() => remove(item.key)}>
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
                        <p className="ui-note">登录后即可把采集里的图标批量加入项目。</p>
                    )}
                </footer>
            </aside>
        </>
    );
};
