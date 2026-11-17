import { useEffect, useMemo, useRef, useState } from "react";
import { DIALOG_SIZE_SMALL, Dialog, DropdownMenu, LoadingHolder, Toast, useAsync } from "minreact-ui";
import type { MenuEntry } from "minreact-ui";
import type { FavoriteIcon, IconItem } from "@/types";
import { DEFAULT_ICON_SIZE, FAVORITES_SORT_STORAGE_KEY } from "@/config";
import { useClearOnBlankClick } from "@/hooks/useClearOnBlankClick";
import { useDialogForm } from "@/hooks/useDialogForm";
import { useDragSelect } from "@/hooks/useDragSelect";
import { useTimedTip } from "@/hooks/useTimedTip";
import { navigate } from "@/router/useRoute";
import { useAuthStore } from "@/store/authStore";
import { openLoginDialog } from "@/store/loginDialogStore";
import { cartItemFromFavorite, useCartStore } from "@/store/cartStore";
import { useLibraryStore } from "@/store/libraryStore";
import { rememberCategory } from "@/utils/category";
import { AppIcon } from "@/components/common/AppIcon";
import { CategoryInput } from "@/components/common/CategoryInput";
import { EmptyState } from "@/components/common/EmptyState";
import { SelectAllToggle } from "@/components/common/SelectAllToggle";
import { SvgPreview } from "@/components/common/SvgPreview";
import { TagEditor } from "@/components/common/TagEditor";
import { TipBubble } from "@/components/common/TipBubble";
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

