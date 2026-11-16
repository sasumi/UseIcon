import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DropdownMenu, LoadingHolder, Toast } from "minreact-ui";
import type { MenuEntry } from "minreact-ui";
import { api } from "@/api";
import { LIBRARY_SORT_STORAGE_KEY } from "@/config";
import { sortLibraryCategories } from "@/data/library";
import { useClearOnBlankClick } from "@/hooks/useClearOnBlankClick";
import { useDragSelect } from "@/hooks/useDragSelect";
import { useTimedTip } from "@/hooks/useTimedTip";
import { useAuthStore } from "@/store/authStore";
import { openLoginDialog } from "@/store/loginDialogStore";
import { cartItemFromLibrary, useCartStore } from "@/store/cartStore";
import { useLibraryStore } from "@/store/libraryStore";
import type { LibraryIcon } from "@/types";
import { copyText, downloadPng } from "@/utils/download";
import { AppIcon } from "@/components/common/AppIcon";
import { EmptyState } from "@/components/common/EmptyState";
import { SidePanel } from "@/components/common/SidePanel";
import { TipBubble } from "@/components/common/TipBubble";
import { IconCard } from "@/components/project/IconCard";
import { IconDetailDialog } from "@/components/project/IconDetailDialog";
import type { IconDetailPatch } from "@/components/project/IconDetailDialog";
import { BatchOptimizeDialog } from "@/components/project/BatchOptimizeDialog";
import { BatchRenameDialog } from "@/components/project/BatchRenameDialog";
import { UploadDialog } from "@/components/project/UploadDialog";
import { DisplayControl } from "@/components/library/DisplayPanel";

type LibrarySortMode = "default" | "name-asc" | "name-desc";

const SORT_ITEMS: MenuEntry[] = [
    { value: "default", label: "默认顺序", icon: <AppIcon name="layers" /> },
    { value: "name-asc", label: "名称 A → Z", icon: <AppIcon name="arrow-down" /> },
    { value: "name-desc", label: "名称 Z → A", icon: <AppIcon name="arrow-up" /> },
];

const SORT_LABELS: Record<LibrarySortMode, string> = {
    default: "默认顺序",
    "name-asc": "名称 A → Z",
    "name-desc": "名称 Z → A",
};

const readSortMode = (): LibrarySortMode => {
    try {
        const saved = localStorage.getItem(LIBRARY_SORT_STORAGE_KEY);
        return saved && saved in SORT_LABELS ? (saved as LibrarySortMode) : "default";
    } catch {
        return "default";
    }
};

