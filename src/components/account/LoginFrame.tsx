import { useEffect, useMemo, useState } from "react";
import { Toast } from "minreact-ui";
import { PUBLIC_API_HOST } from "@/api/http";
import { useAuthStore } from "@/store/authStore";

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

/** 内嵌统一登录页（账号密码 / 微信扫码 / 注册 / 找回密码都在里面完成） */
export const LoginFrame = ({
    onSuccess,
    minHeight = 380,
    maxHeight = 760,
}: {
    onSuccess?: () => void; // 登录成功回调
    minHeight?: number; // 最小高度
    maxHeight?: number; // 最大高度
}) => {
    const applyLogin = useAuthStore((state) => state.applyLogin);
    const [height, setHeight] = useState(Math.max(minHeight, 440));
    const [hint, setHint] = useState("");

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
                setHeight(Math.min(Math.max(Math.ceil(data.height), minHeight), maxHeight));
                return;
            }
            if (data.type === "register-success") {
                setHint(`验证邮件已发送至 ${data.email || "你的邮箱"}，请点击邮件中的链接完成注册。`);
                return;
            }
            if (data.type === "login-success") {
                applyLogin({ token: data.token, user: data.user });
                Toast.showSuccess("登录成功");
                onSuccess?.();
            }
        };
        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, [applyLogin, maxHeight, minHeight, onSuccess]);

    const loginUrl = useMemo(() => {
        const url = new URL(LOGIN_PAGE_URL);
        url.searchParams.set("origin", window.location.origin);
        url.searchParams.set("from", "useicon");
        url.searchParams.set("return", window.location.href);
        return url.toString();
    }, []);

    return (
        <div className="login-frame">
            <iframe title="UseIcon 登录" className="login-iframe" src={loginUrl} style={{ height }} allow="clipboard-write" />
            {hint && <p className="ui-alert">{hint}</p>}
        </div>
    );
};
