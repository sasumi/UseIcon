import { useEffect, useMemo, useState } from "react";
import { DIALOG_SIZE_XLARGE, Dialog, LoadingHolder, Toast } from "minreact-ui";
import { api } from "@/api";
import { LIBRARY_CATEGORIES } from "@/data/library";
import { useLibraryStore } from "@/store/libraryStore";
import type { LibraryIcon } from "@/types";
import { filterDuplicateIcons } from "@/utils/iconDedupe";
import { AppIcon } from "@/components/common/AppIcon";
import { EmptyState } from "@/components/common/EmptyState";
import { SvgPreview } from "@/components/common/SvgPreview";

/** 从公共库挑选图标加入项目 */
export const PickLibraryDialog = ({
    open,
    setOpen,
    projectId,
    onAdded,
}: {
    open: boolean; // 是否打开
    setOpen: (open: boolean) => void; // 显隐控制
    projectId: string; // 目标项目
    onAdded: () => void; // 添加完成回调
}) => {
    const favorites = useLibraryStore((state) => state.favorites);
    const [icons, setIcons] = useState<LibraryIcon[]>([]);
    const [loading, setLoading] = useState(false);
    const [keyword, setKeyword] = useState("");
    const [category, setCategory] = useState("");
    const [onlyFavorite, setOnlyFavorite] = useState(false);
    const [selected, setSelected] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) {
            return;
        }
        setSelected([]);
        setKeyword("");
        setCategory("");
        setOnlyFavorite(false);
        // 挑选需要全量数据（本地筛选跨分类搜索），打开时取一次完整列表
        let alive = true;
        setLoading(true);
        api.library
            .listLibraryIcons()
            .then((library) => {
                if (alive) {
                    setIcons(library.icons);
                }
            })
            .catch((error: unknown) => {
                if (alive) {
                    Toast.showError(error instanceof Error ? error.message : "公共库加载失败");
                }
            })
            .finally(() => {
                if (alive) {
                    setLoading(false);
                }
            });
        return () => {
            alive = false;
        };
    }, [open]);

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

    const toggle = (id: string) => {
        setSelected((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
    };

    const submit = async () => {
        if (selected.length === 0) {
            Toast.showWarning("请先选择图标");
            return;
        }
        setSaving(true);
        try {
            // 目标项目已有的图标（公共库 ID 或类名相同）直接跳过
            const projectIcons = await api.icons.listIcons(projectId);
            const chosen = icons.filter((icon) => selected.includes(icon.id));
            const { kept, ignored } = filterDuplicateIcons(chosen, projectIcons);
            if (kept.length === 0) {
                Toast.showInfo(`所选 ${ignored} 个图标都已在项目中，已忽略`);
                return;
            }
            const created = await api.icons.addIconsFromLibrary(
                projectId,
                kept.map((icon) => icon.id),
            );
            Toast.showSuccess(`已加入 ${created.length} 个图标${ignored > 0 ? `，忽略 ${ignored} 个已存在的图标` : ""}`);
            setOpen(false);
            onAdded();
        } catch (error) {
            Toast.showError(error instanceof Error ? error.message : "加入失败");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} setOpen={setOpen} width={DIALOG_SIZE_XLARGE} clickMaskerToClose>
            <Dialog.Title>从公共库添加图标</Dialog.Title>
            <Dialog.Content>
                <div className="dialog-body">
                    <div className="toolbar">
                        <div className="ui-search">
                            <AppIcon name="search" />
                            <input
                                className="ui-input"
                                type="search"
                                placeholder="搜索 className 或标签"
                                value={keyword}
                                onChange={(event) => setKeyword(event.target.value)}
                            />
                        </div>
                        <label className="ui-row ui-note">
                            <input type="checkbox" checked={onlyFavorite} onChange={(event) => setOnlyFavorite(event.target.checked)} />
                            只看我的收藏
                        </label>
                        <div className="spacer" />
                        <span className="ui-note">已选 {selected.length} 个</span>
                    </div>

                    <div className="category-chips">
                        <span className={`category-chip ${category === "" ? "active" : ""}`} onClick={() => setCategory("")}>
                            全部
                        </span>
                        {LIBRARY_CATEGORIES.map((item) => (
                            <span key={item} className={`category-chip ${category === item ? "active" : ""}`} onClick={() => setCategory(item)}>
                                {item}
                            </span>
                        ))}
                    </div>

                    <ul className="library-pick-grid">
                        {filtered.map((icon) => (
                            <li
                                key={icon.id}
                                className={`library-pick ${selected.includes(icon.id) ? "selected" : ""}`}
                                onClick={() => toggle(icon.id)}
                                title={`${icon.className}${icon.tags.length > 0 ? ` · ${icon.tags.join(" · ")}` : ""}`}
                            >
                                <SvgPreview svg={icon.svg} size={24} />
                                <span className="library-pick__name">{icon.className}</span>
                                {selected.includes(icon.id) && (
                                    <span className="library-pick__check">
                                        <AppIcon name="check" />
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                    {loading ? <LoadingHolder text="正在加载公共图标库..." /> : null}
                    {filtered.length === 0 && !loading && <EmptyState text="没有匹配的图标" />}
                </div>
            </Dialog.Content>
            <Dialog.Action align="right">
                <button className="ui-btn" type="button" onClick={() => setOpen(false)}>
                    取消
                </button>
                <button className="ui-btn primary" type="button" disabled={saving || selected.length === 0} onClick={() => void submit()}>
                    {saving ? "添加中..." : `加入项目（${selected.length}）`}
                </button>
            </Dialog.Action>
        </Dialog>
    );
};
