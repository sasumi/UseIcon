import { useEffect, useMemo, useState } from "react";
import { DIALOG_SIZE_LARGE, Dialog, Select, Tabs, Toast } from "minreact-ui";
import { api } from "@/api";
import { CODE_TEMPLATE_PRESETS, DEFAULT_ICON_SIZE, TEMPLATE_PLACEHOLDERS } from "@/config";
import type { Project, ProjectRole } from "@/types";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/utils/permission";
import { AppIcon } from "@/components/common/AppIcon";
import { UserAvatar } from "@/components/common/UserAvatar";

/** 项目设置：基础信息、成员权限、代码模板 */
export const ProjectSettingsDialog = ({
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
    const [memberAccount, setMemberAccount] = useState("");
    const [memberRole, setMemberRole] = useState<ProjectRole>("editor");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) {
            return;
        }
        setDraft(project);
        setMemberAccount("");
    }, [open, project]);

    const basicsTab = useMemo(
        () => (
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
                    <label>可见性</label>
                    <Select
                        key={draft.visibility}
                        items={[
                            { value: "team", label: "内部项目（仅成员可见）", icon: <AppIcon name="lock" /> },
                            { value: "public", label: "公开项目（登录用户可见）", icon: <AppIcon name="globe" /> },
                        ]}
                        value={draft.visibility}
                        onChange={(value) => setDraft({ ...draft, visibility: value as Project["visibility"] })}
                        triggerClassName="ui-btn"
                    />
                </div>
                <label className="ui-switch-row">
                    <span>允许游客使用（未登录可查看并复制代码）</span>
                    <input
                        type="checkbox"
                        checked={draft.allowGuest}
                        onChange={(event) => setDraft({ ...draft, allowGuest: event.target.checked })}
                    />
                </label>
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
                    <span className="ui-field-tip">小窗与拖拽生成的代码会使用这个尺寸</span>
                </div>
            </div>
        ),
        [draft],
    );

    const membersTab = (
        <div className="settings-members">
            <div className="settings-member-add">
                <input
                    className="ui-input"
                    placeholder="成员邮箱或登录名（该用户需在本设备登录过）"
                    value={memberAccount}
                    onChange={(event) => setMemberAccount(event.target.value)}
                />
                <Select
                    key={memberRole}
                    items={(["admin", "editor", "viewer"] as ProjectRole[]).map((role) => ({
                        value: role,
                        label: ROLE_LABELS[role],
                        icon: <AppIcon name="user" />,
                    }))}
                    value={memberRole}
                    onChange={(value) => typeof value === "string" && setMemberRole(value as ProjectRole)}
                    triggerClassName="ui-btn small"
                />
                <button className="ui-btn primary" type="button" onClick={() => void addMember()}>
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
    );

    const templateTab = (
        <div className="ui-form">
            <div className="ui-field">
                <label>代码模板</label>
                <textarea
                    className="ui-textarea"
                    style={{ minHeight: "9rem" }}
                    value={draft.codeTemplate}
                    onChange={(event) => setDraft({ ...draft, codeTemplate: event.target.value })}
                />
            </div>
            <div className="toolbar">
                {CODE_TEMPLATE_PRESETS.map((preset) => (
                    <button
                        key={preset.name}
                        className="ui-btn small"
                        type="button"
                        onClick={() => setDraft({ ...draft, codeTemplate: preset.template })}
                    >
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
    );

    const save = async () => {
        if (saving) {
            return;
        }
        setSaving(true);
        try {
            const updated = await api.projects.updateProject(project.id, {
                name: draft.name,
                description: draft.description,
                visibility: draft.visibility,
                allowGuest: draft.allowGuest,
                iconSize: draft.iconSize,
                codeTemplate: draft.codeTemplate,
            });
            onUpdated(updated);
            Toast.showSuccess("项目设置已保存");
        } catch (error) {
            Toast.showError(error instanceof Error ? error.message : "保存失败");
        } finally {
            setSaving(false);
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

    const removeProject = () => {
        void Dialog.confirm({
            title: "删除项目",
            message: `确定删除项目「${project.name}」吗？项目内 ${project.members.length} 位成员与全部图标都会一并删除，且不可恢复。`,
            confirmText: "删除",
            onPreConfirm: () => {
                void api.projects
                    .deleteProject(project.id)
                    .then(() => {
                        Toast.showSuccess("项目已删除");
                        setOpen(false);
                        onDeleted();
                    })
                    .catch((error: unknown) => Toast.showError(error instanceof Error ? error.message : "删除失败"));
                return false;
            },
        });
    };

    return (
        <Dialog open={open} setOpen={setOpen} width={DIALOG_SIZE_LARGE} clickMaskerToClose>
            <Dialog.Title>项目设置 · {project.name}</Dialog.Title>
            <Dialog.Content>
                <div className="dialog-body">
                    <Tabs
                        items={[
                            { trigger: "基础设置", content: basicsTab },
                            { trigger: `成员与权限 (${project.members.length})`, content: membersTab },
                            { trigger: "代码模板", content: templateTab },
                        ]}
                    />
                    <div className="settings-danger">
                        <div>
                            <div className="ui-section-title">危险操作</div>
                            <p className="ui-note">删除项目会同时删除项目内所有图标，且无法恢复。</p>
                        </div>
                        <button className="ui-btn danger" type="button" onClick={removeProject}>
                            <AppIcon name="trash" />
                            删除项目
                        </button>
                    </div>
                </div>
            </Dialog.Content>
            <Dialog.Action align="right">
                <button className="ui-btn" type="button" onClick={() => setOpen(false)}>
                    关闭
                </button>
                <button className="ui-btn primary" type="button" disabled={saving} onClick={() => void save()}>
                    {saving ? "保存中..." : "保存设置"}
                </button>
            </Dialog.Action>
        </Dialog>
    );
};
