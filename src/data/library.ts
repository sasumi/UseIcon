/**
 * 内置图标集
 *
 * 应用界面自身的图标（AppIcon）从这里取，不依赖后台数据；后台公共图标库的初始数据也来自同一份
 * （见 uiapi/script/library-seed.json），但公共库后续可被白名单用户在后台增删改，两者互不影响。
 */

/** 公共库分类（顺序即侧栏展示顺序；后台新增的分类会自动追加在后面） */
export const LIBRARY_CATEGORIES = ["基础", "箭头", "操作", "文件", "媒体", "通讯", "账户", "设备", "数据"];

/** 常用分类：项目自己的分类较少时并入候选项（与项目已有分类去重） */
export const COMMON_CATEGORIES = [
    "基础",
    "箭头",
    "操作",
    "导航",
    "状态",
    "界面",
    "文件",
    "媒体",
    "通讯",
    "账户",
    "设备",
    "数据",
];

/** 上传未指定分类时的默认分类（与后台 UiIcon::DEFAULT_CATEGORY 一致） */
export const LIBRARY_DEFAULT_CATEGORY = "自定义";

/** 分类排序：已知分类按固定顺序，未知分类（后台新增）排在后面 */
export const sortLibraryCategories = (categories: string[]): string[] => {
    const known = new Set(LIBRARY_CATEGORIES);
    const extra = Array.from(new Set(categories.filter((item) => item && !known.has(item)))).sort((a, b) =>
        a.localeCompare(b, "zh-CN"),
    );
    return [...LIBRARY_CATEGORIES, ...extra];
};

interface BuiltinIcon {
    className: string; // 图标类名
    category: string; // 分类
    tags: string[]; // 搜索标签
    svg: string; // SVG 源码
}