/** 公共图标库（数据来自后台，维护者可上传 / 编辑 / 批量优化 / 删除；所有访问者可多选采集 / 收藏） */
export const LibraryPage = () => {
    const icons = useLibraryStore((state) => state.icons);
    const total = useLibraryStore((state) => state.total);
    const hasMore = useLibraryStore((state) => state.hasMore);
    const categoryCounts = useLibraryStore((state) => state.categories);
    const canEdit = useLibraryStore((state) => state.canEdit);
    const favorites = useLibraryStore((state) => state.favorites);
    const loading = useLibraryStore((state) => state.loading);
    const loadingMore = useLibraryStore((state) => state.loadingMore);
    const loadLibrary = useLibraryStore((state) => state.loadLibrary);
    const loadMoreLibrary = useLibraryStore((state) => state.loadMoreLibrary);
    const refreshLibrary = useLibraryStore((state) => state.refreshLibrary);
    const addFavorite = useLibraryStore((state) => state.addFavorite);
    const addFavorites = useLibraryStore((state) => state.addFavorites);
    const removeFavorite = useLibraryStore((state) => state.removeFavorite);
    const user = useAuthStore((state) => state.user);
    const cartItems = useCartStore((state) => state.items);
    const toggleCart = useCartStore((state) => state.toggle);
    const { tip: cartTip, show: showCartTip } = useTimedTip();
    const [sortMode, setSortMode] = useState<LibrarySortMode>(readSortMode);
    const [keyword, setKeyword] = useState("");
    const [category, setCategory] = useState("");
    const [detail, setDetail] = useState<LibraryIcon | null>(null);
    const [selected, setSelected] = useState<string[]>([]);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [optimizeOpen, setOptimizeOpen] = useState(false);
    const [renameOpen, setRenameOpen] = useState(false);
    const loadMoreRef = useRef<HTMLDivElement | null>(null);
    const gridRef = useRef<HTMLUListElement | null>(null);
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const accountId = user?.id ?? "";
    const dragBox = useDragSelect({
        containerRef: gridRef,
        enabled: icons.length > 0,
        onSelect: (ids, additive) => setSelected((prev) => (additive ? Array.from(new Set([...prev, ...ids])) : ids)),
    });
    useClearOnBlankClick(() => setSelected((prev) => (prev.length === 0 ? prev : [])));

    // 首次进入与切换账号时重置筛选并加载第一页（维护权限随账号变化）
    useEffect(() => {
        setKeyword("");
        setCategory("");
        setSelected([]);
        setDetail(null);
        void loadLibrary({ keyword: "", category: "" });
    }, [accountId, loadLibrary]);

    // 关键词 / 分类变化后重新拉取第一页（关键词输入做防抖）
    useEffect(() => {
        const timer = window.setTimeout(() => {
            const state = useLibraryStore.getState();
            if (state.keyword === keyword.trim() && state.category === category) {
                return;
            }
            setSelected([]);
            void loadLibrary({ keyword, category });
        }, 260);
        return () => window.clearTimeout(timer);
    }, [keyword, category, loadLibrary]);

    // 图标列表滚动到底部（或首屏内容不足）时加载下一页
    useEffect(() => {
        const panel = scrollRef.current;
        if (!panel) {
            return;
        }
        let timer = 0;
        const check = () => {
            if (panel.scrollTop + panel.clientHeight >= panel.scrollHeight - 120) {
                void loadMoreLibrary();
            }
        };
        // 等布局稳定后再判断，避免内容不足一屏或刚好到底时卡住
        timer = window.setTimeout(check, 80);
        panel.addEventListener("scroll", check, { passive: true });
        return () => {
            window.clearTimeout(timer);
            panel.removeEventListener("scroll", check);
        };
    }, [loadMoreLibrary, hasMore, icons.length]);

    const categories = useMemo(() => sortLibraryCategories(categoryCounts.map((item) => item.name)), [categoryCounts]);

    const countByCategory = useMemo(() => {
        const map: Record<string, number> = {};
        categoryCounts.forEach((item) => {
            map[item.name] = item.count;
        });
        return map;
    }, [categoryCounts]);

    const libraryTotal = useMemo(() => categoryCounts.reduce((sum, item) => sum + item.count, 0), [categoryCounts]);

    const favoriteOf = (icon: LibraryIcon) => favorites.find((item) => item.libraryId === icon.id);
    const isFavorite = (icon: LibraryIcon) => Boolean(favoriteOf(icon));
    const inCart = (icon: LibraryIcon) => cartItems.some((item) => item.key === `library:${icon.id}`);

    const sortedIcons = useMemo(() => {
        if (sortMode === "default") {
            return icons;
        }
        return [...icons].sort((a, b) =>
            sortMode === "name-asc" ? a.className.localeCompare(b.className, "zh") : b.className.localeCompare(a.className, "zh"),
        );
    }, [icons, sortMode]);

    const selectedIcons = useMemo(() => icons.filter((icon) => selected.includes(icon.id)), [icons, selected]);

    const toggleSelect = (iconId: string, checked: boolean) => {
        setSelected((prev) => (checked ? Array.from(new Set([...prev, iconId])) : prev.filter((id) => id !== iconId)));
    };

    const addSelectedToCart = () => {
        let added = 0;
        selectedIcons.forEach((icon) => {
            const item = cartItemFromLibrary(icon);
            if (!cartItems.some((entry) => entry.key === item.key)) {
                toggleCart(item);
                added += 1;
            }
        });
        const ignored = selectedIcons.length - added;
        showCartTip(
            added > 0
                ? `已加入采集车 ${added} 个图标${ignored > 0 ? `，忽略 ${ignored} 个已存在` : ""}`
                : `所选 ${ignored} 个图标均已在采集车中`,
        );
    };

    /** 批量收藏（自动去重）：已收藏过的图标跳过并在提示里说明忽略数量 */
    const addSelectedToFavorites = () => {
        if (!user) {
            Toast.showInfo("登录后即可收藏图标");
            openLoginDialog();
            return;
        }
        void addFavorites(
            selectedIcons.map((icon) => ({
                className: icon.className,
                category: icon.category,
                svg: icon.svg,
                tags: icon.tags.slice(0, 3),
                source: "library" as const,
                libraryId: icon.id,
            })),
        )
            .then(({ added, ignored }) => {
                if (added === 0) {
                    Toast.showInfo(`所选 ${ignored} 个图标都已在收藏中，已忽略`);
                    return;
                }
                Toast.showSuccess(`已收藏 ${added} 个图标${ignored > 0 ? `，忽略 ${ignored} 个已存在` : ""}`);
            })
            .catch((error: unknown) => Toast.showError(error instanceof Error ? error.message : "收藏失败"));
    };

    const changeSort = (value: unknown) => {
        if (typeof value !== "string" || !(value in SORT_LABELS)) {
            return;
        }
        const next = value as LibrarySortMode;
        setSortMode(next);
        try {
            localStorage.setItem(LIBRARY_SORT_STORAGE_KEY, next);
        } catch {
            // 忽略存储异常
        }
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
        void addFavorite({
            className: icon.className,
            category: icon.category,
            svg: icon.svg,
            tags: icon.tags.slice(0, 3),
            source: "library",
            libraryId: icon.id,
        }).catch((error: unknown) => Toast.showError(error instanceof Error ? error.message : "收藏失败"));
    };

    const toggleCartItem = (icon: LibraryIcon) => {
        toggleCart(cartItemFromLibrary(icon));
    };

    const deleteIconsNow = (iconIds: string[]) =>
        api.library
            .deleteLibraryIcons(iconIds)
            .then(() => {
                setSelected((prev) => prev.filter((id) => !iconIds.includes(id)));
                setDetail(null);
                Toast.showSuccess("已删除所选图标");
                void refreshLibrary();
            })
            .catch((error: unknown) => Toast.showError(error instanceof Error ? error.message : "删除失败"));

    const removeIcons = (iconIds: string[]) => {
        if (iconIds.length === 0) {
            return;
        }
        void Dialog.confirm({
            title: "删除公共库图标",
            message: `确定从公共图标库删除选中的 ${iconIds.length} 个图标吗？此操作不可恢复。`,
            confirmText: "删除",
        })
            .then(() => deleteIconsNow(iconIds))
            .catch(() => undefined);
    };

    const saveDetail = async (patch: IconDetailPatch) => {
        if (!detail) {
            return;
        }
        const saved = await api.library.updateLibraryIcon(detail.id, patch);
        setDetail(saved);
        void refreshLibrary();
    };

    return (
        <>
            <SidePanel storageKey="library" defaultWidth={240} minWidth={180}>
                <div className="side-panel__header">
                    公共图标库
                    <div className="spacer" />
                    <span className="ui-note">{libraryTotal}</span>
                </div>
                <div className="side-panel__body">
                    <div className="nav-list">
                        <div className={`nav-item ${category === "" ? "active" : ""}`} onClick={() => setCategory("")}>
                            <AppIcon name="grid" />
                            全部
                            <span className="nav-item__count">{libraryTotal}</span>
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

            <div className="content-panel padded with-icon-scroll">
                <div className="content-toolbar project-toolbar">
                    <div className="ui-search">
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
                            <span className="batch-actions__count">已选 {selected.length} 个</span>
                            <span className="tip-anchor">
                                <button className="ui-btn small" type="button" onClick={addSelectedToCart}>
                                    <AppIcon name="cart" />
                                    采集
                                </button>
                                <TipBubble text={cartTip} />
                            </span>
                            <button className="ui-btn small" type="button" onClick={addSelectedToFavorites}>
                                <AppIcon name="star" />
                                收藏
                            </button>
                            {canEdit && (
                                <>
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
                                </>
                            )}
                        </div>
                    )}
                    <div className="spacer" />
                    <DropdownMenu
                        items={SORT_ITEMS}
                        value={sortMode}
                        onChange={changeSort}
                        trigger={
                            <button
                                type="button"
                                className={`ui-btn small button-tonal select-like project-toolbar__sort ${sortMode !== "default" ? "has-value" : ""}`}
                            >
                                {SORT_LABELS[sortMode]}
                            </button>
                        }
                    />
                    {canEdit && (
                        <button className="ui-btn small" type="button" onClick={() => setUploadOpen(true)}>
                            <AppIcon name="upload" />
                            上传图标
                        </button>
                    )}
                    <DisplayControl />
                </div>

                {loading && icons.length === 0 ? (
                    <LoadingHolder text="正在加载公共图标库..." />
                ) : icons.length === 0 ? (
                    <EmptyState text="没有匹配的图标，换个关键词试试" />
                ) : (
                    <div ref={scrollRef} className="icon-scroll">
                        <ul ref={gridRef} className="icon-grid">
                            {sortedIcons.map((icon) => (
                                <li key={icon.id} data-select-id={icon.id}>
                                    <IconCard
                                        icon={icon}
                                        favorite={isFavorite(icon)}
                                        inCart={inCart(icon)}
                                        showOpenItem={false}
                                        selectable
                                        selected={selected.includes(icon.id)}
                                        canEdit={canEdit}
                                        editLabel="编辑图标"
                                        deleteLabel="删除"
                                        onToggleSelect={(checked) => toggleSelect(icon.id, checked)}
                                        onOpen={() => setDetail(icon)}
                                        onFavorite={() => toggleFavorite(icon)}
                                        onCart={() => toggleCartItem(icon)}
                                        onEdit={canEdit ? () => setDetail(icon) : undefined}
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
                        <div ref={loadMoreRef} className="icon-grid-more">
                            {loadingMore ? <LoadingHolder text="加载中..." /> : !hasMore ? `共 ${total} 个图标` : ""}
                        </div>
                    </div>
                )}

                {dragBox && (
                    <div
                        className="drag-select-box"
                        style={{ left: dragBox.left, top: dragBox.top, width: dragBox.width, height: dragBox.height }}
                    />
                )}
            </div>

            <IconDetailDialog
                open={Boolean(detail)}
                setOpen={(open) => !open && setDetail(null)}
                icon={detail}
                canEdit={canEdit}
                categories={categories}
                favorite={detail ? isFavorite(detail) : false}
                inCart={detail ? inCart(detail) : false}
                onFavorite={() => detail && toggleFavorite(detail)}
                onCart={() => detail && toggleCartItem(detail)}
                onSave={saveDetail}
                onDelete={() => detail && void deleteIconsNow([detail.id])}
            />

            <UploadDialog open={uploadOpen} setOpen={setUploadOpen} target="library" onImported={() => void refreshLibrary()} />

            <BatchOptimizeDialog
                open={optimizeOpen}
                setOpen={setOptimizeOpen}
                iconIds={selected}
                defaultSize={24}
                optimize={(_, options) => api.library.optimizeLibraryIcons(selectedIcons, options)}
                onDone={() => {
                    setSelected([]);
                    void refreshLibrary();
                }}
            />

            <BatchRenameDialog
                open={renameOpen}
                setOpen={setRenameOpen}
                iconIds={selected}
                rename={(_, options) => api.library.renameLibraryIcons(selectedIcons, options)}
                onDone={() => {
                    setSelected([]);
                    void refreshLibrary();
                }}
            />
        </>
    );
};
