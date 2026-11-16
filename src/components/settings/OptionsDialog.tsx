import { Dialog, DropdownMenu, Tabs, Toast } from "minreact-ui";
import type { MenuEntry } from "minreact-ui";
import { useState } from "react";
import { PANEL_WIDTH_STORAGE_PREFIX, THEME_LABELS } from "@/config";
import { useThemeStore } from "@/store/themeStore";
import type { ThemeMode } from "@/types";
import { APP_VERSION } from "@/updates";
import { AppIcon } from "@/components/common/AppIcon";
import { UpdatesLog } from "@/components/updates/UpdatesLog";

const THEME_ICONS: Record<ThemeMode, string> = { light: "sun", dark: "moon", auto: "monitor" };

const THEME_ITEMS: MenuEntry[] = ["auto", "light", "dark"].map((mode) => ({
    value: mode,
    label: THEME_LABELS[mode as ThemeMode],
    icon: <AppIcon name={THEME_ICONS[mode as ThemeMode]} />,
}));

/** 选项对话框：主题等本机偏好（布局参考 pathbooker 的设置面板） */
export const OptionsDialog = ({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) => {
    const theme = useThemeStore((state) => state.theme);
    const setTheme = useThemeStore((state) => state.setTheme);
    const [updatesOpen, setUpdatesOpen] = useState(false);

    const resetPanelWidths = () => {
        Object.keys(localStorage)
            .filter((key) => key.startsWith(PANEL_WIDTH_STORAGE_PREFIX))
            .forEach((key) => localStorage.removeItem(key));
        Toast.showSuccess("侧栏宽度已恢复默认");
    };

    const generalTab = (
        <div className="options-form">
            <section className="options-group">
                <h3 className="options-group__title">外观</h3>
                <div className="options-row">
                    <label>主题</label>
                    <DropdownMenu
                        items={THEME_ITEMS}
                        value={theme}
                        onChange={(value) => typeof value === "string" && setTheme(value as ThemeMode)}
                        trigger={
                            <button type="button" className="select-like options-select">
                                <AppIcon name={THEME_ICONS[theme]} />
                                {THEME_LABELS[theme]}
                            </button>
                        }
                    />
                </div>
            </section>

            <section className="options-group">
                <h3 className="options-group__title">布局</h3>
                <div className="options-row">
                    <label>侧栏宽度</label>
                    <button className="ui-btn" type="button" onClick={resetPanelWidths}>
                        恢复默认宽度
                    </button>
                    <span className="ui-note">拖动分隔条后按页面记忆在本机</span>
                </div>
            </section>
        </div>
    );

    const aboutTab = (
        <div className="options-form">
            <section className="options-group">
                <div className="options-row">
                    <label>版本</label>
                    <span className="options-value">UseIcon v{APP_VERSION}</span>
                    <button
                        className="ui-btn small"
                        type="button"
                        onClick={() => setUpdatesOpen(true)}
                    >
                        <AppIcon name="bookmark" />
                        版本发布
                    </button>
                </div>
                <div className="options-row">
                    <label>数据存储</label>
                    <span className="ui-note">项目、图标与收藏保存在 uiapi.tthaoke.com，账号信息来自 api.tthaoke.com</span>
                </div>
            </section>
        </div>
    );

    return (
        <Dialog open={open} setOpen={setOpen} width="40em" clickMaskerToClose>
            <Dialog.Title>选项</Dialog.Title>
            <Dialog.Content>
                <Tabs
                    items={[
                        { trigger: "常规", content: generalTab },
                        { trigger: "关于", content: aboutTab },
                    ]}
                />
            </Dialog.Content>
            <Dialog.Action align="right">
                <button className="ui-btn" type="button" onClick={() => setOpen(false)}>
                    关闭
                </button>
            </Dialog.Action>
            <Dialog open={updatesOpen} setOpen={setUpdatesOpen} width="42em" maxHeight="70vh" clickMaskerToClose>
                <Dialog.Title>版本发布</Dialog.Title>
                <Dialog.Content>
                    <UpdatesLog />
                </Dialog.Content>
                <Dialog.Action align="right">
                    <button className="ui-btn" type="button" onClick={() => setUpdatesOpen(false)}>
                        关闭
                    </button>
                </Dialog.Action>
            </Dialog>
        </Dialog>
    );
};
