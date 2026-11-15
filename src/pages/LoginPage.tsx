import { useEffect } from "react";
import { navigate } from "@/router/useRoute";
import { useAuthStore } from "@/store/authStore";
import { AppIcon } from "@/components/common/AppIcon";
import { LoginFrame } from "@/components/account/LoginFrame";

/** 登录 / 注册页：内嵌统一登录页（应用内一般走登录对话框，此页保留给直接访问 /login） */
export const LoginPage = () => {
    const user = useAuthStore((state) => state.user);

    useEffect(() => {
        if (user) {
            navigate("/projects", { replace: true });
        }
    }, [user]);

    return (
        <div className="login-page">
            <div className="login-intro">
                <div className="login-brand">
                    <span className="login-brand__logo">UI</span>
                    <div>
                        <h1>UseIcon</h1>
                        <p>VSCode 风格图标管理平台</p>
                    </div>
                </div>
                <ul className="login-features">
                    <li>
                        <AppIcon name="grid" />
                        公共图标库收藏与打标签
                    </li>
                    <li>
                        <AppIcon name="folder" />
                        项目 + 多人协作（管理员 / 协作人员 / 普通用户）
                    </li>
                    <li>
                        <AppIcon name="monitor" />
                        竖屏小窗拖动图标，按模板插入代码
                    </li>
                    <li>
                        <AppIcon name="download" />
                        批量导出 SVG / PNG / iconfont 包
                    </li>
                </ul>
                <p className="ui-note">账号体系接入 api.tthaoke.com，与同通好课 / 易纸 / 路书共用同一套账号。</p>
                <div className="toolbar">
                    <button className="ui-btn ghost small" type="button" onClick={() => navigate("/library")}>
                        先逛逛公共图标库
                    </button>
                </div>
            </div>

            <div className="login-panel">
                <LoginFrame onSuccess={() => navigate("/projects")} />
                <p className="ui-note">
                    登录页支持账号密码、微信扫码；注册与找回密码也在登录页内完成。登录态仅保存在本设备（Bearer 令牌）。
                </p>
            </div>
        </div>
    );
};
