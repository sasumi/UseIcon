import type { IconCandidate } from "@/types";
import { sanitizeIconName } from "./svg";

const SVG_NS = "http://www.w3.org/2000/svg";

/** 从任意文本中截取第一个 <svg>…</svg>（iconfont.js 里是 JS 字符串） */
const extractSvgMarkup = (source: string): string => {
    const match = source.match(/<svg[\s\S]*<\/svg>/i);
    return match ? match[0] : source;
};

const parseXml = (markup: string): Document => {
    const text = /xmlns\s*=/.test(markup) ? markup : markup.replace(/^<svg/i, `<svg xmlns="${SVG_NS}"`);
    const doc = new DOMParser().parseFromString(text, "image/svg+xml");
    if (doc.querySelector("parsererror")) {
        throw new Error("文件解析失败，请确认是 iconfont 导出的 iconfont.js 或 iconfont.svg");
    }
    return doc;
};

const buildCandidate = (name: string, viewBox: string, inner: string, key: string): IconCandidate => ({
    key,
    className: sanitizeIconName(name),
    svg: `<svg xmlns="${SVG_NS}" viewBox="${viewBox}">${inner}</svg>`,
    tags: [],
    checked: true,
});

/** 解析 symbol 模式的 iconfont.js / svg */
const parseSymbols = (doc: Document): IconCandidate[] => {
    const symbols = Array.from(doc.querySelectorAll("symbol"));
    return symbols
        .map((symbol) => {
            const id = symbol.getAttribute("id") || "";
            const name = id.replace(/^icon-/, "");
            const viewBox = symbol.getAttribute("viewBox") || "0 0 1024 1024";
            const inner = Array.from(symbol.childNodes)
                .map((node) => new XMLSerializer().serializeToString(node))
                .join("");
            return buildCandidate(name || id, viewBox, inner, `symbol-${id}`);
        })
        .filter((candidate) => candidate.className);
};

/** 解析 SVG 字体（iconfont.svg） */
const parseSvgFont = (doc: Document): IconCandidate[] => {
    const font = doc.querySelector("font");
    const face = doc.querySelector("font-face");
    if (!font || !face) {
        return [];
    }
    const unitsPerEm = Number(face.getAttribute("units-per-em")) || 1024;
    const ascent = Number(face.getAttribute("ascent")) || unitsPerEm;
    const defaultWidth = Number(font.getAttribute("horiz-adv-x")) || unitsPerEm;
    const glyphs = Array.from(font.querySelectorAll("glyph"));
    return glyphs
        .map((glyph, index) => {
            const d = glyph.getAttribute("d");
            if (!d) {
                return null;
            }
            const unicode = glyph.getAttribute("unicode") || "";
            const glyphName = glyph.getAttribute("glyph-name") || "";
            const codePoint = unicode.codePointAt(0);
            const name = glyphName || (codePoint ? `icon-${codePoint.toString(16)}` : `glyph-${index + 1}`);
            const advance = Number(glyph.getAttribute("horiz-adv-x")) || defaultWidth;
            const inner = `<g transform="translate(0 ${ascent}) scale(1 -1)"><path d="${d}"/></g>`;
            return buildCandidate(name, `0 0 ${advance} ${unitsPerEm}`, inner, `glyph-${name}-${index}`);
        })
        .filter((candidate): candidate is IconCandidate => Boolean(candidate));
};

/**
 * 解析 iconfont 导出文件：
 * - iconfont.js（symbol 集合）
 * - iconfont.svg（SVG 字体）
 */
export const parseIconfontSource = (source: string): IconCandidate[] => {
    const markup = extractSvgMarkup(source);
    if (!/<svg/i.test(markup)) {
        throw new Error("未找到 SVG 内容，请上传 iconfont.js 或 iconfont.svg");
    }
    const doc = parseXml(markup);
    const symbols = parseSymbols(doc);
    if (symbols.length > 0) {
        return symbols;
    }
    const glyphs = parseSvgFont(doc);
    if (glyphs.length > 0) {
        return glyphs;
    }
    throw new Error("未解析到图标，请确认文件来自 iconfont 的 Symbol 或 SVG 字体下载");
};

/** 解析页面/文本中的 SVG 集合（扩展抓取与粘贴导入共用） */
export const parseSvgCollection = (source: string): IconCandidate[] => {
    const doc = parseXml(extractSvgMarkup(source));
    const roots = Array.from(doc.querySelectorAll("svg"));
    const list = roots.length > 0 ? roots : [doc.documentElement];
    return list
        .map((root, index) => {
            const viewBox = root.getAttribute("viewBox") || "0 0 24 24";
            const inner = Array.from(root.childNodes)
                .map((node) => new XMLSerializer().serializeToString(node))
                .join("");
            const id = root.getAttribute("id") || "";
            const label = root.getAttribute("data-icon") || root.getAttribute("aria-label") || id || `svg-${index + 1}`;
            return buildCandidate(label, viewBox, inner, `svg-${index}-${label}`);
        })
        .filter((candidate) => candidate.svg.length > 40);
};
