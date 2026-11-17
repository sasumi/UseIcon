import { useEffect, useState } from "react";
import { api } from "@/api";
import { useAuthStore } from "@/store/authStore";
import type { IconInput, User } from "@/types";
import { getProjectAccess } from "@/utils/permission";
import { AppIcon } from "@/components/common/AppIcon";

interface BridgeProject {
    id: string; // 项目 ID
    name: string; // 项目名
    accessType: number; // 访问类型：0 团队 / 1 公开
    canEdit: boolean; // 当前用户是否可编辑
    iconCount: number; // 图标数
}

/**
 * 浏览器扩展桥接页：由扩展的隐藏 iframe 加载，用 postMessage 与扩展面板通信。
 * 页面运行在同源上下文里，因此可以直接复用当前登录态与后台数据。
 */
export const ExtBridgePage = () => {
    const user = useAuthStore((state) => state.user);
    const [status, setStatus] = useState("正在连接浏览器扩展...");

    useEffect(() => {
        const inFrame = window.parent !== window;
        const post = (payload: Record<string, unknown>) => {
            if (!inFrame) {
                return;
            }
            window.parent.postMessage({ source: "useicon-bridge", ...payload }, "*");
        };

        const buildProjects = async (): Promise<BridgeProject[]> => {
            const projects = await api.projects.listProjects();
            const counts = await Promise.all(
                projects.map((project) => api.icons.listIcons(project.id).then((list) => list.length).catch(() => 0)),
            );
            return projects.map((project, index) => ({
                id: project.id,
                name: project.name,
                accessType: project.accessType,
                canEdit: getProjectAccess(project, user).canEdit,
                iconCount: counts[index],
            }));
        };

        const sendReady = async () => {
            try {
                const projects = await buildProjects();
                post({
                    type: "ready",
                    user: user as User | null,
                    projects,
                    site: window.location.origin,
                });
                setStatus(user ? `已连接：${user.nickname || user.name}` : "已连接，但尚未登录 UseIcon");
            } catch (error) {
                post({ type: "error", message: error instanceof Error ? error.message : "读取项目失败" });
                setStatus("读取项目失败");
            }
        };

        const handleMessage = async (event: MessageEvent) => {
            if (!inFrame || event.source !== window.parent) {
                return;
            }
            const data = event.data as { source?: string; type?: string; payload?: { projectId?: string; icons?: IconInput[] } } | null;
            if (!data || data.source !== "useicon-ext") {
                return;
            }
            if (data.type === "ping") {
                await sendReady();
                return;
            }
            if (data.type === "upload" && data.payload?.projectId && Array.isArray(data.payload.icons)) {
                try {
                    // 浏览器扩展仍以 name 字段提交，这里统一映射为 className
                    const inputs = data.payload.icons.map((input) => {
                        const legacy = input as unknown as { name?: string; title?: string };
                        return {
                            className: input.className || legacy.name || "icon",
                            svg: input.svg,
                            tags: input.tags || [],
                        };
                    });
                    const created = await api.icons.createIcons(data.payload.projectId, inputs);
                    post({
                        type: "uploaded",
                        projectId: data.payload.projectId,
                        count: created.length,
                        names: created.map((icon) => icon.className),
                    });
                } catch (error) {
                    post({ type: "error", message: error instanceof Error ? error.message : "写入图标失败" });
                }
            }
        };

        window.addEventListener("message", handleMessage);
        void sendReady();
        return () => window.removeEventListener("message", handleMessage);
    }, [user]);

    return (
        <div className="ext-bridge">
            <AppIcon name="link" />
            <strong>UseIcon 扩展桥接</strong>
            <span>{status}</span>
            <p className="ui-note">该页面仅供浏览器扩展 BrowserExt 通过隐藏 iframe 使用，可忽略。</p>
        </div>
    );
};
