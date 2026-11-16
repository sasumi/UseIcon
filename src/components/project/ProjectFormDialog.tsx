import { useEffect, useState } from "react";
import { DIALOG_SIZE_NORMAL, Dialog, Select, Toast } from "minreact-ui";
import { api } from "@/api";
import { DEFAULT_ICON_SIZE } from "@/config";
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
    const [iconSize, setIconSize] = useState(DEFAULT_ICON_SIZE);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open) {
            setName("");
            setDescription("");
            setVisibility("team");
            setAllowGuest(false);
            setIconSize(DEFAULT_ICON_SIZE);
        }
    }, [open]);

    const submit = async () => {
        if (saving) {
            return;
        }
        setSaving(true);
        try {
            const project = await api.projects.createProject({ name, description, visibility, allowGuest, iconSize });
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
                                <label htmlFor="project-name">项目名称</label>
                                <input
                                    id="project-name"
                                    className="ui-input"
                                    value={name}
                                    autoFocus
                                    placeholder="例如：官网图标库"
                                    onChange={(event) => setName(event.target.value)}
                                />
                            </div>
                            <div className="ui-field">
                                <label htmlFor="project-desc">描述</label>
                                <textarea
                                    id="project-desc"
                                    className="ui-textarea"
                                    value={description}
                                    placeholder="这个项目用来做什么？"
                                    onChange={(event) => setDescription(event.target.value)}
                                />
                            </div>
                            <div className="ui-field">
                                <label htmlFor="project-visibility">可见性</label>
                                <Select
                                    key={visibility}
                                    items={[
                                        { value: "team", label: "内部项目（仅成员可见）", icon: <AppIcon name="lock" /> },
                                        { value: "public", label: "公开项目（登录用户可见）", icon: <AppIcon name="globe" /> },
                                    ]}
                                    value={visibility}
                                    onChange={(value) => setVisibility(value as ProjectVisibility)}
                                    triggerClassName="ui-btn"
                                />
                            </div>
                            <label className="ui-switch-row">
                                <span>允许游客使用（未登录可查看并复制代码）</span>
                                <input type="checkbox" checked={allowGuest} onChange={(event) => setAllowGuest(event.target.checked)} />
                            </label>
                            <div className="ui-field">
                                <label htmlFor="project-size">默认图标尺寸（px）</label>
                                <input
                                    id="project-size"
                                    className="ui-input"
                                    type="number"
                                    min={12}
                                    max={96}
                                    value={iconSize}
                                    onChange={(event) => setIconSize(Number(event.target.value) || DEFAULT_ICON_SIZE)}
                                />
                            </div>
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
