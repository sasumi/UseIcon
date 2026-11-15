import { useEffect } from "react";
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

/** 应用入口与路由分发 */
const App = () => {
    const route = useRoute();
    const ready = useAuthStore((state) => state.ready);
    const user = useAuthStore((state) => state.user);
    const restore = useAuthStore((state) => state.restore);

    useEffect(() => {
        void restore();
    }, [restore]);

    const needAuth = !user && route.name === "favorites";
    useEffect(() => {
        if (ready && needAuth) {
            navigate("/login", { replace: true });
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
                <span>正在恢复登录态...</span>
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
                    <div className="ui-empty">
                        <span>页面不存在</span>
                        <button className="ui-btn" type="button" onClick={() => navigate("/library")}>
                            返回公共库
                        </button>
                    </div>
                </div>
            )}
        </AppShell>
    );
};

export default App;