/** 我的收藏：跨项目 / 公共库的个人图标集合，可打标签、采集、批量操作与拖动框选 */
export const FavoritesPage = () => {
    const user = useAuthStore((state) => state.user);
    const favorites = useLibraryStore((state) => state.favorites);
    const fetchFavorites = useLibraryStore((state) => state.fetchFavorites);
    const removeFavorite = useLibraryStore((state) => state.removeFavorite);
    const toggleCart = useCartStore((state) => state.toggle);
    const cartItems = useCartStore((state) => state.items);
    const { tip: cartTip, show: showCartTip } = useTimedTip();

    const [keyword, setKeyword] = useState("");
    const [category, setCategory] = useState("");
    const [sortMode, setSortMode] = useState<FavoritesSortMode>(readSortMode);
    const [selected, setSelected] = useState<string[]>([]);
    const [editing, setEditing] = useState<FavoriteIcon | null>(null);
    const [reloadToken, setReloadToken] = useState(0);
    const gridRef = useRef<HTMLUListElement | null>(null);

    // 收藏加载统一走 useAsync：加载中 / 出错 / 空数据互不混淆
    const favoritesState = useAsync(() => (user ? fetchFavorites() : Promise.resolve<FavoriteIcon[]>([])), [
        user?.id,
        reloadToken,
    ]);

    useClearOnBlankClick(() => setSelected((prev) => (prev.length === 0 ? prev : [])));

    const categories = useMemo(
        () => Array.from(new Set(favorites.map((item) => item.category || "").filter(Boolean))).sort((a, b) => a.localeCompare(b, "zh-CN")),
        [favorites],
    );

    const categoryCounts = useMemo(() => {
        const map: Record<string, number> = {};
        favorites.forEach((item) => {
            if (item.category) {
                map[item.category] = (map[item.category] || 0) + 1;
            }
        });
        return map;
    }, [favorites]);

    // 分类被清空后回到全部，避免筛选条件悬空
    useEffect(() => {
        if (category && !categories.includes(category)) {
            setCategory("");
        }
    }, [category, categories]);

    const filtered = useMemo(() => {
        const query = keyword.trim().toLowerCase();
        const result = favorites.filter((item) => {
            if (category && item.category !== category) {
                return false;
            }
            if (!query) {
                return true;
            }
            return (
                item.className.toLowerCase().includes(query) ||
                (item.category || "").toLowerCase().includes(query) ||
                item.tags.some((itemTag) => itemTag.toLowerCase().includes(query))
            );
        });
        if (sortMode === "default") {
            return result;
        }
        return [...result].sort((a, b) =>
            sortMode === "name-asc" ? a.className.localeCompare(b.className, "zh") : b.className.localeCompare(a.className, "zh"),
        );
    }, [favorites, keyword, category, sortMode]);

    const dragBox = useDragSelect({
        containerRef: gridRef,
        enabled: filtered.length > 0,
        onSelect: (ids, additive) => setSelected((prev) => (additive ? Array.from(new Set([...prev, ...ids])) : ids)),
    });

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
    const selectedCount = useMemo(() => filtered.filter((item) => selected.includes(item.id)).length, [filtered, selected]);

    /** 拖拽到采集按钮时携带的条目：拖的是选中项就带上全部选中 */
    const dragItemsOf = (favorite: FavoriteIcon) =>
        (selected.length > 1 && selected.includes(favorite.id) ? selectedFavorites : [favorite]).map(cartItemFromFavorite);

    const toggleSelect = (id: string, checked: boolean) => {
        setSelected((prev) => (checked ? Array.from(new Set([...prev, id])) : prev.filter((item) => item !== id)));
    };

    const toggleSelectAll = (checked: boolean) => {
        setSelected(checked ? filtered.map((item) => item.id) : []);
    };

    /** 批量采集：已在采集里的跳过 */
    const addSelectedToCart = () => {
        const keys = new Set(cartItems.map((item) => item.key));
        let added = 0;
        selectedFavorites.forEach((favorite) => {
            const item = cartItemFromFavorite(favorite);
            if (!keys.has(item.key)) {
                keys.add(item.key);
                toggleCart(item);
                added += 1;
            }
        });
        const ignored = selectedFavorites.length - added;
        showCartTip(
            added > 0
                ? `已采集 ${added} 个图标${ignored > 0 ? `，忽略 ${ignored} 个已存在` : ""}`
                : `所选 ${ignored} 个图标均已在采集中`,
        );
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
        iconId: favorite.id,
        projectId: "favorites",
        className: favorite.className,
        category: favorite.category,
        svg: favorite.svg,
        tags: favorite.tags,
        refId: favorite.refId,
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
                        <div className={`nav-item ${category === "" ? "active" : ""}`} onClick={() => setCategory("")}>
                            <AppIcon name="star" />
                            全部
                            <span className="nav-item__count">{favorites.length}</span>
                        </div>
                        {categories.map((item) => (
                            <div key={item} className={`nav-item ${category === item ? "active" : ""}`} onClick={() => setCategory(item)}>
                                <AppIcon name="folder" />
                                <span className="ellipsis">{item}</span>
                                <span className="nav-item__count">{categoryCounts[item] || 0}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </SidePanel>

            <div className="content-panel padded">
                <div className="content-toolbar project-toolbar">
                    <SelectAllToggle selected={selectedCount} total={filtered.length} onChange={toggleSelectAll} />
                    <div className="ui-search project-toolbar__search">
                        <AppIcon name="search" />
                        <input
                            className="ui-input"
                            type="search"
                            placeholder="搜索"
                            value={keyword}
                            onChange={(event) => setKeyword(event.target.value)}
                        />
                    </div>
                    {selected.length > 0 && (
                        <div className="batch-actions">
                            <span className="tip-anchor">
                                <button className="ui-btn small" type="button" onClick={addSelectedToCart}>
                                    <AppIcon name="cart" />
                                    采集
                                </button>
                                <TipBubble text={cartTip} />
                            </span>
                            <ExportMenu icons={exportIcons} projectName="我的收藏" size={DEFAULT_ICON_SIZE} label="导出" />
                            <button className="ui-btn small danger" type="button" onClick={removeSelected}>
                                <AppIcon name="trash" />
                                删除
                            </button>
                        </div>
                    )}
                    <div className="spacer" />
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

                {favoritesState.loading && favorites.length === 0 ? (
                    <LoadingHolder text="正在加载收藏..." />
                ) : favoritesState.error && favorites.length === 0 ? (
                    <EmptyState variant="error" text={favoritesState.error.message}>
                        <button className="ui-btn primary" type="button" onClick={() => setReloadToken((token) => token + 1)}>
                            重试
                        </button>
                    </EmptyState>
                ) : favorites.length === 0 ? (
                    <EmptyState text="还没有收藏：在公共库或项目图标上点击「收藏」即可">
                        <button className="ui-btn primary" type="button" onClick={() => navigate("/library")}>
                            去公共库看看
                        </button>
                    </EmptyState>
                ) : filtered.length === 0 ? (
                    <EmptyState text="没有匹配当前筛选的收藏" />
                ) : (
                    <ul ref={gridRef} className="icon-grid">
                        {filtered.map((favorite) => (
                            <li key={favorite.id} data-select-id={favorite.id}>
                                <IconCard
                                    icon={favorite}
                                    favorite
                                    inCart={cartItems.some((entry) => entry.key === cartItemFromFavorite(favorite).key)}
                                    selected={selected.includes(favorite.id)}
                                    selectable
                                    showOpenItem={false}
                                    dragItems={() => dragItemsOf(favorite)}
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

                {dragBox && (
                    <div
                        className="drag-select-box"
                        style={{ left: dragBox.left, top: dragBox.top, width: dragBox.width, height: dragBox.height }}
                    />
                )}
            </div>

            <FavoriteEditDialog
                favorite={editing}
                categories={categories}
                open={Boolean(editing)}
                setOpen={(open) => !open && setEditing(null)}
                onSaved={() => {
                    void fetchFavorites().catch((error: unknown) =>
                        Toast.showError(error instanceof Error ? error.message : "刷新收藏失败"),
                    );
                }}
            />
        </>
    );
};

/** 收藏编辑：名称 / 分类 / 标签 */
const FavoriteEditDialog = ({
    favorite,
    categories,
    open,
    setOpen,
    onSaved,
}: {
    favorite: FavoriteIcon | null; // 收藏项
    categories: string[]; // 已有分类（供快速选择）
    open: boolean; // 是否打开
    setOpen: (open: boolean) => void; // 显隐控制
    onSaved: () => void; // 保存回调
}) => {
    const updateFavorite = useLibraryStore((state) => state.updateFavorite);
    const [className, setClassName] = useState("");
    const [category, setCategory] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open && favorite) {
            setClassName(favorite.className);
            setCategory(favorite.category || "");
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
                category,
                tags,
            });
            rememberCategory(category);
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
                                <label>分类</label>
                                <CategoryInput value={category} onChange={setCategory} options={categories} />
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
