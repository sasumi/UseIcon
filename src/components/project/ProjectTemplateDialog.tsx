import { useEffect, useState } from "react";
import { DIALOG_SIZE_NORMAL, Dialog, Toast } from "minreact-ui";
import { api } from "@/api";
import { CODE_TEMPLATE_PRESETS, TEMPLATE_PLACEHOLDERS } from "@/config";
import { useDialogForm } from "@/hooks/useDialogForm";
import type { Project } from "@/types";

/** 项目代码模板：模板内容与预设、可用占位符 */
export const ProjectTemplateDialog = ({
    open,
    setOpen,
    project,
    onUpdated,
}: {
    open: boolean; // 是否打开
    setOpen: (open: boolean) => void; // 显隐控制
    project: Project; // 当前项目
    onUpdated: (project: Project) => void; // 设置更新回调
}) => {
    const [template, setTemplate] = useState(project.codeTemplate);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open) {
            setTemplate(project.codeTemplate);
        }
    }, [open, project]);

    const save = async () => {
        if (saving) {
            return;
        }
        setSaving(true);
        try {
            const updated = await api.projects.updateProject(project.id, { codeTemplate: template });
            onUpdated(updated);
            Toast.showSuccess("代码模板已保存");
            setOpen(false);
        } catch (error) {
            Toast.showError(error instanceof Error ? error.message : "保存失败");
        } finally {
            setSaving(false);
        }
    };

    const { formProps, submitProps } = useDialogForm(() => void save());

    return (
        <Dialog open={open} setOpen={setOpen} width={DIALOG_SIZE_NORMAL} clickMaskerToClose>
            <Dialog.Title>代码模板</Dialog.Title>
            <Dialog.Content>
                <form {...formProps}>
                    <div className="dialog-body">
                        <div className="ui-form">
                            <div className="ui-field">
                                <label>模板内容</label>
                                <textarea className="ui-textarea code" style={{ minHeight: "9rem" }} value={template} onChange={(event) => setTemplate(event.target.value)} />
                                <span className="ui-field-tip">拖动或点击图标时按此模板生成代码，%xxx% 会被替换为图标数据</span>
                            </div>
                        </div>
                        <div className="toolbar">
                            {CODE_TEMPLATE_PRESETS.map((preset) => (
                                <button key={preset.name} className="ui-btn small" type="button" onClick={() => setTemplate(preset.template)}>
                                    {preset.name}
                                </button>
                            ))}
                        </div>
                        <div className="ui-note">
                            <div className="ui-section-title">可用占位符</div>
                            <ul className="settings-placeholders">
                                {TEMPLATE_PLACEHOLDERS.map((item) => (
                                    <li key={item.key}>
                                        <code>{item.key}</code> {item.desc}
                                    </li>
                                ))}
                            </ul>
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
