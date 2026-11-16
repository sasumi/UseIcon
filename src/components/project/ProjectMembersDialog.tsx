import { useEffect, useState } from "react";
import { DIALOG_SIZE_LARGE, Dialog, Select, Toast } from "minreact-ui";
import { api } from "@/api";
import type { Project, ProjectRole } from "@/types";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/utils/permission";
import { useDialogForm } from "@/hooks/useDialogForm";
import { AppIcon } from "@/components/common/AppIcon";
import { UserAvatar } from "@/components/common/UserAvatar";

/** 项目成员与权限：可见性、游客开关与成员角色管理 */
export const ProjectMembersDialog = ({
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
    const [memberAccount, setMemberAccount] = useState("");
    const [memberRole, setMemberRole] = useState<ProjectRole>("editor");

    useEffect(() => {
        if (open) {
            setMemberAccount("");
        }
    }, [open]);

    const updateVisibility = async (patch: Partial<Pick<Project, "visibility" | "allowGuest">>) => {
        try {
            const updated = await api.projects.updateProject(project.id, patch);
            onUpdated(updated);
            Toast.showSuccess("权限设置已更新");
        } catch (error) {
            Toast.showError(error instanceof Error ? error.message : "更新失败");
        }
    };

    const addMember = async () => {
        if (!memberAccount.trim()) {
            return;
        }
        try {
            const updated = await api.projects.addMember(project.id, memberAccount, memberRole);
            onUpdated(updated);
            setMemberAccount("");
            Toast.showSuccess("成员已添加");
        } catch (error) {
            Toast.showError(error instanceof Error ? error.message : "添加失败");
        }
    };

    const changeRole = async (userId: string, role: ProjectRole) => {
        try {
            const updated = await api.projects.updateMemberRole(project.id, userId, role);
            onUpdated(updated);
            Toast.showSuccess("角色已更新");
        } catch (error) {
            Toast.showError(error instanceof Error ? error.message : "更新失败");
        }
    };

    const removeMember = async (userId: string) => {
        try {
            const updated = await api.projects.removeMember(project.id, userId);
            onUpdated(updated);
            Toast.showSuccess("成员已移除");
        } catch (error) {
            Toast.showError(error instanceof Error ? error.message : "移除失败");
        }
    };

    const { formProps, submitProps } = useDialogForm(() => void addMember());

    return (
        <Dialog open={open} setOpen={setOpen} width={DIALOG_SIZE_LARGE} clickMaskerToClose>
            <Dialog.Title>成员与权限</Dialog.Title>
            <Dialog.Content>
                <form {...formProps}>
                    <div className="dialog-body">
                    <div className="ui-form">
                        <div className="ui-field">
                            <label>可见性</label>
                            <Select
                                key={`visibility-${project.visibility}`}
                                items={[
                                    { value: "team", label: "内部项目（仅成员可见）", icon: <AppIcon name="lock" /> },
                                    { value: "public", label: "公开项目（登录用户可见）", icon: <AppIcon name="globe" /> },
                                ]}
                                value={project.visibility}
                                onChange={(value) => void updateVisibility({ visibility: value as Project["visibility"] })}
                                triggerClassName="ui-btn"
                            />
                        </div>
                        <label className="ui-switch-row">
                            <span>允许游客使用（未登录可查看并复制代码）</span>
                            <input
                                type="checkbox"
                                checked={project.allowGuest}
                                onChange={(event) => void updateVisibility({ allowGuest: event.target.checked })}
                            />
                        </label>
                    </div>

                    <div className="settings-members">
                        <div className="settings-member-add">
                            <input
                                className="ui-input"
                                placeholder="成员邮箱或登录名（该用户需在本设备登录过）"
                                value={memberAccount}
                                onChange={(event) => setMemberAccount(event.target.value)}
                            />
                            <Select
                                key={`role-${memberRole}`}
                                items={(["admin", "editor", "viewer"] as ProjectRole[]).map((role) => ({
                                    value: role,
                                    label: ROLE_LABELS[role],
                                    icon: <AppIcon name="user" />,
                                }))}
                                value={memberRole}
                                onChange={(value) => typeof value === "string" && setMemberRole(value as ProjectRole)}
                                triggerClassName="ui-btn small"
                            />
                            <button className="ui-btn primary" {...submitProps}>
                                <AppIcon name="plus" />
                                添加
                            </button>
                        </div>
                        <p className="ui-note">
                            管理员可管理项目与成员；协作人员可上传 / 编辑 / 删除图标；普通用户仅查看与复制代码。
                        </p>
                        <ul className="settings-member-list">
                            {project.members.map((member) => (
                                <li key={member.userId} className="settings-member">
                                    <UserAvatar
                                        user={{ id: member.userId, name: member.name, nickname: member.name, avatarThumb: member.avatarThumb }}
                                    />
                                    <div className="settings-member__info">
                                        <span className="settings-member__name">
                                            {member.name || member.userId}
                                            {member.userId === project.ownerId && <span className="ui-badge admin">创建者</span>}
                                        </span>
                                        <span className="settings-member__email">{member.email || "--"}</span>
                                    </div>
                                    <Select
                                        key={`${member.userId}:${member.role}`}
                                        items={(["admin", "editor", "viewer"] as ProjectRole[]).map((role) => ({
                                            value: role,
                                            label: ROLE_LABELS[role],
                                            icon: <AppIcon name="user" />,
                                        }))}
                                        value={member.role}
                                        disabled={member.userId === project.ownerId}
                                        onChange={(value) => typeof value === "string" && void changeRole(member.userId, value as ProjectRole)}
                                        triggerClassName="ui-btn small"
                                    />
                                    <button
                                        className="ui-icon-btn danger"
                                        type="button"
                                        title={member.userId === project.ownerId ? "不能移除创建者" : `移除 ${member.name}`}
                                        disabled={member.userId === project.ownerId}
                                        onClick={() => void removeMember(member.userId)}
                                    >
                                        <AppIcon name="close" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                        <p className="ui-note">角色说明：{Object.values(ROLE_DESCRIPTIONS).join("；")}。</p>
                    </div>
                    </div>
                </form>
            </Dialog.Content>
            <Dialog.Action align="right">
                <button className="ui-btn" type="button" onClick={() => setOpen(false)}>
                    关闭
                </button>
            </Dialog.Action>
        </Dialog>
    );
};
