import { useEffect, useMemo, useState } from "react";
import { DIALOG_SIZE_NORMAL, Dialog, Toast } from "minreact-ui";
import { LIBRARY_CATEGORIES } from "@/data/library";
import { navigate } from "@/router/useRoute";
import { useAuthStore } from "@/store/authStore";
import { cartItemFromLibrary, useCartStore } from "@/store/cartStore";
import { useLibraryStore } from "@/store/libraryStore";
import type { LibraryIcon } from "@/types";
import { copyText, downloadPng } from "@/utils/download";
import { AppIcon } from "@/components/common/AppIcon";
import { EmptyState } from "@/components/common/EmptyState";
import { SvgPreview } from "@/components/common/SvgPreview";
import { SidePanel } from "@/components/common/SidePanel";
import { IconCard } from "@/components/project/IconCard";
import { DisplayControl } from "@/components/library/DisplayPanel";

/** 公共图标库 */
export const LibraryPage = () => {
    const icons = useLibraryStore((state) => state.icons);
    const favorites = useLibraryStore((state) => state.favorites);
    const loading = useLibraryStore((state) => state.loading);
    const fetchAll = useLibraryStore((state) => state.fetchAll);
    const addFavorite = useLibraryStore((state) => state.addFavorite);
    const removeFavorite = useLibraryStore((state) => state.removeFavorite);
    const user = useAuthStore((state) => state.user);
    const cartItems = useCartStore((state) => state.items);
    const toggleCart = useCartStore((state) => state.toggle);
    const [keyword, setKeyword] = useState("");
    const [category, setCategory] = useState("");
    const [onlyFavorite, setOnlyFavorite] = useState(false);
    const [detail, setDetail] = useState<LibraryIcon | null>(null);

    useEffect(() => {
        void fetchAll();
    }, [fetchAll]);

    const favoriteOf = (icon: LibraryIcon) => favorites.find((item) => item.libraryId === icon.id);
    const isFavorite = (icon: LibraryIcon) => Boolean(favoriteOf(icon));
    const inCart = (icon: LibraryIcon) => cartItems.some((item) => item.key === `library:${icon.id}`);

    const filtered = useMemo(() => {
        const query = keyword.trim().toLowerCase();
        return icons.filter((icon) => {
            if (category && icon.category !== category) {
                return false;
            }
            if (onlyFavorite && !favorites.some((item) => item.libraryId === icon.id)) {
                return false;
            }
            if (!query) {
                return true;
            }
            return icon.className.toLowerCase().includes(query) || icon.tags.some((tag) => tag.toLowerCase().includes(query));
        });
    }, [icons, category, keyword, onlyFavorite, favorites]);

    const countByCategory = useMemo(() => {
        const map: Record<string, number> = {};
        icons.forEach((icon) => {
            map[icon.category] = (map[icon.category] || 0) + 1;
        });
        return map;
    }, [icons]);

    const toggleFavorite = (icon: LibraryIcon) => {
        if (!user) {
            Toast.showInfo("登录后即可收藏图标");
            navigate("/login");
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
                        <div
                            className={`nav-item ${category === "" && !onlyFavorite ? "active" : ""}`}
                            onClick={() => {
                                setCategory("");
                                setOnlyFavorite(false);
                            }}
                        >
                            <AppIcon name="grid" />
                            全部图标
                            <span className="nav-item__count">{icons.length}</span>
                        </div>
                        <div className={`nav-item ${onlyFavorite ? "active" : ""}`} onClick={() => setOnlyFavorite(true)}>
                            <AppIcon name="star" />
                            已收藏的
                            <span className="nav-item__count">{favorites.length}</span>
                        </div>
                    </div>
                    <div className="ui-divider" />
                    <div className="nav-list">
                        {LIBRARY_CATEGORIES.map((item) => (
                            <div
                                key={item}
                                className={`nav-item ${category === item && !onlyFavorite ? "active" : ""}`}
                                onClick={() => {
                                    setCategory(item);
                                    setOnlyFavorite(false);
                                }}
                            >
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
                        {["基础", "箭头", "操作"].map((item) => (
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
                    <DisplayControl />
                </div>

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
                                    onOpen={() => setDetail(icon)}
                                    onFavorite={() => toggleFavorite(icon)}
                                    onCart={() => toggleCartItem(icon)}
                                    onCopySvg={() =>
                                        void copyText(icon.svg).then(
                                            () => Toast.showSuccess("SVG 源码已复制"),
                                            () => Toast.showError("复制失败"),
                                        )
                                    }
                                    onDownloadPng={() =>
                                        void downloadPng(icon).catch(() => Toast.showError("PNG 下载失败"))
                                    }
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
                onFavorite={() => detail && toggleFavorite(detail)}
                onCart={() => detail && toggleCartItem(detail)}
            />
        </>
    );
};

/** 公共库图标详情 */
const LibraryIconDialog = ({
    icon,
    open,
    setOpen,
    favorite,
    inCart,
    onFavorite,
    onCart,
}: {
    icon: LibraryIcon | null; // 当前图标
    open: boolean; // 是否打开
    setOpen: (open: boolean) => void; // 显隐控制
    favorite: boolean; // 是否已收藏
    inCart: boolean; // 是否已在采集车
    onFavorite: () => void; // 收藏切换
    onCart: () => void; // 采集车切换
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
            <Dialog.Action align="right">
                <button className="ui-btn" type="button" onClick={() => setOpen(false)}>
                    关闭
                </button>
            </Dialog.Action>
        </Dialog>
    );
};
