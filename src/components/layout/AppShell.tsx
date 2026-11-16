import { Clickable, DropdownMenu, MenuItemDivider } from "minreact-ui";
import type { MenuEntry } from "minreact-ui";
import { useState, useEffect, type ReactNode } from "react";
import { navigate, type Route } from "@/router/useRoute";
import { useAuthStore } from "@/store/authStore";
import { useLibraryStore } from "@/store/libraryStore";
import { useLoginDialogStore } from "@/store/loginDialogStore";
import { APP_VERSION } from "@/updates";
import { LoginDialog } from "@/components/account/LoginDialog";
import { UserProfileDialog } from "@/components/account/UserProfileDialog";
import { DonateDialog } from "@/components/account/DonateDialog";
import { AppIcon } from "@/components/common/AppIcon";
import { UserAvatar } from "@/components/common/UserAvatar";
import { CartDrawer, CartFab } from "@/components/cart/CartDrawer";
import { OptionsDialog } from "@/components/settings/OptionsDialog";

const NAV_ITEMS = [
    { key: "library", label: "公共库", icon: "grid", path: "/library" },
    { key: "projects", label: "项目", icon: "folder", path: "/projects" },
    { key: "favorites", label: "我的收藏", icon: "star", path: "/favorites" },
];

/** 应用外壳：活动栏 + 标题栏 + 内容区 + 状态栏 */
export const AppShell = ({ route, children }: { route: Route; children: ReactNode }) => {
    const user = useAuthStore((state) => state.user);
    const logout = useAuthStore((state) => state.logout);
    const favorites = useLibraryStore((state) => state.favorites);
    const setLoginOpen = useLoginDialogStore((state) => state.setOpen);
    const [profileOpen, setProfileOpen] = useState(false);
    const [optionsOpen, setOptionsOpen] = useState(false);
    const [donateOpen, setDonateOpen] = useState(false);

    useEffect(() => {
        void useLibraryStore.getState().fetchFavorites();
    }, [user?.id]);

    const activeKey = route.name === "project" || route.name === "extMode" ? "projects" : route.name;

    const userMenu: MenuEntry[] = user
        ? [
              { value: "profile", label: "个人资料", icon: <UserAvatar user={user} size={1.2} /> },
              MenuItemDivider,
              { value: "options", label: "选项", icon: <AppIcon name="settings" /> },
              MenuItemDivider,
              { value: "logout", label: "退出登录", icon: <AppIcon name="unlock" /> },
          ]
        : [
              { value: "login", label: "登录 / 注册", icon: <AppIcon name="user" /> },
              { value: "options", label: "选项", icon: <AppIcon name="settings" /> },
          ];

    const handleUserMenu = (value: unknown) => {
        switch (value) {
            case "profile":
                setProfileOpen(true);
                break;
            case "logout":
                void logout().then(() => {
                    if (route.name === "favorites") {
                        setLoginOpen(true);
                    }
                });
                break;
            case "options":
                setOptionsOpen(true);
                break;
            case "login":
                setLoginOpen(true);
                break;
            default:
                break;
        }
    };

    return (
        <div className="app-shell">
            <aside className="activity-bar">
                <Clickable tag="span" role="button" className="activity-logo" title={`UseIcon v${APP_VERSION}`} onClick={() => navigate("/library")}>
                    UI
                </Clickable>
                {NAV_ITEMS.map((item) => (
                    <span
                        key={item.key}
                        className={`activity-item ${activeKey === item.key ? "active" : ""}`}
                        title={item.label}
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate(item.path)}
                        onKeyDown={(event) => event.key === "Enter" && navigate(item.path)}
                    >
                        <AppIcon name={item.icon} />
                        {item.key === "favorites" && favorites.length > 0 && <span className="activity-badge">{favorites.length}</span>}
                    </span>
                ))}
                <div className="spacer" />
                <span
                    className="activity-item activity-donate"
                    title="打赏"
                    role="button"
                    tabIndex={0}
                    onClick={() => setDonateOpen(true)}
                    onKeyDown={(event) => event.key === "Enter" && setDonateOpen(true)}
                >
                    <AppIcon name="heart" />
                </span>
                <DropdownMenu
                    items={userMenu}
                    onChange={handleUserMenu}
                    trigger={
                        <span className="activity-user" title={user ? `${user.nickname || user.name}（${user.name}）` : "未登录，点击登录"}>
                            {user ? (
                                <UserAvatar user={user} size={1.9} />
                            ) : (
                                <span className="activity-user-guest">
                                    <AppIcon name="user" />
                                </span>
                            )}
                        </span>
                    }
                />
            </aside>

            <div className="app-main">{children}</div>

            <CartFab />
            <CartDrawer />
            <UserProfileDialog open={profileOpen} setOpen={setProfileOpen} />
            <OptionsDialog open={optionsOpen} setOpen={setOptionsOpen} />
            <DonateDialog open={donateOpen} setOpen={setDonateOpen} />
            <LoginDialog />
        </div>
    );
};
