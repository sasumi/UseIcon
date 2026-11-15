import type { ThemeMode } from "./types";

/** 应用名 */
export const APP_NAME = "UseIcon";

/** localStorage 数据库键（后期切 PHP 后台时替换 api 层即可） */
export const DB_STORAGE_KEY = "useicon:db:v1";

/** 登录令牌存放键 */
export const TOKEN_STORAGE_KEY = "useicon:token";

/** 登录用户缓存键 */
export const LOGIN_USER_STORAGE_KEY = "useicon:login-user";

/** 采集车存储键 */
export const CART_STORAGE_KEY = "useicon:cart";



/** 侧栏 / 抽屉宽度记忆键前缀 */
export const PANEL_WIDTH_STORAGE_PREFIX = "useicon:panel-width:";

/** 主题模式存放键 */
export const THEME_STORAGE_KEY = "useicon:theme";

/** 图标列表显示设置存放键（全局唯一） */
export const ICON_DISPLAY_STORAGE_KEY = "useicon:icon-display";

/** 自定义代码类型存放键 */
export const CODE_TYPES_STORAGE_KEY = "useicon:code-types";

/** ExtMode 代码区高度记忆键 */
export const EXTMODE_CODE_HEIGHT_KEY = "useicon:extmode-code-height";

/** 模拟网络延迟（毫秒） */
export const MOCK_DELAY = 160;

/** 默认图标尺寸 */
export const DEFAULT_ICON_SIZE = 24;

/** 图标默认颜色 */
export const DEFAULT_ICON_COLOR = "currentColor";

/** 主题模式列表 */
export const THEME_LIST: ThemeMode[] = ["light", "dark", "auto"];

/** 主题模式名称 */
export const THEME_LABELS: Record<ThemeMode, string> = {
    light: "亮色",
    dark: "暗色",
    auto: "跟随系统",
};

/** 代码模板占位符说明 */
export const TEMPLATE_PLACEHOLDERS: { key: string; desc: string }[] = [
    { key: "{name} 或 %icon_name%", desc: "图标 className" },
    { key: "{Name} 或 %IconName%", desc: "className 的 PascalCase" },
    { key: "{size} 或 %size%", desc: "项目设置的图标尺寸" },
    { key: "{color} 或 %color%", desc: "颜色（默认 currentColor）" },
    { key: "{svg} 或 %svg%", desc: "完整 SVG 源码" },
    { key: "{svgBase64}", desc: "SVG 的 base64 编码（用于 CSS mask）" },
];

/** 默认代码模板 */
export const DEFAULT_CODE_TEMPLATE = `<!-- {name} · {size}px -->
{svg}
`;

/** 代码模板预设 */
export const CODE_TEMPLATE_PRESETS: { name: string; template: string }[] = [
    {
        name: "原生 SVG",
        template: `<!-- {name} · {size}px -->
{svg}
`,
    },
    {
        name: "Icon 组件",
        template: `<Icon icon="%icon_name%" size={%size%} />
`,
    },
    {
        name: "React 组件",
        template: `<{Name}Icon size="{size}" color="{color}" />
`,
    },
    {
        name: "Vue 组件",
        template: `<{Name}Icon :size="{size}" color="{color}" />
`,
    },
    {
        name: "CSS Mask",
        template: `.icon-{name} {
  width: {size}px;
  height: {size}px;
  background-color: {color};
  mask: url("data:image/svg+xml;base64,{svgBase64}") center / contain no-repeat;
}
`,
    },
];

/** 图片转 SVG 时的最大边长（像素） */
export const IMAGE_RASTER_MAX_SIZE = 512;
