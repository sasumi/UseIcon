import type { User } from "@/types";

const AVATAR_COLORS = ["#007acc", "#0e639c", "#4ec9b0", "#c586c0", "#dcdcaa", "#ce9178", "#569cd6", "#b180d7"];

const colorOf = (id: string): string => {
    let hash = 0;
    for (let index = 0; index < id.length; index += 1) {
        hash = (hash * 31 + id.charCodeAt(index)) % 100000;
    }
    return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

/** 用户头像：优先使用后端头像，否则用昵称首字母 + 稳定底色 */
export const UserAvatar = ({
    user,
    size = 1.7,
}: {
    user: Pick<User, "id" | "name" | "nickname" | "avatarThumb">; // 用户信息
    size?: number; // 尺寸（rem）
}) => {
    const label = (user.nickname || user.name || "?").slice(0, 1).toUpperCase();
    const style = { width: `${size}rem`, height: `${size}rem` };
    if (user.avatarThumb) {
        return <img className="ui-avatar" src={user.avatarThumb} alt={user.nickname || user.name} style={style} />;
    }
    return (
        <span className="ui-avatar" style={{ ...style, background: colorOf(user.id || user.name) }} title={user.nickname || user.name}>
            {label}
        </span>
    );
};
