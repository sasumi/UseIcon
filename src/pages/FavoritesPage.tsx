import { useEffect, useMemo, useState } from "react";
import { DIALOG_SIZE_SMALL, Dialog, DropdownMenu, Toast } from "minreact-ui";
import type { MenuEntry } from "minreact-ui";
import type { FavoriteIcon, IconItem } from "@/types";
import { DEFAULT_ICON_SIZE, FAVORITES_SORT_STORAGE_KEY } from "@/config";
import { useDialogForm } from "@/hooks/useDialogForm";
import { navigate } from "@/router/useRoute";
import { useAuthStore } from "@/store/authStore";
import { openLoginDialog } from "@/store/loginDialogStore";
import { cartItemFromFavorite, useCartStore } from "@/store/cartStore";
import { collectFavoriteTags, useLibraryStore } from "@/store/libraryStore";
import { AppIcon } from "@/components/common/AppIcon";
import { EmptyState } from "@/components/common/EmptyState";
import { SvgPreview } from "@/components/common/SvgPreview";
import { TagEditor } from "@/components/common/TagEditor";
import { SidePanel } from "@/components/common/SidePanel";
import { ExportMenu } from "@/components/project/ExportMenu";
import { IconCard } from "@/components/project/IconCard";
import { DisplayControl } from "@/components/library/DisplayPanel";

type FavoritesSortMode = "default" | "name-asc" | "name-desc";

const SORT_ITEMS: MenuEntry[] = [
    { value: "default", label: "默认顺序", icon: <AppIcon name="layers" /> },
    { value: "name-asc", label: "名称 A → Z", icon: <AppIcon name="arrow-down" /> },
    { value: "name-desc", label: "名称 Z → A", icon: <AppIcon name="arrow-up" /> },
];

const SORT_LABELS: Record<FavoritesSortMode, string> = {
    default: "默认顺序",
    "name-asc": "名称 A → Z",
    "name-desc": "名称 Z → A",
};

const readSortMode = (): FavoritesSortMode => {
    try {
        const saved = localStorage.getItem(FAVORITES_SORT_STORAGE_KEY);
        return saved && saved in SORT_LABELS ? (saved as FavoritesSortMode) : "default";
    } catch {
        return "default";
    }
};

