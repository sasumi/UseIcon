import { useEffect, useMemo, useState } from "react";
import { DIALOG_SIZE_XLARGE, Dialog, Toast } from "minreact-ui";
import { api } from "@/api";
import { LIBRARY_CATEGORIES } from "@/data/library";
import { useLibraryStore } from "@/store/libraryStore";
import { AppIcon } from "@/components/common/AppIcon";
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
    const icons = useLibraryStore((state) => state.icons);
    const favorites = useLibraryStore((state) => state.favorites);
    const fetchAll = useLibraryStore((state) => state.fetchAll);
    const [keyword, setKeyword] = useState("");
    const [category, setCategory] = useState("");
    const [onlyFavorite, setOnlyFavorite] = useState(false);
    const [selected, setSelected] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open) {
            void fetchAll();
            setSelected([]);
            setKeyword("");
            setCategory("");
            setOnlyFavorite(false);
        }
    }, [open, fetchAll]);

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
            const created = await api.icons.addIconsFromLibrary(projectId, selected);
            Toast.showSuccess(`已加入 ${created.length} 个图标`);
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
                    {filtered.length === 0 && <div className="ui-empty">没有匹配的图标</div>}
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
