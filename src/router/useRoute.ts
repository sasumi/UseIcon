import { useEffect, useState } from "react";

export type RouteName =
    | "library"
    | "favorites"
    | "projects"
    | "project"
    | "extMode"
    | "login"
    | "updates"
    | "ext-bridge"
    | "notfound";

export interface Route {
    name: RouteName; // 路由名
    path: string; // 原始路径
    params: Record<string, string>; // 路径参数
    query: URLSearchParams; // 查询参数
}

const parseHash = (hash: string): Route => {
    const raw = hash.replace(/^#/, "");
    const [pathname, search = ""] = raw.split("?");
    const path = pathname || "/";
    const query = new URLSearchParams(search);

    const withRoute = (name: RouteName, params: Record<string, string> = {}): Route => ({ name, path, params, query });

    if (path === "/" || path === "" || path === "/library") {
        return withRoute("library");
    }
    if (path === "/projects") {
        return withRoute("projects");
    }
    if (path === "/favorites") {
        return withRoute("favorites");
    }
    if (path === "/login") {
        return withRoute("login");
    }
    if (path === "/updates") {
        return withRoute("updates");
    }
    if (path === "/ext-bridge") {
        return withRoute("ext-bridge");
    }
    const extModeMatch = path.match(/^\/projects\/([^/]+)\/(?:ext-mode|mini)$/);
    if (extModeMatch) {
        return withRoute("extMode", { id: decodeURIComponent(extModeMatch[1]) });
    }
    const projectMatch = path.match(/^\/projects\/([^/]+)$/);
    if (projectMatch) {
        return withRoute("project", { id: decodeURIComponent(projectMatch[1]) });
    }
    return withRoute("notfound");
};

/** 跳转（hash 路由，静态部署无需 history fallback） */
export const navigate = (to: string, options: { replace?: boolean } = {}): void => {
    const target = to.startsWith("#") ? to : `#${to}`;
    if (options.replace) {
        window.history.replaceState(null, "", target);
        window.dispatchEvent(new HashChangeEvent("hashchange"));
    } else {
        window.location.hash = target;
    }
};

/** 当前路由 */
export const useRoute = (): Route => {
    const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
    useEffect(() => {
        const handleChange = () => setRoute(parseHash(window.location.hash));
        window.addEventListener("hashchange", handleChange);
        return () => window.removeEventListener("hashchange", handleChange);
    }, []);
    return route;
};

/** 项目页 / ExtMode 地址 */
export const projectPath = (projectId: string): string => `/projects/${encodeURIComponent(projectId)}`;
export const extModePath = (projectId: string): string => `/projects/${encodeURIComponent(projectId)}/ext-mode`;
/** 兼容旧链接 */
export const miniPath = extModePath;
