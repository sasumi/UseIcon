import { useEffect, useRef } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ExtBridgePage } from "@/pages/ExtBridgePage";
import { FavoritesPage } from "@/pages/FavoritesPage";
import { LibraryPage } from "@/pages/LibraryPage";
import { LoginPage } from "@/pages/LoginPage";
import { ExtModePage } from "@/pages/ExtModePage";
import { ProjectPage } from "@/pages/ProjectPage";
import { UpdatesPage } from "@/pages/UpdatesPage";
import { navigate, useRoute } from "@/router/useRoute";
import { useAuthStore } from "@/store/authStore";
import { openLoginDialog } from "@/store/loginDialogStore";
import { useProjectStore } from "@/store/projectStore";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingHolder } from "minreact-ui";

/** 应用入口与路由分发 */
const App = () => {
    const route = useRoute();
    const ready = useAuthStore((state) => state.ready);
    const user = useAuthStore((state) => state.user);
    const restore = useAuthStore((state) => state.restore);
    const authPrompted = useRef(false);
    const accountId = user?.id ?? "";

    useEffect(() => {
        void restore();
    }, [restore]);

    // 账号切换（含退出登录）后清空项目缓存；公共库与收藏由各自页面 / 外壳重新拉取
    useEffect(() => {
        useProjectStore.getState().reset();
    }, [accountId]);

    // 需要登录的页面在游客访问时弹出登录对话框，不再整页跳转
    const needAuth = !user && route.name === "favorites";
    useEffect(() => {
        if (!ready) {
            return;
        }
        if (needAuth && !authPrompted.current) {
            authPrompted.current = true;
            openLoginDialog();
        } else if (!needAuth) {
            authPrompted.current = false;
        }
    }, [ready, needAuth]);

    // ExtMode 与扩展桥接页不套用主界面外壳
    if (route.name === "extMode") {
        return <ExtModePage projectId={route.params.id} />;
    }
    if (route.name === "ext-bridge") {
        return <ExtBridgePage />;
    }
    if (route.name === "login") {
        return <LoginPage />;
    }

    if (!ready) {
        return (
            <div className="boot-screen">
                <span className="login-brand__logo">UI</span>
                <LoadingHolder text="加载中..." />
            </div>
        );
    }

    return (
        <AppShell route={route}>
            {route.name === "library" && <LibraryPage />}
            {route.name === "favorites" && <FavoritesPage />}
            {route.name === "projects" && <ProjectPage />}
            {route.name === "project" && <ProjectPage projectId={route.params.id} />}
            {route.name === "updates" && <UpdatesPage />}
            {route.name === "notfound" && (
                <div className="content-panel padded">
                    <EmptyState text="页面不存在">
                        <button className="ui-btn" type="button" onClick={() => navigate("/library")}>
                            返回公共库
                        </button>
                    </EmptyState>
                </div>
            )}
        </AppShell>
    );
};

export default App;
