import { useEffect, useMemo, useState } from "react";
import { DIALOG_SIZE_NORMAL, Dialog, Select, Toast } from "minreact-ui";
import { api } from "@/api";
import { LIBRARY_DEFAULT_CATEGORY, sortLibraryCategories } from "@/data/library";
import { useAuthStore } from "@/store/authStore";
import { openLoginDialog } from "@/store/loginDialogStore";
import { cartItemFromLibrary, useCartStore } from "@/store/cartStore";
import { useLibraryStore } from "@/store/libraryStore";
import type { LibraryIcon } from "@/types";
import { copyText, downloadPng } from "@/utils/download";
import { AppIcon } from "@/components/common/AppIcon";
import { EmptyState } from "@/components/common/EmptyState";
import { SvgPreview } from "@/components/common/SvgPreview";
import { SidePanel } from "@/components/common/SidePanel";
import { TagEditor } from "@/components/common/TagEditor";
import { IconCard } from "@/components/project/IconCard";
import { BatchOptimizeDialog } from "@/components/project/BatchOptimizeDialog";
import { BatchRenameDialog } from "@/components/project/BatchRenameDialog";
import { UploadDialog } from "@/components/project/UploadDialog";
import { DisplayControl } from "@/components/library/DisplayPanel";

/** 公共图标库（数据来自后台，只有白名单用户能上传 / 编辑 / 批量操作 / 删除） */
export const LibraryPage = () => {
    const icons = useLibraryStore((state) => state.icons);
    const canEdit = useLibraryStore((state) => state.canEdit);
    const favorites = useLibraryStore((state) => state.favorites);
    const loading = useLibraryStore((state) => state.loading);
    const fetchAll = useLibraryStore((state) => state.fetchAll);
    const refreshIcons = useLibraryStore((state) => state.refreshIcons);
    const addFavorite = useLibraryStore((state) => state.addFavorite);
    const removeFavorite = useLibraryStore((state) => state.removeFavorite);
    const user = useAuthStore((state) => state.user);
    const cartItems = useCartStore((state) => state.items);
    const toggleCart = useCartStore((state) => state.toggle);
    const [keyword, setKeyword] = useState("");
    const [category, setCategory] = useState("");
    const [detail, setDetail] = useState<LibraryIcon | null>(null);
    const [selected, setSelected] = useState<string[]>([]);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [optimizeOpen, setOptimizeOpen] = useState(false);
    const [renameOpen, setRenameOpen] = useState(false);
    const [editing, setEditing] = useState<LibraryIcon | null>(null);

    useEffect(() => {
        void fetchAll();
    }, [fetchAll]);

    // 没有维护权限时清空选择，避免残留批量操作入口
    useEffect(() => {
        if (!canEdit) {
            setSelected([]);
        }
    }, [canEdit]);

    const categories = useMemo(() => sortLibraryCategories(icons.map((icon) => icon.category)), [icons]);

    const favoriteOf = (icon: LibraryIcon) => favorites.find((item) => item.libraryId === icon.id);
    const isFavorite = (icon: LibraryIcon) => Boolean(favoriteOf(icon));
    const inCart = (icon: LibraryIcon) => cartItems.some((item) => item.key === `library:${icon.id}`);

    const filtered = useMemo(() => {
        const query = keyword.trim().toLowerCase();
        return icons.filter((icon) => {
            if (category && icon.category !== category) {
                return false;
            }
            if (!query) {
                return true;
            }
            return icon.className.toLowerCase().includes(query) || icon.tags.some((tag) => tag.toLowerCase().includes(query));
        });
    }, [icons, category, keyword]);

    const countByCategory = useMemo(() => {
        const map: Record<string, number> = {};
        icons.forEach((icon) => {
            map[icon.category] = (map[icon.category] || 0) + 1;
        });
        return map;
    }, [icons]);

    const allSelected = filtered.length > 0 && filtered.every((icon) => selected.includes(icon.id));
    const selectedIcons = useMemo(() => icons.filter((icon) => selected.includes(icon.id)), [icons, selected]);

    const toggleSelect = (iconId: string, checked: boolean) => {
        setSelected((prev) => (checked ? Array.from(new Set([...prev, iconId])) : prev.filter((id) => id !== iconId)));
    };

    const toggleSelectAll = (checked: boolean) => {
        setSelected(checked ? filtered.map((icon) => icon.id) : []);
    };

    const toggleFavorite = (icon: LibraryIcon) => {
        if (!user) {
            Toast.showInfo("登录后即可收藏图标");
            openLoginDialog();
            return;
        }
        const existed = favoriteOf(icon);
        if (existed) {
            void removeFavorite(existed.id).catch((error: unknown) =>
                Toast.showError(error instanceof Error ? error.message : "操作失败"),
            );
            return;
        }
        void addFavorite({ className: icon.className, svg: icon.svg, tags: icon.tags.slice(0, 3), source: "library", libraryId: icon.id }).catch(
            (error: unknown) => Toast.showError(error instanceof Error ? error.message : "收藏失败"),
        );
    };

    const toggleCartItem = (icon: LibraryIcon) => {
        toggleCart(cartItemFromLibrary(icon));
    };

    const removeIcons = (iconIds: string[]) => {
        if (iconIds.length === 0) {
            return;
        }
        void Dialog.confirm({
            title: "删除公共库图标",
            message: `确定从公共图标库删除选中的 ${iconIds.length} 个图标吗？此操作不可恢复。`,
            confirmText: "删除",
        })
            .then(() =>
                api.library
                    .deleteLibraryIcons(iconIds)
                    .then(() => {
                        setSelected((prev) => prev.filter((id) => !iconIds.includes(id)));
                        setDetail(null);
                        Toast.showSuccess("已删除所选图标");
                        void refreshIcons();
                    })
                    .catch((error: unknown) => Toast.showError(error instanceof Error ? error.message : "删除失败")),
            )
            .catch(() => undefined);
    };

    const saveEdited = async (patch: { className: string; category: string; tags: string[] }) => {
        if (!editing) {
            return;
        }
        const saved = await api.library.updateLibraryIcon(editing.id, patch);
        await refreshIcons();
        setDetail((prev) => (prev && prev.id === saved.id ? saved : prev));
        setEditing(null);
        Toast.showSuccess(`已保存 ${saved.className}`);
    };

    return (
        <>
            <SidePanel storageKey="library" defaultWidth={240} minWidth={180}>
                <div className="side-panel__header">
                    公共图标库
                    <div className="spacer" />
                    <span className="ui-note">{icons.length}</span>
                </div>
                <div className="side-panel__body">
                    <div className="nav-list">
                        <div className={`nav-item ${category === "" ? "active" : ""}`} onClick={() => setCategory("")}>
                            <AppIcon name="grid" />
                            全部
                            <span className="nav-item__count">{icons.length}</span>
                        </div>
                        {categories.map((item) => (
                            <div key={item} className={`nav-item ${category === item ? "active" : ""}`} onClick={() => setCategory(item)}>
                                <AppIcon name="tag" />
                                {item}
                                <span className="nav-item__count">{countByCategory[item] || 0}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </SidePanel>

            <div className="content-panel padded">
                <div className="content-toolbar">
                    <div className="ui-search">
                        <AppIcon name="search" />
                        <input
                            className="ui-input"
                            placeholder="搜索"
                            value={keyword}
                            onChange={(event) => setKeyword(event.target.value)}
                        />
                    </div>
                    <div className="toolbar">
                        {categories.slice(0, 3).map((item) => (
                            <span
                                key={item}
                                className={`category-chip ${category === item ? "active" : ""}`}
                                onClick={() => setCategory(category === item ? "" : item)}
                            >
                                {item}
                            </span>
                        ))}
                    </div>
                    <div className="spacer" />
                    <span className="ui-note">共 {filtered.length} 个图标</span>
                    {canEdit && (
                        <button className="ui-btn small" type="button" onClick={() => setUploadOpen(true)}>
                            <AppIcon name="upload" />
                            上传图标
                        </button>
                    )}
                    <DisplayControl />
                </div>

                {canEdit && filtered.length > 0 && (
                    <div className="content-toolbar project-toolbar">
                        <label className="ui-row ui-note">
                            <input type="checkbox" checked={allSelected} onChange={(event) => toggleSelectAll(event.target.checked)} />
                            全选（{filtered.length}）
                        </label>
                        {selected.length > 0 && (
                            <div className="batch-actions">
                                <span className="batch-actions__count">已选 {selected.length} 个</span>
                                <button className="ui-btn small" type="button" onClick={() => setOptimizeOpen(true)}>
                                    <AppIcon name="settings" />
                                    优化
                                </button>
                                <button className="ui-btn small" type="button" onClick={() => setRenameOpen(true)}>
                                    <AppIcon name="edit" />
                                    重命名
                                </button>
                                <button className="ui-btn small danger" type="button" onClick={() => removeIcons(selected)}>
                                    <AppIcon name="trash" />
                                    删除
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {loading && icons.length === 0 ? (
                    <div className="ui-loading">正在加载公共图标库...</div>
                ) : filtered.length === 0 ? (
                    <EmptyState text="没有匹配的图标，换个关键词试试" icon="search" />
                ) : (
                    <ul className="icon-grid">
                        {filtered.map((icon) => (
                            <li key={icon.id}>
                                <IconCard
                                    icon={icon}
                                    favorite={isFavorite(icon)}
                                    inCart={inCart(icon)}
                                    showOpenItem={false}
                                    selectable={canEdit}
                                    selected={selected.includes(icon.id)}
                                    canEdit={canEdit}
                                    editLabel="编辑图标"
                                    deleteLabel="删除"
                                    onToggleSelect={(checked) => toggleSelect(icon.id, checked)}
                                    onOpen={() => setDetail(icon)}
                                    onFavorite={() => toggleFavorite(icon)}
                                    onCart={() => toggleCartItem(icon)}
                                    onEdit={canEdit ? () => setEditing(icon) : undefined}
                                    onDelete={canEdit ? () => removeIcons([icon.id]) : undefined}
                                    onCopySvg={() =>
                                        void copyText(icon.svg).then(
                                            () => Toast.showSuccess("SVG 源码已复制"),
                                            () => Toast.showError("复制失败"),
                                        )
                                    }
                                    onDownloadPng={() => void downloadPng(icon).catch(() => Toast.showError("PNG 下载失败"))}
                                />
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <LibraryIconDialog
                icon={detail}
                open={Boolean(detail)}
                setOpen={(open) => !open && setDetail(null)}
                favorite={detail ? isFavorite(detail) : false}
                inCart={detail ? inCart(detail) : false}
                canEdit={canEdit}
                onFavorite={() => detail && toggleFavorite(detail)}
                onCart={() => detail && toggleCartItem(detail)}
                onEdit={() => detail && setEditing(detail)}
                onDelete={() => detail && removeIcons([detail.id])}
            />

            <UploadDialog open={uploadOpen} setOpen={setUploadOpen} target="library" onImported={() => void refreshIcons()} />

            <BatchOptimizeDialog
                open={optimizeOpen}
                setOpen={setOptimizeOpen}
                iconIds={selected}
                defaultSize={24}
                optimize={(_, options) => api.library.optimizeLibraryIcons(selectedIcons, options)}
                onDone={() => {
                    setSelected([]);
                    void refreshIcons();
                }}
            />

            <BatchRenameDialog
                open={renameOpen}
                setOpen={setRenameOpen}
                iconIds={selected}
                rename={(_, options) => api.library.renameLibraryIcons(selectedIcons, options)}
                onDone={() => {
                    setSelected([]);
                    void refreshIcons();
                }}
            />

            <LibraryEditDialog icon={editing} categories={categories} onClose={() => setEditing(null)} onSave={saveEdited} />
        </>
    );
};

/** 公共库图标编辑（维护者）：类名 / 分类 / 标签 */
const LibraryEditDialog = ({
    icon,
    categories,
    onClose,
    onSave,
}: {
    icon: LibraryIcon | null; // 当前编辑的图标
    categories: string[]; // 可选分类
    onClose: () => void; // 关闭
    onSave: (patch: { className: string; category: string; tags: string[] }) => Promise<void>; // 保存
}) => {
    const [className, setClassName] = useState("");
    const [category, setCategory] = useState(LIBRARY_DEFAULT_CATEGORY);
    const [tags, setTags] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (icon) {
            setClassName(icon.className);
            setCategory(icon.category || LIBRARY_DEFAULT_CATEGORY);
            setTags(icon.tags);
        }
    }, [icon]);

    if (!icon) {
        return null;
    }

    const submit = async () => {
        if (saving || className.trim() === "") {
            Toast.showWarning("请输入图标类名");
            return;
        }
        setSaving(true);
        try {
            await onSave({ className, category, tags });
        } catch (error) {
            Toast.showError(error instanceof Error ? error.message : "保存失败");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={Boolean(icon)} setOpen={(open) => !open && onClose()} width={DIALOG_SIZE_NORMAL} clickMaskerToClose>
            <Dialog.Title>编辑公共库图标</Dialog.Title>
            <Dialog.Content>
                <div className="dialog-body">
                    <div className="detail-preview">
                        <SvgPreview svg={icon.svg} size={64} />
                    </div>
                    <div className="ui-form">
                        <div className="ui-field">
                            <label htmlFor="library-icon-name">类名（css）</label>
                            <input
                                id="library-icon-name"
                                className="ui-input"
                                value={className}
                                onChange={(event) => setClassName(event.target.value)}
                            />
                        </div>
                        <div className="ui-field">
                            <label>分类</label>
                            <Select
                                items={sortLibraryCategories([...categories, category]).map((item) => ({
                                    value: item,
                                    label: item,
                                    icon: <AppIcon name="tag" />,
                                }))}
                                value={category}
                                onChange={(value) => typeof value === "string" && setCategory(value)}
                                triggerClassName="ui-btn small select-like has-value"
                            />
                        </div>
                        <div className="ui-field">
                            <label>标签</label>
                            <TagEditor value={tags} onChange={setTags} />
                        </div>
                    </div>
                </div>
            </Dialog.Content>
            <Dialog.Action align="right">
                <button className="ui-btn" type="button" onClick={onClose}>
                    取消
                </button>
                <button className="ui-btn primary" type="button" disabled={saving} onClick={() => void submit()}>
                    {saving ? "保存中..." : "保存"}
                </button>
            </Dialog.Action>
        </Dialog>
    );
};

/** 公共库图标详情 */
const LibraryIconDialog = ({
    icon,
    open,
    setOpen,
    favorite,
    inCart,
    canEdit,
    onFavorite,
    onCart,
    onEdit,
    onDelete,
}: {
    icon: LibraryIcon | null; // 当前图标
    open: boolean; // 是否打开
    setOpen: (open: boolean) => void; // 显隐控制
    favorite: boolean; // 是否已收藏
    inCart: boolean; // 是否已在采集车
    canEdit: boolean; // 是否可维护公共库
    onFavorite: () => void; // 收藏切换
    onCart: () => void; // 采集车切换
    onEdit: () => void; // 编辑
    onDelete: () => void; // 删除
}) => {
    if (!icon) {
        return null;
    }
    return (
        <Dialog open={open} setOpen={setOpen} width={DIALOG_SIZE_NORMAL} clickMaskerToClose>
            <Dialog.Title>{icon.className}</Dialog.Title>
            <Dialog.Content>
                <div className="dialog-body">
                    <div className="detail-preview">
                        <SvgPreview svg={icon.svg} size={72} />
                    </div>
                    <div className="toolbar">
                        <button className={`ui-btn small ${favorite ? "primary" : ""}`} type="button" onClick={onFavorite}>
                            <AppIcon name="star" />
                            {favorite ? "已收藏" : "收藏"}
                        </button>
                        <button className={`ui-btn small ${inCart ? "primary" : ""}`} type="button" onClick={onCart}>
                            <AppIcon name="cart" />
                            {inCart ? "已在采集车" : "采集"}
                        </button>
                        <button
                            className="ui-btn small"
                            type="button"
                            onClick={() =>
                                void copyText(icon.svg).then(
                                    () => Toast.showSuccess("SVG 源码已复制"),
                                    () => Toast.showError("复制失败"),
                                )
                            }
                        >
                            <AppIcon name="copy" />
                            复制 SVG
                        </button>
                        <span className="ui-chip">{icon.category}</span>
                    </div>
                    <pre className="code-block">{icon.svg}</pre>
                    <p className="ui-note">标签：{icon.tags.length > 0 ? icon.tags.join("、") : "无"}</p>
                </div>
            </Dialog.Content>
            <Dialog.Action align="left">
                {canEdit && (
                    <button className="ui-btn danger" type="button" onClick={onDelete}>
                        <AppIcon name="trash" />
                        删除
                    </button>
                )}
            </Dialog.Action>
            <Dialog.Action align="right">
                {canEdit && (
                    <button className="ui-btn" type="button" onClick={onEdit}>
                        <AppIcon name="edit" />
                        编辑
                    </button>
                )}
                <button className="ui-btn" type="button" onClick={() => setOpen(false)}>
                    关闭
                </button>
            </Dialog.Action>
        </Dialog>
    );
};