/** 我的收藏：跨项目 / 公共库的个人图标集合，可打标签、采集 */
export const FavoritesPage = () => {
    const user = useAuthStore((state) => state.user);
    const favorites = useLibraryStore((state) => state.favorites);
    const fetchFavorites = useLibraryStore((state) => state.fetchFavorites);
    const removeFavorite = useLibraryStore((state) => state.removeFavorite);
    const toggleCart = useCartStore((state) => state.toggle);
    const cartItems = useCartStore((state) => state.items);

    const [keyword, setKeyword] = useState("");
    const [tag, setTag] = useState("");
    const [sortMode, setSortMode] = useState<FavoritesSortMode>(readSortMode);
    const [selected, setSelected] = useState<string[]>([]);
    const [editing, setEditing] = useState<FavoriteIcon | null>(null);

    useEffect(() => {
        if (user) {
            void fetchFavorites();
        }
    }, [user, fetchFavorites]);

    const tags = useMemo(() => collectFavoriteTags(favorites), [favorites]);

    const tagCounts = useMemo(() => {
        const map: Record<string, number> = {};
        favorites.forEach((item) => {
            item.tags.forEach((itemTag) => {
                map[itemTag] = (map[itemTag] || 0) + 1;
            });
        });
        return map;
    }, [favorites]);

    // 标签被删掉后回到全部，避免筛选条件悬空
    useEffect(() => {
        if (tag && !tags.includes(tag)) {
            setTag("");
        }
    }, [tag, tags]);

    const filtered = useMemo(() => {
        const query = keyword.trim().toLowerCase();
        const result = favorites.filter((item) => {
            if (tag && !item.tags.includes(tag)) {
                return false;
            }
            if (!query) {
                return true;
            }
            return item.className.toLowerCase().includes(query) || item.tags.some((itemTag) => itemTag.toLowerCase().includes(query));
        });
        if (sortMode === "default") {
            return result;
        }
        return [...result].sort((a, b) =>
            sortMode === "name-asc" ? a.className.localeCompare(b.className, "zh") : b.className.localeCompare(a.className, "zh"),
        );
    }, [favorites, keyword, tag, sortMode]);

    const changeSortMode = (next: FavoritesSortMode) => {
        setSortMode(next);
        try {
            localStorage.setItem(FAVORITES_SORT_STORAGE_KEY, next);
        } catch {
            // 忽略存储异常
        }
    };

    const addToCart = (favorite: FavoriteIcon) => {
        toggleCart(cartItemFromFavorite(favorite));
    };

    const selectedFavorites = useMemo(() => favorites.filter((item) => selected.includes(item.id)), [favorites, selected]);
    const allSelected = filtered.length > 0 && filtered.every((item) => selected.includes(item.id));

    const toggleSelect = (id: string, checked: boolean) => {
        setSelected((prev) => (checked ? Array.from(new Set([...prev, id])) : prev.filter((item) => item !== id)));
    };

    const toggleSelectAll = (checked: boolean) => {
        setSelected(checked ? filtered.map((item) => item.id) : []);
    };

    /** 批量采集：已在采集车里的跳过 */
    const addSelectedToCart = () => {
        const keys = new Set(cartItems.map((item) => item.key));
        selectedFavorites.forEach((favorite) => {
            const item = cartItemFromFavorite(favorite);
            if (!keys.has(item.key)) {
                keys.add(item.key);
                toggleCart(item);
            }
        });
        Toast.showSuccess(`已加入采集车 ${selectedFavorites.length} 个图标`);
    };

    /** 批量移除收藏 */
    const removeSelected = () => {
        if (selected.length === 0) {
            return;
        }
        void Dialog.confirm({
            title: "移除收藏",
            message: `确定从收藏中移除选中的 ${selected.length} 个图标吗？`,
            confirmText: "移除",
        }).then(() => {
            void Promise.all(selected.map((id) => removeFavorite(id)))
                .then(() => {
                    Toast.showSuccess(`已移除 ${selected.length} 个收藏`);
                    setSelected([]);
                })
                .catch((error: unknown) => Toast.showError(error instanceof Error ? error.message : "移除失败"));
        }).catch(() => undefined);
    };

    /** 导出用：收藏项转为图标结构 */
    const exportIcons: IconItem[] = selectedFavorites.map((favorite) => ({
        id: favorite.id,
        projectId: "favorites",
        className: favorite.className,
        svg: favorite.svg,
        tags: favorite.tags,
        createdBy: favorite.userId,
        createdAt: favorite.createdAt,
        updatedAt: favorite.createdAt,
    }));

    if (!user) {
        return (
            <div className="content-panel padded">
                <EmptyState text="登录后即可看到你的收藏">
                    <button className="ui-btn primary" type="button" onClick={() => openLoginDialog()}>
                        去登录
                    </button>
                </EmptyState>
            </div>
        );
    }

    return (
        <>
            <SidePanel storageKey="favorites" defaultWidth={232} minWidth={176}>
                <div className="side-panel__header">
                    我的收藏
                    <div className="spacer" />
                    <span className="ui-note">{favorites.length}</span>
                </div>
                <div className="side-panel__body">
                    <div className="nav-list">
                        <div className={`nav-item ${tag === "" ? "active" : ""}`} onClick={() => setTag("")}>
                            <AppIcon name="star" />
                            全部
                            <span className="nav-item__count">{favorites.length}</span>
                        </div>
                        {tags.map((item) => (
                            <div key={item} className={`nav-item ${tag === item ? "active" : ""}`} onClick={() => setTag(item)}>
                                <AppIcon name="tag" />
                                <span className="ellipsis">{item}</span>
                                <span className="nav-item__count">{tagCounts[item] || 0}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </SidePanel>

            <div className="content-panel padded">
                <div className="content-toolbar project-toolbar">
                    {filtered.length > 0 && (
                        <label className="ui-row ui-note">
                            <input type="checkbox" checked={allSelected} onChange={(event) => toggleSelectAll(event.target.checked)} />
                            全选（{filtered.length}）
                        </label>
                    )}
                    <div className="ui-search project-toolbar__search">
                        <AppIcon name="search" />
                        <input className="ui-input" placeholder="搜索" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
                    </div>
                    {selected.length > 0 && (
                        <div className="batch-actions">
                            <span className="batch-actions__count">已选 {selected.length} 个</span>
                            <button className="ui-btn small" type="button" onClick={addSelectedToCart}>
                                <AppIcon name="cart" />
                                采集
                            </button>
                            <ExportMenu icons={exportIcons} projectName="我的收藏" size={DEFAULT_ICON_SIZE} label="导出" />
                            <button className="ui-btn small danger" type="button" onClick={removeSelected}>
                                <AppIcon name="trash" />
                                删除
                            </button>
                        </div>
                    )}
                    <div className="spacer" />
                    <span className="ui-note">
                        {filtered.length} / {favorites.length}
                    </span>
                    <DropdownMenu
                        items={SORT_ITEMS}
                        value={sortMode}
                        onChange={(value) => changeSortMode(value as FavoritesSortMode)}
                        trigger={
                            <button className="ui-btn small button-tonal" type="button" title="排序方式">
                                <AppIcon name="layers" />
                                {SORT_LABELS[sortMode]}
                            </button>
                        }
                    />
                    <DisplayControl />
                </div>

                {favorites.length === 0 ? (
                    <EmptyState text="还没有收藏：在公共库或项目图标上点击「收藏」即可">
                        <button className="ui-btn primary" type="button" onClick={() => navigate("/library")}>
                            去公共库看看
                        </button>
                    </EmptyState>
                ) : filtered.length === 0 ? (
                    <EmptyState text="没有匹配当前筛选的收藏" />
                ) : (
                    <ul className="icon-grid">
                        {filtered.map((favorite) => (
                            <li key={favorite.id}>
                                <IconCard
                                    icon={favorite}
                                    favorite
                                    inCart={cartItems.some((entry) => entry.key === cartItemFromFavorite(favorite).key)}
                                    selected={selected.includes(favorite.id)}
                                    selectable
                                    showOpenItem={false}
                                    onToggleSelect={(checked) => toggleSelect(favorite.id, checked)}
                                    onOpen={() => setEditing(favorite)}
                                    onFavorite={() => {
                                        void removeFavorite(favorite.id).catch((error: unknown) =>
                                            Toast.showError(error instanceof Error ? error.message : "移除失败"),
                                        );
                                    }}
                                    onCart={() => addToCart(favorite)}
                                />
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <FavoriteEditDialog
                favorite={editing}
                open={Boolean(editing)}
                setOpen={(open) => !open && setEditing(null)}
                onSaved={() => {
                    void fetchFavorites();
                }}
            />
        </>
    );
};

/** 收藏编辑：名称 / 标题 / 标签 */
const FavoriteEditDialog = ({
    favorite,
    open,
    setOpen,
    onSaved,
}: {
    favorite: FavoriteIcon | null; // 收藏项
    open: boolean; // 是否打开
    setOpen: (open: boolean) => void; // 显隐控制
    onSaved: () => void; // 保存回调
}) => {
    const updateFavorite = useLibraryStore((state) => state.updateFavorite);
    const [className, setClassName] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open && favorite) {
            setClassName(favorite.className);
            setTags(favorite.tags);
        }
    }, [open, favorite]);

    const save = async () => {
        if (!favorite) {
            return;
        }
        setSaving(true);
        try {
            await updateFavorite(favorite.id, {
                className,
                tags,
            });
            Toast.showSuccess("收藏已更新");
            onSaved();
            setOpen(false);
        } catch (error) {
            Toast.showError(error instanceof Error ? error.message : "保存失败");
        } finally {
            setSaving(false);
        }
    };

    const { formProps, submitProps } = useDialogForm(() => void save());

    if (!favorite) {
        return null;
    }

    return (
        <Dialog open={open} setOpen={setOpen} width={DIALOG_SIZE_SMALL} clickMaskerToClose>
            <Dialog.Title>编辑收藏</Dialog.Title>
            <Dialog.Content>
                <form {...formProps}>
                    <div className="dialog-body">
                        <div className="detail-preview">
                            <SvgPreview svg={favorite.svg} size={56} />
                        </div>
                        <div className="ui-form">
                            <div className="ui-field">
                                <label>className</label>
                                <input className="ui-input" value={className} onChange={(event) => setClassName(event.target.value)} />
                            </div>
                            <div className="ui-field">
                                <label>标签</label>
                                <TagEditor value={tags} onChange={setTags} />
                            </div>
                            <p className="ui-note">来源：{favorite.source === "library" ? "公共库" : "项目"}，收藏时间 {new Date(favorite.createdAt).toLocaleString()}</p>
                        </div>
                    </div>
                </form>
            </Dialog.Content>
            <Dialog.Action align="right">
                <button className="ui-btn" type="button" onClick={() => setOpen(false)}>
                    取消
                </button>
                <button className="ui-btn primary" {...submitProps} disabled={saving}>
                    {saving ? "保存中..." : "保存"}
                </button>
            </Dialog.Action>
        </Dialog>
    );
};
