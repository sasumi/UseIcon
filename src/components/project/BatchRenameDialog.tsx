import { useEffect, useState } from "react";
import { DIALOG_SIZE_SMALL, Dialog, Toast } from "minreact-ui";
import { api } from "@/api";
import { useDialogForm } from "@/hooks/useDialogForm";
import type { IconPatch } from "@/types";

/** 批量重命名图标（项目图标与公共库图标共用） */
export const BatchRenameDialog = ({
    open,
    setOpen,
    iconIds,
    onDone,
    rename = api.icons.renameIcons,
}: {
    open: boolean; // 是否打开
    setOpen: (open: boolean) => void; // 显隐控制
    iconIds: string[]; // 待重命名图标
    onDone: (icons: IconPatch[]) => void; // 完成回调
    rename?: (iconIds: string[], options: { prefix?: string; suffix?: string; find?: string; replace?: string }) => Promise<IconPatch[]>; // 重命名实现，默认走项目图标接口
}) => {
    const [prefix, setPrefix] = useState("");
    const [suffix, setSuffix] = useState("");
    const [find, setFind] = useState("");
    const [replace, setReplace] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open) {
            setPrefix("");
            setSuffix("");
            setFind("");
            setReplace("");
        }
    }, [open]);

    const submit = async () => {
        if (!prefix && !suffix && !find) {
            Toast.showWarning("请至少填写前缀、后缀或查找内容");
            return;
        }
        setSaving(true);
        try {
            const icons = await rename(iconIds, { prefix, suffix, find, replace });
            Toast.showSuccess(`已重命名 ${icons.length} 个图标`);
            onDone(icons);
            setOpen(false);
        } catch (error) {
            Toast.showError(error instanceof Error ? error.message : "重命名失败");
        } finally {
            setSaving(false);
        }
    };

    const { formProps, submitProps } = useDialogForm(() => void submit());

    return (
        <Dialog open={open} setOpen={setOpen} width={DIALOG_SIZE_SMALL} clickMaskerToClose>
            <Dialog.Title>批量重命名（{iconIds.length} 个图标）</Dialog.Title>
            <Dialog.Content>
                <form {...formProps}>
                    <div className="dialog-body">
                        <div className="ui-form">
                            <div className="ui-field">
                                <label>添加前缀</label>
                                <input className="ui-input" placeholder="例如 project-" value={prefix} onChange={(event) => setPrefix(event.target.value)} />
                            </div>
                            <div className="ui-field">
                                <label>添加后缀</label>
                                <input className="ui-input" placeholder="例如 -outline" value={suffix} onChange={(event) => setSuffix(event.target.value)} />
                            </div>
                            <div className="ui-field">
                                <label>查找替换</label>
                                <div className="ui-label-check">
                                    <input className="ui-input" placeholder="查找" value={find} onChange={(event) => setFind(event.target.value)} />
                                    <input className="ui-input" placeholder="替换为" value={replace} onChange={(event) => setReplace(event.target.value)} />
                                </div>
                            </div>
                            <p className="ui-note">重名时会自动追加序号，例如 icon-2。</p>
                        </div>
                    </div>
                </form>
            </Dialog.Content>
            <Dialog.Action align="right">
                <button className="ui-btn" type="button" onClick={() => setOpen(false)}>
                    取消
                </button>
                <button className="ui-btn primary" {...submitProps} disabled={saving}>
                    {saving ? "处理中..." : "重命名"}
                </button>
            </Dialog.Action>
        </Dialog>
    );
};
