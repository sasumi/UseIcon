import { useRef, useState } from "react";
import { Dialog, FilePicker, InlineTextEditor, Toast } from "minreact-ui";
import { useAuthStore } from "@/store/authStore";
import { UserAvatar } from "@/components/common/UserAvatar";
import { AppIcon } from "@/components/common/AppIcon";
import { EmptyState } from "@/components/common/EmptyState";

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

const STATE_LABELS: Record<string, string> = { Normal: "正常", Canceled: "已注销", Forbidden: "已禁用" };

const formatDateTime = (value?: string) => (value ? value.slice(0, 16) : "--");

/** 个人信息：头像、昵称、账号信息与退出登录（布局参考 pathbooker） */
export const UserProfileDialog = ({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) => {
    const user = useAuthStore((state) => state.user);
    const updateNickname = useAuthStore((state) => state.updateNickname);
    const uploadAvatar = useAuthStore((state) => state.uploadAvatar);
    const logout = useAuthStore((state) => state.logout);
    const fileRef = useRef<HTMLInputElement>(null);
    const [nicknameVersion, setNicknameVersion] = useState(0);
    const [uploading, setUploading] = useState(false);

    const saveNickname = async (value: string) => {
        const nickname = value.trim();
        if (!nickname || nickname === (user?.nickname ?? "")) {
            return;
        }
        try {
            await updateNickname(nickname);
            Toast.showSuccess("昵称已更新");
        } catch (error) {
            Toast.showError(error instanceof Error ? error.message : "昵称修改失败");
            setNicknameVersion((version) => version + 1);
        }
    };

    const onPickAvatar = async (file: File | File[]) => {
        const avatar = Array.isArray(file) ? file[0] : file;
        if (!avatar) {
            return;
        }
        if (avatar.size > MAX_AVATAR_SIZE) {
            Toast.showInfo(`头像不能超过 ${MAX_AVATAR_SIZE / 1024 / 1024}MB`);
            return;
        }
        setUploading(true);
        try {
            await uploadAvatar(avatar);
            Toast.showSuccess("头像已更新");
        } catch (error) {
            Toast.showError(error instanceof Error ? error.message : "头像上传失败");
        } finally {
            setUploading(false);
            if (fileRef.current) {
                fileRef.current.value = "";
            }
        }
    };

    const handleLogout = () => {
        void Dialog.confirm({ title: "退出登录", message: "确定要退出登录吗？", confirmText: "退出" }).then(() => {
            void logout().then(() => Toast.showInfo("已退出登录"));
            setOpen(false);
        });
    };

    return (
        <Dialog open={open} setOpen={setOpen} width="24em" clickMaskerToClose>
            <Dialog.Title>个人信息</Dialog.Title>
            <Dialog.Content>
                {user ? (
                    <div className="user-profile">
                        <label className="user-profile__avatar" title="点击更换头像">
                            <FilePicker ref={fileRef} accept="image/*" onChange={onPickAvatar} />
                            <UserAvatar user={user} size={4} />
                            <span className="user-profile__avatar-mask">
                                <AppIcon name="image" />
                            </span>
                            {uploading && <span className="user-profile__avatar-loading" />}
                        </label>

                        <ul className="user-profile__metas">
                            <li>
                                <label>昵称</label>
                                <div className="user-profile__editor">
                                    <InlineTextEditor
                                        key={nicknameVersion}
                                        value={user.nickname ?? ""}
                                        placeholder="--"
                                        required
                                        saveHandler={saveNickname}
                                    />
                                </div>
                            </li>
                            <li>
                                <label>账号</label>
                                <var>{user.name || "--"}</var>
                            </li>
                            <li>
                                <label>用户 ID</label>
                                <var>{user.id}</var>
                            </li>
                            <li>
                                <label>邮箱</label>
                                <var>{user.email || "--"}</var>
                            </li>
                            <li>
                                <label>注册时间</label>
                                <var>{formatDateTime(user.createTime)}</var>
                            </li>
                            <li>
                                <label>状态</label>
                                <var className={`user-profile__state is-${(user.state || "normal").toLowerCase()}`}>
                                    {STATE_LABELS[user.state] ?? user.state}
                                </var>
                            </li>
                        </ul>

                        <div className="user-profile__btns">
                            <button className="ui-btn small" type="button" onClick={handleLogout}>
                                退出登录
                            </button>
                        </div>
                    </div>
                ) : (
                    <EmptyState text="尚未登录" />
                )}
            </Dialog.Content>
        </Dialog>
    );
};
