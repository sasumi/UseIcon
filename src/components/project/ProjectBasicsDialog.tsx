import { useEffect, useState } from "react";
import { DIALOG_SIZE_NORMAL, Dialog, Toast } from "minreact-ui";
import { api } from "@/api";
import { DEFAULT_ICON_SIZE } from "@/config";
import { useDialogForm } from "@/hooks/useDialogForm";
import type { Project } from "@/types";

/** 项目基础设置：名称、描述、默认图标尺寸与删除项目 */
export const ProjectBasicsDialog = ({
    open,
    setOpen,
    project,
    onUpdated,
    onDeleted,
}: {
    open: boolean; // 是否打开
    setOpen: (open: boolean) => void; // 显隐控制
    project: Project; // 当前项目
    onUpdated: (project: Project) => void; // 设置更新回调
    onDeleted: () => void; // 删除成功回调
}) => {
    const [draft, setDraft] = useState(project);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open) {
            setDraft(project);
        }
    }, [open, project]);

    const save = async () => {
        if (saving) {
            return;
        }
        setSaving(true);
        try {
            const updated = await api.projects.updateProject(project.id, {
                name: draft.name,
                description: draft.description,
                iconSize: draft.iconSize,
            });
            onUpdated(updated);
            Toast.showSuccess("基础设置已保存");
            setOpen(false);
        } catch (error) {
            Toast.showError(error instanceof Error ? error.message : "保存失败");
        } finally {
            setSaving(false);
        }
    };

    const removeProject = () => {
        void Dialog.confirm({
            title: "危险操作：删除项目",
            message: `删除后「${project.name}」及其 ${project.members.length} 位成员、全部图标会一并清除，且无法恢复。确认继续删除吗？`,
            confirmText: "删除项目",
        }).then(() => {
            void api.projects
                .deleteProject(project.id)
                .then(() => {
                    Toast.showSuccess("项目已删除");
                    setOpen(false);
                    onDeleted();
                })
                .catch((error: unknown) => Toast.showError(error instanceof Error ? error.message : "删除失败"));
        }).catch(() => undefined);
    };

    const { formProps, submitProps } = useDialogForm(() => void save());

    return (
        <Dialog open={open} setOpen={setOpen} width={DIALOG_SIZE_NORMAL} clickMaskerToClose>
            <Dialog.Title>基础设置</Dialog.Title>
            <Dialog.Content>
                <form {...formProps}>
                    <div className="dialog-body">
                        <div className="ui-form">
                            <div className="ui-field">
                                <label>项目名称</label>
                                <input className="ui-input" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
                            </div>
                            <div className="ui-field">
                                <label>项目描述</label>
                                <textarea
                                    className="ui-textarea"
                                    value={draft.description}
                                    onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                                />
                            </div>
                            <div className="ui-field">
                                <label>默认图标尺寸（px）</label>
                                <input
                                    className="ui-input"
                                    type="number"
                                    min={12}
                                    max={96}
                                    value={draft.iconSize}
                                    onChange={(event) => setDraft({ ...draft, iconSize: Number(event.target.value) || DEFAULT_ICON_SIZE })}
                                />
                                <span className="ui-field-tip">拓展模式与拖拽生成的代码会使用这个尺寸</span>
                            </div>
                        </div>
                    </div>
                </form>
            </Dialog.Content>
            <Dialog.Action align="right">
                <button className="ui-btn button-tonal danger" type="button" onClick={removeProject}>
                    删除
                </button>
                <div className="spacer" />
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
