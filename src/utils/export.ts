import JSZip from "jszip";
import type { IconItem } from "@/types";
import { downloadBlob, downloadText } from "./download";
import { svgToPngBlob } from "./image";
import { optimizeSvg } from "./svg";

/** iconfont 导入规范尺寸 */
const ICONFONT_SIZE = 200;
/** iconfont unicode 起始码位 */
const ICONFONT_UNICODE_START = 0xe600;

const safeFolderName = (name: string): string => name.replace(/[\\/:*?"<>|]+/g, "-").trim() || "icons";

/** 导出全部 SVG（zip） */
export const exportSvgZip = async (icons: IconItem[], projectName: string): Promise<void> => {
    const zip = new JSZip();
    const folder = zip.folder("svg")!;
    icons.forEach((icon) => folder.file(`${icon.className}.svg`, icon.svg));
    folder.file(
        "icons.json",
        JSON.stringify(
            icons.map((icon) => ({ className: icon.className, tags: icon.tags, libraryId: icon.libraryId })),
            null,
            2,
        ),
    );
    downloadBlob(await zip.generateAsync({ type: "blob" }), `${safeFolderName(projectName)}-svg.zip`);
};

/** 导出全部 PNG（zip），按 1x / 2x 输出 */
export const exportPngZip = async (
    icons: IconItem[],
    projectName: string,
    size: number,
    color = "#000000",
    scale = 2,
): Promise<void> => {
    const zip = new JSZip();
    for (const icon of icons) {
        const blob = await svgToPngBlob(icon.svg, size, color);
        zip.file(`${icon.className}@${size}px.png`, blob);
        if (scale > 1) {
            const blob2x = await svgToPngBlob(icon.svg, size * scale, color);
            zip.file(`${icon.className}@${size * scale}px.png`, blob2x);
        }
    }
    downloadBlob(await zip.generateAsync({ type: "blob" }), `${safeFolderName(projectName)}-png.zip`);
};

/** 导出 SVG Sprite（symbol 集合） */
export const exportSprite = (icons: IconItem[]): string => {
    const symbols = icons
        .map((icon) => {
            const inner = icon.svg.replace(/^<svg[^>]*>/i, "").replace(/<\/svg>$/i, "");
            const viewBox = /viewBox="([^"]+)"/i.exec(icon.svg)?.[1] || "0 0 24 24";
            return `<symbol id="icon-${icon.className}" viewBox="${viewBox}">${inner}</symbol>`;
        })
        .join("");
    return `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${symbols}</svg>`;
};

/** 导出 SVG Sprite 文件（symbol 集合） */
export const exportSpriteFile = (icons: IconItem[], projectName: string): void => {
    downloadText(exportSprite(icons), `${safeFolderName(projectName)}-sprite.svg`, "image/svg+xml;charset=utf-8");
};

const buildIconfontCss = (icons: { name: string; unicode: number }[], fontFamily: string): string => {
    const classes = icons
        .map(
            (icon) => `.icon-${icon.name}:before {
  content: "\\${icon.unicode.toString(16)}";
}`,
        )
        .join("\n\n");
    return `@font-face {
  font-family: "${fontFamily}";
  src: url("./iconfont.woff2") format("woff2"), url("./iconfont.woff") format("woff"), url("./iconfont.ttf") format("truetype");
  font-display: block;
}

.iconfont {
  font-family: "${fontFamily}" !important;
  font-size: 16px;
  font-style: normal;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

${classes}
`;
};

const buildIconfontReadme = (projectName: string, count: number): string => `# ${projectName} iconfont 使用说明

本包共 ${count} 个 SVG 图标，已按 iconfont.cn 导入规范（${ICONFONT_SIZE}x${ICONFONT_SIZE}、currentColor、无固定填充）整理。

## 生成字体
1. 打开 https://www.iconfont.cn/ ，新建/进入一个项目；
2. 点击「上传图标」，选择本压缩包中 svg/ 目录下的全部 .svg 文件；
3. 在项目中点击「下载至本地」，得到 iconfont.js / iconfont.css / 字体文件；
4. 用本包提供的 iconfont.css 覆盖下载包中的同名文件（或直接参考其类名与 unicode）。

## 使用（font-class）
\`\`\`html
<i class="iconfont icon-图标名"></i>
\`\`\`

## 使用（Symbol）
\`\`\`html
<svg class="icon" aria-hidden="true"><use xlink:href="#icon-图标名"></use></svg>
\`\`\`

> unicode.json 记录了图标名与码位的对应关系。
`;

/** 导出 iconfont 可导入包（svg 集合 + unicode 映射 + CSS + 说明） */
export const exportIconfontZip = async (icons: IconItem[], projectName: string): Promise<void> => {
    const zip = new JSZip();
    const folder = zip.folder("iconfont")!;
    const svgFolder = folder.folder("svg")!;
    const unicodeRows = icons.map((icon, index) => {
        const className = icon.className;
        svgFolder.file(`${className}.svg`, optimizeSvg(icon.svg, { size: ICONFONT_SIZE, useCurrentColor: true, precision: 2 }));
        return { name: className, unicode: ICONFONT_UNICODE_START + index };
    });
    folder.file("iconfont.css", buildIconfontCss(unicodeRows, `useicon-${safeFolderName(projectName).toLowerCase()}`));
    folder.file("unicode.json", JSON.stringify(unicodeRows.reduce<Record<string, string>>((acc, row) => {
        acc[row.name] = `\\${row.unicode.toString(16)}`;
        return acc;
    }, {}), null, 2));
    folder.file(
        "symbol.svg",
        exportSprite(icons.map((icon) => ({ ...icon, svg: optimizeSvg(icon.svg, { size: ICONFONT_SIZE, useCurrentColor: true }) }))),
    );
    folder.file("README.md", buildIconfontReadme(projectName, icons.length));
    downloadBlob(await zip.generateAsync({ type: "blob" }), `${safeFolderName(projectName)}-iconfont.zip`);
};

/** 导出项目图标 JSON（便于迁移到后台服务） */
export const exportJson = (icons: IconItem[], projectName: string): void => {
    const data = JSON.stringify({ project: projectName, exportedAt: new Date().toISOString(), icons }, null, 2);
    downloadBlob(new Blob([data], { type: "application/json;charset=utf-8" }), `${safeFolderName(projectName)}-icons.json`);
};
