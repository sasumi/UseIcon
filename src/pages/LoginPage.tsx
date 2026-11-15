import { useEffect, useMemo, useState } from "react";
import { Toast } from "minreact-ui";
import { PUBLIC_API_HOST } from "@/api/http";
import { navigate } from "@/router/useRoute";
import { useAuthStore } from "@/store/authStore";
import { AppIcon } from "@/components/common/AppIcon";

/** 统一登录页（api.tthaoke.com），登录成功通过 postMessage 回传登录态 */
const LOGIN_PAGE_URL = `${PUBLIC_API_HOST}login.php`;
const LOGIN_PAGE_ORIGIN = new URL(LOGIN_PAGE_URL).origin;

interface LoginPageMessage {
    type?: "resize" | "register-success" | "login-success"; // 登录页消息类型
    height?: number; // resize：内容高度
    token?: string; // login-success：令牌
    user?: unknown; // login-success：用户信息
    email?: string; // register-success：待验证邮箱
}

/** 登录 / 注册页：内嵌 api.tthaoke.com 统一登录页 */
export const LoginPage = () => {
    const user = useAuthStore((state) => state.user);
    const applyLogin = useAuthStore((state) => state.applyLogin);
    const [height, setHeight] = useState(520);
    const [hint, setHint] = useState("");

    useEffect(() => {
        if (user) {
            navigate("/projects", { replace: true });
        }
    }, [user]);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.origin !== LOGIN_PAGE_ORIGIN) {
                return;
            }
            const data = event.data as LoginPageMessage | null;
            if (!data) {
                return;
            }
            if (data.type === "resize" && data.height && data.height > 0) {
                setHeight(Math.min(Math.max(Math.ceil(data.height), 380), 760));
                return;
            }
            if (data.type === "register-success") {
                setHint(`验证邮件已发送至 ${data.email || "你的邮箱"}，请点击邮件中的链接完成注册。`);
                return;
            }
            if (data.type === "login-success") {
                applyLogin({ token: data.token, user: data.user });
                Toast.showSuccess("登录成功");
                navigate("/projects");
            }
        };
        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, [applyLogin]);

    const loginUrl = useMemo(() => {
        const url = new URL(LOGIN_PAGE_URL);
        url.searchParams.set("origin", window.location.origin);
        url.searchParams.set("from", "useicon");
        url.searchParams.set("return", window.location.href);
        return url.toString();
    }, []);

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
                <iframe
                    title="UseIcon 登录"
                    className="login-iframe"
                    src={loginUrl}
                    style={{ height }}
                    allow="clipboard-write"
                />
                {hint && <p className="ui-alert">{hint}</p>}
                <p className="ui-note">
                    登录页支持账号密码、微信扫码；注册与找回密码也在登录页内完成。登录态仅保存在本设备（Bearer 令牌）。
                </p>
            </div>
        </div>
    );
};
