import { useEffect, useState } from "react";
import { DIALOG_SIZE_NORMAL, Dialog, Select, Toast } from "minreact-ui";
import { api } from "@/api";
import { useDialogForm } from "@/hooks/useDialogForm";
import { useProjectStore } from "@/store/projectStore";
import type { Project, ProjectVisibility } from "@/types";
import { AppIcon } from "@/components/common/AppIcon";

/** 新建项目对话框 */
export const ProjectFormDialog = ({
    open,
    setOpen,
    onCreated,
}: {
    open: boolean; // 是否打开
    setOpen: (open: boolean) => void; // 显隐控制
    onCreated: (project: Project) => void; // 创建成功回调
}) => {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [visibility, setVisibility] = useState<ProjectVisibility>("team");
    const [allowGuest, setAllowGuest] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open) {
            setName("");
            setDescription("");
            setVisibility("team");
            setAllowGuest(false);
        }
    }, [open]);

    const submit = async () => {
        if (saving) {
            return;
        }
        setSaving(true);
        try {
            const project = await api.projects.createProject({ name, description, visibility, allowGuest });
            Toast.showSuccess("项目已创建");
            setOpen(false);
            // 侧栏列表已加载过，创建后就地刷新，避免新项目要刷新页面才出现
            void useProjectStore.getState().loadProjectPage();
            onCreated(project);
        } catch (error) {
            Toast.showError(error instanceof Error ? error.message : "创建失败");
        } finally {
            setSaving(false);
        }
    };

    const { formProps, submitProps } = useDialogForm(() => void submit());

    return (
        <Dialog open={open} setOpen={setOpen} width={DIALOG_SIZE_NORMAL} clickMaskerToClose>
            <Dialog.Title>新建项目</Dialog.Title>
            <Dialog.Content>
                <form {...formProps}>
                    <div className="dialog-body">
                        <div className="ui-form">
                            <div className="ui-field">
                                <input
                                    id="project-name"
                                    className="ui-input"
                                    placeholder="项目名称"
                                    value={name}
                                    autoFocus
                                    onChange={(event) => setName(event.target.value)}
                                />
                            </div>
                            <div className="ui-field">
                                <textarea
                                    id="project-desc"
                                    placeholder="项目描述"
                                    className="ui-textarea"
                                    value={description}
                                    onChange={(event) => setDescription(event.target.value)}
                                />
                            </div>
                            <div className="ui-field">
                                <label htmlFor="project-visibility">可见性</label>
                                <Select
                                    key={visibility}
                                    items={[
                                        { value: "team", label: "内部项目", icon: <AppIcon name="lock" /> },
                                        { value: "public", label: "公开项目", icon: <AppIcon name="globe" /> },
                                    ]}
                                    value={visibility}
                                    onChange={(value) => setVisibility(value as ProjectVisibility)}
                                    triggerClassName="ui-btn"
                                />
                            </div>
                            <label className="ui-switch-row">
                                <span>允许游客使用</span>
                                <input type="checkbox" checked={allowGuest} onChange={(event) => setAllowGuest(event.target.checked)} />
                            </label>
                        </div>
                    </div>
                </form>
            </Dialog.Content>
            <Dialog.Action align="right">
                <button className="ui-btn" type="button" onClick={() => setOpen(false)}>
                    取消
                </button>
                <button className="ui-btn primary" {...submitProps} disabled={saving}>
                    {saving ? "创建中..." : "创建项目"}
                </button>
            </Dialog.Action>
        </Dialog>
    );
};