const BUILTIN_ICONS: BuiltinIcon[] = [
    {
        className: "plus",
        category: "基础",
        tags: ["add", "new", "加号"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 5v14M5 12h14\"/></svg>",
    },
    {
        className: "minus",
        category: "基础",
        tags: ["sub", "remove", "减号"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M5 12h14\"/></svg>",
    },
    {
        className: "close",
        category: "基础",
        tags: ["x", "cancel", "叉"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M6 6l12 12M18 6L6 18\"/></svg>",
    },
    {
        className: "check",
        category: "基础",
        tags: ["ok", "done", "完成"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M4.5 12.5l4.5 4.5L19.5 6.5\"/></svg>",
    },
    {
        className: "search",
        category: "基础",
        tags: ["find", "放大镜"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"11\" cy=\"11\" r=\"7\"/><path d=\"M16.2 16.2L21 21\"/></svg>",
    },
    {
        className: "info",
        category: "基础",
        tags: ["info", "提示"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"8.5\"/><path d=\"M12 11v6M12 7.5h.01\"/></svg>",
    },
    {
        className: "warning",
        category: "基础",
        tags: ["warn", "alert", "三角"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 3.8l8.6 16H3.4z\"/><path d=\"M12 9.6v4M12 16.6h.01\"/></svg>",
    },
    {
        className: "error",
        category: "基础",
        tags: ["fail", "错误"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"8.5\"/><path d=\"M9 9l6 6M15 9l-6 6\"/></svg>",
    },
    {
        className: "success",
        category: "基础",
        tags: ["ok", "success", "完成"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"8.5\"/><path d=\"M8 12.4l2.8 2.8L16.4 9.6\"/></svg>",
    },
    {
        className: "question",
        category: "基础",
        tags: ["help", "faq", "问号"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"8.5\"/><path d=\"M9.4 9.6a2.6 2.6 0 1 1 3.7 2.4c-.7.3-1.1.9-1.1 1.7M12 17h.01\"/></svg>",
    },
    {
        className: "arrow-left",
        category: "箭头",
        tags: ["left", "back", "返回"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M19 12H5M11 18l-6-6 6-6\"/></svg>",
    },
    {
        className: "arrow-right",
        category: "箭头",
        tags: ["right", "next", "前进"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M5 12h14M13 6l6 6-6 6\"/></svg>",
    },
    {
        className: "arrow-up",
        category: "箭头",
        tags: ["up", "top"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 19V5M6 11l6-6 6 6\"/></svg>",
    },
    {
        className: "arrow-down",
        category: "箭头",
        tags: ["down", "bottom"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 5v14M18 13l-6 6-6-6\"/></svg>",
    },
    {
        className: "arrow-up-right",
        category: "箭头",
        tags: ["external", "外链", "跳转"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M7 17L17 7M8 7h9v9\"/></svg>",
    },
    {
        className: "chevron-left",
        category: "箭头",
        tags: ["caret", "left"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M15 4.5L7.5 12 15 19.5\"/></svg>",
    },
    {
        className: "chevron-right",
        category: "箭头",
        tags: ["caret", "right"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M9 4.5L16.5 12 9 19.5\"/></svg>",
    },
    {
        className: "chevron-up",
        category: "箭头",
        tags: ["caret", "up"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M4.5 15L12 7.5 19.5 15\"/></svg>",
    },
    {
        className: "chevron-down",
        category: "箭头",
        tags: ["caret", "down"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M4.5 9L12 16.5 19.5 9\"/></svg>",
    },
    {
        className: "expand",
        category: "箭头",
        tags: ["fullscreen", "maximize", "放大"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M9 4H4v5M15 4h5v5M15 20h5v-5M9 20H4v-5\"/></svg>",
    },
    {
        className: "edit",
        category: "操作",
        tags: ["pencil", "write", "修改"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M4 20h4L20.5 7.5a2.12 2.12 0 0 0-3-3L5 17z\"/><path d=\"M14.5 6.5l3 3\"/></svg>",
    },
    {
        className: "trash",
        category: "操作",
        tags: ["delete", "remove", "垃圾桶"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M4 7h16M9.5 7V4.8h5V7M6.5 7l1 12.2h9l1-12.2\"/><path d=\"M10 11v5M14 11v5\"/></svg>",
    },
    {
        className: "copy",
        category: "操作",
        tags: ["duplicate", "拷贝"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"9\" y=\"9\" width=\"11\" height=\"11\" rx=\"2\"/><path d=\"M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3\"/></svg>",
    },
    {
        className: "download",
        category: "操作",
        tags: ["save", "导出"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 3.5v11M7.5 10.5L12 15l4.5-4.5M4.5 20.5h15\"/></svg>",
    },
    {
        className: "upload",
        category: "操作",
        tags: ["import", "导入"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 15V3.5M7.5 8L12 3.5 16.5 8M4.5 20.5h15\"/></svg>",
    },
    {
        className: "refresh",
        category: "操作",
        tags: ["reload", "renew", "重试"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M20 12a8 8 0 1 1-2.6-5.9M20 4.5v5h-5\"/></svg>",
    },
    {
        className: "filter",
        category: "操作",
        tags: ["filter", "过滤"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M4 6.5h16M7 12h10M10 17.5h4\"/></svg>",
    },
    {
        className: "settings",
        category: "操作",
        tags: ["sliders", "config", "配置"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M5 7h14M5 12h14M5 17h14\"/><circle cx=\"9\" cy=\"7\" r=\"2\"/><circle cx=\"15\" cy=\"12\" r=\"2\"/><circle cx=\"8\" cy=\"17\" r=\"2\"/></svg>",
    },
    {
        className: "link",
        category: "操作",
        tags: ["url", "chain", "链接"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M10.5 13.5l3-3\"/><path d=\"M8.5 7.5l1.8-1.8a4 4 0 0 1 5.7 5.7l-1.8 1.8\"/><path d=\"M15.5 16.5l-1.8 1.8a4 4 0 0 1-5.7-5.7l1.8-1.8\"/></svg>",
    },
    {
        className: "more-horizontal",
        category: "操作",
        tags: ["dots", "菜单"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"6\" cy=\"12\" r=\"1.4\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"12\" cy=\"12\" r=\"1.4\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"18\" cy=\"12\" r=\"1.4\" fill=\"currentColor\" stroke=\"none\"/></svg>",
    },
    {
        className: "more-vertical",
        category: "操作",
        tags: ["dots", "菜单"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"6\" r=\"1.4\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"12\" cy=\"12\" r=\"1.4\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"12\" cy=\"18\" r=\"1.4\" fill=\"currentColor\" stroke=\"none\"/></svg>",
    },
    {
        className: "tag",
        category: "操作",
        tags: ["label", "标签"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M4 4h6.7l9.3 9.3-6.7 6.7L4 10.7z\"/><circle cx=\"8.3\" cy=\"8.3\" r=\"1.3\"/></svg>",
    },
    {
        className: "pin",
        category: "操作",
        tags: ["location", "map", "地图"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 21s6.5-5.8 6.5-10.5a6.5 6.5 0 1 0-13 0C5.5 15.2 12 21 12 21z\"/><circle cx=\"12\" cy=\"10.5\" r=\"2.3\"/></svg>",
    },
    {
        className: "undo",
        category: "操作",
        tags: ["revert", "back"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M4.5 9.5h10a5 5 0 0 1 0 10H8\"/><path d=\"M8 5L4.5 9.5 8 14\"/></svg>",
    },
    {
        className: "redo",
        category: "操作",
        tags: ["forward", "redo"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M19.5 9.5h-10a5 5 0 0 0 0 10H16\"/><path d=\"M16 5l3.5 4.5L16 14\"/></svg>",
    },
    {
        className: "zoom-in",
        category: "操作",
        tags: ["plus", "scale"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"11\" cy=\"11\" r=\"7\"/><path d=\"M16.2 16.2L21 21M8 11h6M11 8v6\"/></svg>",
    },
    {
        className: "zoom-out",
        category: "操作",
        tags: ["minus", "scale"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"11\" cy=\"11\" r=\"7\"/><path d=\"M16.2 16.2L21 21M8 11h6\"/></svg>",
    },
    {
        className: "folder",
        category: "文件",
        tags: ["dir", "目录"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M3.5 8a2 2 0 0 1 2-2h3.8l2 2h7.2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z\"/></svg>",
    },
    {
        className: "file",
        category: "文件",
        tags: ["doc", "文档"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M6 3.5h7.5L19 9v11.5H6z\"/><path d=\"M13.5 3.5V9H19\"/></svg>",
    },
    {
        className: "file-code",
        category: "文件",
        tags: ["source", "源码"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M6 3.5h7.5L19 9v11.5H6z\"/><path d=\"M13.5 3.5V9H19M10.5 13.2l-2 2.2 2 2.2M14.5 13.2l2 2.2-2 2.2\"/></svg>",
    },
    {
        className: "code",
        category: "文件",
        tags: ["dev", "编程"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M8.5 8L4 12l4.5 4M15.5 8L20 12l-4.5 4M14 4.5l-4 15\"/></svg>",
    },
    {
        className: "terminal",
        category: "文件",
        tags: ["cli", "shell", "命令行"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"3.5\" y=\"4.5\" width=\"17\" height=\"15\" rx=\"2\"/><path d=\"M7 9.5l3 2.8-3 2.8M12.5 15.5h5\"/></svg>",
    },
    {
        className: "grid",
        category: "文件",
        tags: ["layout", "宫格"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"4\" y=\"4\" width=\"7\" height=\"7\" rx=\"1.5\"/><rect x=\"13\" y=\"4\" width=\"7\" height=\"7\" rx=\"1.5\"/><rect x=\"4\" y=\"13\" width=\"7\" height=\"7\" rx=\"1.5\"/><rect x=\"13\" y=\"13\" width=\"7\" height=\"7\" rx=\"1.5\"/></svg>",
    },
    {
        className: "list",
        category: "文件",
        tags: ["rows", "列表"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M9 6.5h11M9 12h11M9 17.5h11\"/><circle cx=\"5\" cy=\"6.5\" r=\"1.2\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"5\" cy=\"12\" r=\"1.2\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"5\" cy=\"17.5\" r=\"1.2\" fill=\"currentColor\" stroke=\"none\"/></svg>",
    },
    {
        className: "bookmark",
        category: "文件",
        tags: ["save", "收藏"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M6.5 4.5h11v16L12 16.2 6.5 20.5z\"/></svg>",
    },
    {
        className: "table",
        category: "文件",
        tags: ["data", "数据表"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"3.5\" y=\"4.5\" width=\"17\" height=\"15\" rx=\"2\"/><path d=\"M3.5 9.5h17M9.5 9.5v10\"/></svg>",
    },
    {
        className: "play",
        category: "媒体",
        tags: ["start", "运行"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M8 5.5l10.5 6.5L8 18.5z\"/></svg>",
    },
    {
        className: "pause",
        category: "媒体",
        tags: ["stop", "暂停"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M9 5v14M15 5v14\"/></svg>",
    },
    {
        className: "stop",
        category: "媒体",
        tags: ["end", "停止"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"6\" y=\"6\" width=\"12\" height=\"12\" rx=\"2\"/></svg>",
    },
    {
        className: "image",
        category: "媒体",
        tags: ["photo", "picture", "图像"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"3.5\" y=\"4.5\" width=\"17\" height=\"15\" rx=\"2\"/><circle cx=\"8.5\" cy=\"9.5\" r=\"1.5\"/><path d=\"M4.5 17.5l4.8-4.8 3.7 3.7 2.6-2.6 3.9 3.9\"/></svg>",
    },
    {
        className: "video",
        category: "媒体",
        tags: ["movie", "摄像"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"3.5\" y=\"5.5\" width=\"17\" height=\"13\" rx=\"2\"/><path d=\"M10.5 9.5l4 2.5-4 2.5z\"/></svg>",
    },
    {
        className: "music",
        category: "媒体",
        tags: ["audio", "音频"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M9 17.5V6.5l9-2v11\"/><circle cx=\"6.5\" cy=\"18\" r=\"2.5\"/><circle cx=\"15.5\" cy=\"16\" r=\"2.5\"/></svg>",
    },
    {
        className: "mic",
        category: "媒体",
        tags: ["voice", "语音"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"9.5\" y=\"3.5\" width=\"5\" height=\"10\" rx=\"2.5\"/><path d=\"M6 11.5a6 6 0 0 0 12 0M12 17.5V21\"/></svg>",
    },
    {
        className: "mail",
        category: "通讯",
        tags: ["email", "信封"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"3.5\" y=\"5\" width=\"17\" height=\"14\" rx=\"2\"/><path d=\"M4 7l8 5.5L20 7\"/></svg>",
    },
    {
        className: "bell",
        category: "通讯",
        tags: ["notification", "铃铛"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M6.5 10a5.5 5.5 0 0 1 11 0c0 3.5.8 4.7 1.8 5.8H4.7c1-1.1 1.8-2.3 1.8-5.8z\"/><path d=\"M10 19a2 2 0 0 0 4 0\"/></svg>",
    },
    {
        className: "message",
        category: "通讯",
        tags: ["chat", "comment", "评论"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M4 5.5h16v11H12l-4.5 3.5v-3.5H4z\"/></svg>",
    },
    {
        className: "send",
        category: "通讯",
        tags: ["paper-plane", "提交"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M21 3.5L3 10.5l7 2.5 2.5 7z\"/><path d=\"M10 13l5-5\"/></svg>",
    },
    {
        className: "cloud",
        category: "通讯",
        tags: ["cloud", "云端"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M7.5 18.5a4 4 0 0 1-.5-8 5.5 5.5 0 0 1 10.4-1.3A3.7 3.7 0 0 1 17.5 18.5z\"/></svg>",
    },
    {
        className: "globe",
        category: "通讯",
        tags: ["world", "language", "地球"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"8.5\"/><path d=\"M3.5 12h17M12 3.5c2.6 2.7 2.6 14.3 0 17M12 3.5c-2.6 2.7-2.6 14.3 0 17\"/></svg>",
    },
    {
        className: "phone",
        category: "通讯",
        tags: ["mobile", "移动端"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M7 3.5h10a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 7 3.5z\"/><path d=\"M10 17.5h4\"/></svg>",
    },
    {
        className: "user",
        category: "账户",
        tags: ["account", "person", "用户"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"8\" r=\"4\"/><path d=\"M4.5 20.5c0-4.1 3.4-6.5 7.5-6.5s7.5 2.4 7.5 6.5\"/></svg>",
    },
    {
        className: "users",
        category: "账户",
        tags: ["team", "group", "团队"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"9.5\" cy=\"8\" r=\"3.5\"/><path d=\"M3 20c0-3.6 2.9-5.8 6.5-5.8S16 16.4 16 20\"/><path d=\"M16.5 5.2a3.5 3.5 0 0 1 0 6.6M18.5 20c0-2.5-.8-4.3-2-5.4 2.9.3 5 2.3 5 5.4\"/></svg>",
    },
    {
        className: "lock",
        category: "账户",
        tags: ["lock", "private", "私密"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"4.5\" y=\"10\" width=\"15\" height=\"10\" rx=\"2\"/><path d=\"M8 10V7.5a4 4 0 0 1 8 0V10\"/></svg>",
    },
    {
        className: "unlock",
        category: "账户",
        tags: ["unlock", "public", "公开"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"4.5\" y=\"10\" width=\"15\" height=\"10\" rx=\"2\"/><path d=\"M8 10V7.5a4 4 0 0 1 7.3-2\"/></svg>",
    },
    {
        className: "eye",
        category: "账户",
        tags: ["visible", "view", "可见"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/></svg>",
    },
    {
        className: "eye-off",
        category: "账户",
        tags: ["hidden", "unvisible", "不可见"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M4 4l16 16\"/><path d=\"M9.9 6.1A9.4 9.4 0 0 1 12 5.9c6 0 9.5 6.1 9.5 6.1a17 17 0 0 1-3.3 3.6M6.4 8.2A17.6 17.6 0 0 0 2.5 12s3.5 6.1 9.5 6.1a9.9 9.9 0 0 0 4.2-.9\"/></svg>",
    },
    {
        className: "heart",
        category: "账户",
        tags: ["love", "favorite", "收藏"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 20.5S4 15.7 4 10.2A4.2 4.2 0 0 1 12 7.6a4.2 4.2 0 0 1 8 2.6c0 5.5-8 10.3-8 10.3z\"/></svg>",
    },
    {
        className: "star",
        category: "账户",
        tags: ["favorite", "rate", "评分"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.8z\"/></svg>",
    },
    {
        className: "home",
        category: "设备",
        tags: ["house", "主页"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z\"/></svg>",
    },
    {
        className: "calendar",
        category: "设备",
        tags: ["date", "schedule", "日期"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"3.5\" y=\"5.5\" width=\"17\" height=\"15\" rx=\"2\"/><path d=\"M8 3.5v4M16 3.5v4M3.5 10.5h17\"/></svg>",
    },
    {
        className: "clock",
        category: "设备",
        tags: ["time", "timer", "时间"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"8.5\"/><path d=\"M12 7v5.3l3.4 2\"/></svg>",
    },
    {
        className: "sun",
        category: "设备",
        tags: ["light", "day", "亮色"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"4\"/><path d=\"M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4\"/></svg>",
    },
    {
        className: "moon",
        category: "设备",
        tags: ["dark", "night", "暗色"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z\"/></svg>",
    },
    {
        className: "monitor",
        category: "设备",
        tags: ["screen", "desktop", "跟随系统"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"3\" y=\"4.5\" width=\"18\" height=\"12\" rx=\"2\"/><path d=\"M9 20.5h6M12 16.5v4\"/></svg>",
    },
    {
        className: "cart",
        category: "设备",
        tags: ["shop", "buy", "购买"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M3 5h2.2l2.4 9.5h9.7L20 8H6.3\"/><circle cx=\"9.5\" cy=\"18.5\" r=\"1.6\"/><circle cx=\"17\" cy=\"18.5\" r=\"1.6\"/></svg>",
    },
    {
        className: "cpu",
        category: "设备",
        tags: ["chip", "processor"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"6.5\" y=\"6.5\" width=\"11\" height=\"11\" rx=\"2\"/><rect x=\"9.5\" y=\"9.5\" width=\"5\" height=\"5\" rx=\"1\"/><path d=\"M9.5 3.5v3M14.5 3.5v3M9.5 17.5v3M14.5 17.5v3M3.5 9.5h3M3.5 14.5h3M17.5 9.5h3M17.5 14.5h3\"/></svg>",
    },
    {
        className: "database",
        category: "数据",
        tags: ["db", "storage", "数据"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><ellipse cx=\"12\" cy=\"6.5\" rx=\"7.5\" ry=\"3\"/><path d=\"M4.5 6.5v11c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-11M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3\"/></svg>",
    },
    {
        className: "layers",
        category: "数据",
        tags: ["stack", "层级"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 3.5l8.5 4.5L12 12.5 3.5 8z\"/><path d=\"M3.5 12.5L12 17l8.5-4.5M3.5 16.5L12 21l8.5-4.5\"/></svg>",
    },
    {
        className: "box",
        category: "数据",
        tags: ["package", "module", "模块"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 3.5l8 4v9l-8 4-8-4v-9z\"/><path d=\"M4 7.5l8 4 8-4M12 11.5v9\"/></svg>",
    },
    {
        className: "shield",
        category: "数据",
        tags: ["secure", "guard", "权限"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 3.5l7.5 3v6c0 4.3-3.1 7.3-7.5 8.5-4.4-1.2-7.5-4.2-7.5-8.5v-6z\"/><path d=\"M9 12l2.2 2.2L15.5 10\"/></svg>",
    },
    {
        className: "key",
        category: "数据",
        tags: ["key", "token", "授权"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"8\" cy=\"12\" r=\"3.5\"/><path d=\"M11.5 12h9M17.5 12v3M20.5 12v2.5\"/></svg>",
    },
    {
        className: "wifi",
        category: "数据",
        tags: ["wireless", "signal"],
        svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M3 9.5a14 14 0 0 1 18 0M6 13a9.5 9.5 0 0 1 12 0M9 16.5a5 5 0 0 1 6 0\"/><circle cx=\"12\" cy=\"19.5\" r=\"1\" fill=\"currentColor\" stroke=\"none\"/></svg>",
    },
];

const toLibraryIcon = (icon: BuiltinIcon) => ({ id: `lib-${icon.className}`, ...icon });

export const LIBRARY_ICONS = BUILTIN_ICONS.map(toLibraryIcon);

/** 内置图标索引：键为 lib-<className>，供 AppIcon 按名称取 SVG */
export const LIBRARY_ICON_MAP: Record<string, ReturnType<typeof toLibraryIcon>> = Object.fromEntries(
    LIBRARY_ICONS.map((icon) => [icon.id, icon]),
);
