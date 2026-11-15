import { useEffect, useMemo, useState } from "react";
import { DIALOG_SIZE_SMALL, Dialog, Toast } from "minreact-ui";
import type { FavoriteIcon } from "@/types";
import { navigate } from "@/router/useRoute";
import { useAuthStore } from "@/store/authStore";
import { cartItemFromFavorite, useCartStore } from "@/store/cartStore";
import { collectFavoriteTags, useLibraryStore } from "@/store/libraryStore";
import { copyText } from "@/utils/download";
import { AppIcon } from "@/components/common/AppIcon";
import { EmptyState } from "@/components/common/EmptyState";
import { SvgPreview } from "@/components/common/SvgPreview";
import { SidePanel } from "@/components/common/SidePanel";
import { IconCard } from "@/components/project/IconCard";
import { DisplayControl } from "@/components/library/DisplayPanel";

/** 我的收藏：跨项目 / 公共库的个人图标集合，可打标签、采集 */
export const FavoritesPage = () => {
    const user = useAuthStore((state) => state.user);
    const favorites = useLibraryStore((state) => state.favorites);
    const refreshFavorites = useLibraryStore((state) => state.refreshFavorites);
    const removeFavorite = useLibraryStore((state) => state.removeFavorite);
    const toggleCart = useCartStore((state) => state.toggle);
    const cartItems = useCartStore((state) => state.items);

    const [keyword, setKeyword] = useState("");
    const [tag, setTag] = useState("");
    const [editing, setEditing] = useState<FavoriteIcon | null>(null);

    useEffect(() => {
        if (user) {
            void refreshFavorites();
        }
    }, [user, refreshFavorites]);

    const tags = useMemo(() => collectFavoriteTags(favorites), [favorites]);

    const filtered = useMemo(() => {
        const query = keyword.trim().toLowerCase();
        return favorites.filter((item) => {
            if (tag && !item.tags.includes(tag)) {
                return false;
            }
            if (!query) {
                return true;
            }
            return item.className.toLowerCase().includes(query) || item.tags.some((itemTag) => itemTag.toLowerCase().includes(query));
        });
    }, [favorites, keyword, tag]);

    const copySvg = (favorite: FavoriteIcon) =>
        void copyText(favorite.svg).then(
            () => Toast.showSuccess("SVG 源码已复制"),
            () => Toast.showError("复制失败"),
        );

    const addToCart = (favorite: FavoriteIcon) => {
        toggleCart(cartItemFromFavorite(favorite));
    };

    const remove = (favorite: FavoriteIcon) => {
        void Dialog.confirm({
            title: "删除收藏",
            message: `确定从收藏中移除「${favorite.className}」吗？`,
            confirmText: "移除",
        }).then(() => {
            void removeFavorite(favorite.id).catch((error: unknown) =>
                Toast.showError(error instanceof Error ? error.message : "移除失败"),
            );
        });
    };

    if (!user) {
        return (
            <div className="content-panel padded">
                <EmptyState text="登录后即可看到你的收藏" icon="star">
                    <button className="ui-btn primary" type="button" onClick={() => navigate("/login")}>
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
                            全部收藏
                            <span className="nav-item__count">{favorites.length}</span>
                        </div>
                    </div>
                    {tags.length > 0 && (
                        <>
                            <div className="ui-divider" />
                            <div className="category-chips">
                                {tags.map((item) => (
                                    <span key={item} className={`category-chip ${tag === item ? "active" : ""}`} onClick={() => setTag(tag === item ? "" : item)}>
                                        {item}
                                    </span>
                                ))}
                            </div>
                        </>
                    )}
                </div>
                <div className="side-panel__footer">
                    <p className="ui-note">收藏是快照：即使原图标被删除，收藏里的 SVG 依然可用。</p>
                </div>
            </SidePanel>

            <div className="content-panel padded">
                <div className="content-toolbar">
                    <div className="ui-search">
                        <AppIcon name="search" />
                        <input className="ui-input" placeholder="搜索" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
                    </div>
                    <div className="spacer" />
                    <span className="ui-note">
                        {filtered.length} / {favorites.length}
                    </span>
                    <DisplayControl />
                </div>

                {favorites.length === 0 ? (
                    <EmptyState text="还没有收藏：在公共库或项目图标上点击「收藏」即可" icon="star">
                        <button className="ui-btn primary" type="button" onClick={() => navigate("/library")}>
                            去公共库看看
                        </button>
                    </EmptyState>
                ) : filtered.length === 0 ? (
                    <EmptyState text="没有匹配当前筛选的收藏" icon="search" />
                ) : (
                    <ul className="icon-grid">
                        {filtered.map((favorite) => (
                            <li key={favorite.id}>
                                <IconCard
                                    icon={favorite}
                                    favorite
                                    inCart={cartItems.some((entry) => entry.key === cartItemFromFavorite(favorite).key)}
                                    editLabel="编辑收藏"
                                    deleteLabel="移除收藏"
                                    onOpen={() => setEditing(favorite)}
                                    onEdit={() => setEditing(favorite)}
                                    onCart={() => addToCart(favorite)}
                                    onCopy={() => copySvg(favorite)}
                                    onDelete={() => remove(favorite)}
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
                    void refreshFavorites();
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
    const [tags, setTags] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open && favorite) {
            setClassName(favorite.className);
            setTags(favorite.tags.join(", "));
        }
    }, [open, favorite]);

    if (!favorite) {
        return null;
    }

    const save = async () => {
        setSaving(true);
        try {
            await updateFavorite(favorite.id, {
                className,
                tags: tags.split(/[,，\s]+/).filter(Boolean),
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

    return (
        <Dialog open={open} setOpen={setOpen} width={DIALOG_SIZE_SMALL} clickMaskerToClose>
            <Dialog.Title>编辑收藏</Dialog.Title>
            <Dialog.Content>
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
                            <label>标签（逗号分隔）</label>
                            <input className="ui-input" placeholder="例如：导航, 首页, 深色" value={tags} onChange={(event) => setTags(event.target.value)} />
                        </div>
                        <p className="ui-note">来源：{favorite.source === "library" ? "公共库" : "项目"}，收藏时间 {new Date(favorite.createdAt).toLocaleString()}</p>
                    </div>
                </div>
            </Dialog.Content>
            <Dialog.Action align="right">
                <button className="ui-btn" type="button" onClick={() => setOpen(false)}>
                    取消
                </button>
                <button className="ui-btn primary" type="button" disabled={saving} onClick={() => void save()}>
                    {saving ? "保存中..." : "保存"}
                </button>
            </Dialog.Action>
        </Dialog>
    );
};
