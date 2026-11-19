import type { IconItem, IconOptimizeOptions } from "@/types";

const SVG_NS = "http://www.w3.org/2000/svg";

/** 需要在 sprite / 图标之间保留的绘制属性（移动节点后图形样式不变） */
export const SVG_PAINT_ATTRS = ["fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "color", "style"];

/** 解析 SVG 源码，失败返回 null */
export const parseSvg = (source: string): SVGSVGElement | null => {
    if (!source) {
        return null;
    }
    let text = source.trim();
    if (!/xmlns\s*=/.test(text)) {
        text = text.replace(/^<svg/i, `<svg xmlns="${SVG_NS}"`);
    }
    // 未声明 xlink 命名空间时，浏览器解析会失败；href 在现代浏览器中可直接替代
    if (/xlink:href/.test(text) && !/xmlns:xlink/.test(text)) {
        text = text.replace(/xlink:href/g, "href");
    }
    const doc = new DOMParser().parseFromString(text, "image/svg+xml");
    if (doc.querySelector("parsererror")) {
        return null;
    }
    const root = doc.documentElement;
    return root && root.localName === "svg" ? (root as unknown as SVGSVGElement) : null;
};

/** 序列化 SVG 元素 */
const serialize = (svg: SVGSVGElement): string => {
    if (!svg.getAttribute("xmlns")) {
        svg.setAttribute("xmlns", SVG_NS);
    }
    return new XMLSerializer().serializeToString(svg).replace(/\s*xmlns:xlink="[^"]*"/g, "");
};

/** 读取 viewBox 宽高 */
export const readViewBox = (svg: SVGSVGElement): { x: number; y: number; width: number; height: number } => {
    const viewBox = svg.getAttribute("viewBox");
    if (viewBox) {
        const parts = viewBox.trim().split(/[\s,]+/).map(Number);
        if (parts.length === 4 && parts.every((value) => Number.isFinite(value)) && parts[2] > 0 && parts[3] > 0) {
            return { x: parts[0], y: parts[1], width: parts[2], height: parts[3] };
        }
    }
    const width = parseFloat(svg.getAttribute("width") || "") || 24;
    const height = parseFloat(svg.getAttribute("height") || "") || 24;
    return { x: 0, y: 0, width, height };
};

/** 去掉标签内多余空白与换行 */
const compactMarkup = (markup: string): string => markup.replace(/>\s+</g, "><").replace(/\s{2,}/g, " ").trim();

/** 数值取整到指定精度并去掉多余的 0 */
const roundNumber = (value: number, precision: number): string => {
    const factor = 10 ** precision;
    const rounded = Math.round(value * factor) / factor;
    return String(rounded);
};

/** 压缩路径 / 坐标类属性中的小数精度 */
const compressNumbers = (input: string, precision: number): string =>
    input.replace(/-?\d*\.\d+(?:e[-+]?\d+)?/gi, (match) => roundNumber(parseFloat(match), precision));

const NUMBER_ATTRS = ["d", "points", "x", "y", "x1", "y1", "x2", "y2", "cx", "cy", "r", "rx", "ry", "width", "height", "stroke-width"];

/** 收集文档中被 url(#id) 引用的 ID，清理时需保留 */
const collectReferencedIds = (svg: SVGSVGElement): Set<string> => {
    const referenced = new Set<string>();
    svg.querySelectorAll("*").forEach((element) => {
        Array.from(element.attributes).forEach((attr) => {
            const matches = attr.value.matchAll(/url\(['"]?#([^)'"]+)/g);
            for (const match of matches) {
                referenced.add(match[1]);
            }
        });
    });
    return referenced;
};

/** 移除危险节点与事件属性 */
const sanitizeElements = (svg: SVGSVGElement): void => {
    svg.querySelectorAll("script, foreignObject").forEach((node) => node.remove());
    const walker = document.createTreeWalker(svg, NodeFilter.SHOW_ELEMENT);
    const elements: Element[] = [];
    while (walker.nextNode()) {
        elements.push(walker.currentNode as Element);
    }
    elements.forEach((element) => {
        Array.from(element.attributes).forEach((attr) => {
            if (/^on/i.test(attr.name)) {
                element.removeAttribute(attr.name);
            }
        });
    });
};

/** 统一的颜色占位符 */
const COLOR_PROPS = ["fill", "stroke", "stop-color", "flood-color", "lighting-color"];

const isFixedColor = (value: string): boolean => {
    const trimmed = value.trim().toLowerCase();
    return Boolean(trimmed) && trimmed !== "none" && trimmed !== "currentcolor" && !trimmed.startsWith("url(") && !trimmed.startsWith("var(");
};

const applyCurrentColor = (svg: SVGSVGElement): void => {
    const elements = [svg, ...Array.from(svg.querySelectorAll("*"))];
    elements.forEach((element) => {
        COLOR_PROPS.forEach((prop) => {
            const value = element.getAttribute(prop);
            if (value && isFixedColor(value)) {
                element.setAttribute(prop, "currentColor");
            }
        });
        const style = element.getAttribute("style");
        if (style) {
            const next = style
                .split(";")
                .map((segment) => {
                    const [rawKey, rawValue] = segment.split(":");
                    const key = (rawKey || "").trim().toLowerCase();
                    if (COLOR_PROPS.includes(key) && rawValue && isFixedColor(rawValue)) {
                        return `${rawKey.trim()}:currentColor`;
                    }
                    return segment;
                })
                .join(";");
            element.setAttribute("style", next);
        }
    });
};

/** 移除填充色（用于线性图标统一成无填充） */
const removeFill = (svg: SVGSVGElement): void => {
    const elements = [svg, ...Array.from(svg.querySelectorAll("*"))];
    elements.forEach((element) => {
        const fill = element.getAttribute("fill");
        if (fill && fill.trim().toLowerCase() !== "none") {
            element.setAttribute("fill", "none");
        }
    });
};

/** 统一线条粗细：根节点设置，后代移除 */
const applyStrokeWidth = (svg: SVGSVGElement, strokeWidth: number): void => {
    svg.setAttribute("stroke-width", String(strokeWidth));
    svg.querySelectorAll("[stroke-width]").forEach((element) => element.removeAttribute("stroke-width"));
};

/** 清理 id / class（保留被 url(#id) 引用的 id） */
const cleanIds = (svg: SVGSVGElement): void => {
    const referenced = collectReferencedIds(svg);
    svg.querySelectorAll("[id]").forEach((element) => {
        const id = element.getAttribute("id") || "";
        if (!referenced.has(id)) {
            element.removeAttribute("id");
        }
        element.removeAttribute("class");
    });
    if (!referenced.has(svg.getAttribute("id") || "")) {
        svg.removeAttribute("id");
    }
    svg.removeAttribute("class");
};

/** 统一下发尺寸：按目标网格等比缩放并居中，输出的 viewBox 为 0 0 size size */
const fitToSize = (svg: SVGSVGElement, size: number): void => {
    const viewBox = readViewBox(svg);
    if (Math.abs(viewBox.width - size) < 0.01 && Math.abs(viewBox.height - size) < 0.01 && viewBox.x === 0 && viewBox.y === 0) {
        svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
        return;
    }
    const scale = Math.min(size / viewBox.width, size / viewBox.height);
    const offsetX = (size - viewBox.width * scale) / 2 - viewBox.x * scale;
    const offsetY = (size - viewBox.height * scale) / 2 - viewBox.y * scale;
    const group = svg.ownerDocument.createElementNS(SVG_NS, "g");
    group.setAttribute("transform", `translate(${roundNumber(offsetX, 3)} ${roundNumber(offsetY, 3)}) scale(${roundNumber(scale, 5)})`);
    while (svg.firstChild) {
        group.appendChild(svg.firstChild);
    }
    svg.appendChild(group);
    svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
};

/**
 * 标准化 SVG：清洗危险内容、补全 viewBox、去除 width/height 固定值
 */
export const normalizeSvg = (source: string, options: { size?: number | null } = {}): string => {
    const svg = parseSvg(source);
    if (!svg) {
        throw new Error("SVG 解析失败，请检查文件内容");
    }
    sanitizeElements(svg);
    const viewBox = readViewBox(svg);
    if (!svg.getAttribute("viewBox")) {
        svg.setAttribute("viewBox", `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`);
    }
    svg.removeAttribute("width");
    svg.removeAttribute("height");
    if (options.size) {
        fitToSize(svg, options.size);
    }
    svg.removeAttribute("enable-background");
    return compactMarkup(serialize(svg));
};

/**
 * 读取 SVG 画布边长：取 viewBox 宽高中较大者，缺省 24
 */
export const readSvgCanvasSize = (source: string): number => {
    const match = /viewBox\s*=\s*["']([^"']+)["']/i.exec(source);
    if (match) {
        const parts = match[1].trim().split(/[\s,]+/).map(Number);
        if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
            return Math.max(parts[2], parts[3]);
        }
    }
    return 24;
};

/**
 * 批量优化 SVG（尺寸 / currentColor / 线条粗细 / 精度 / 清理 id）
 */
export const optimizeSvg = (source: string, options: IconOptimizeOptions = {}): string => {
    const { size = null, useCurrentColor = false, strokeWidth = null, precision = 2, removeFill: clearFill = false } = options;
    const svg = parseSvg(source);
    if (!svg) {
        throw new Error("SVG 解析失败，请检查文件内容");
    }
    sanitizeElements(svg);
    if (!svg.getAttribute("viewBox")) {
        const viewBox = readViewBox(svg);
        svg.setAttribute("viewBox", `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`);
    }
    svg.removeAttribute("width");
    svg.removeAttribute("height");
    svg.removeAttribute("enable-background");
    svg.querySelectorAll("metadata, title, desc").forEach((node) => {
        if (node.localName !== "title" || !node.textContent?.trim()) {
            node.remove();
        }
    });
    if (size) {
        fitToSize(svg, size);
    }
    if (clearFill) {
        removeFill(svg);
    }
    if (useCurrentColor) {
        applyCurrentColor(svg);
    }
    if (strokeWidth) {
        applyStrokeWidth(svg, strokeWidth);
    }
    cleanIds(svg);
    if (precision >= 0) {
        const elements = [svg, ...Array.from(svg.querySelectorAll("*"))];
        elements.forEach((element) => {
            NUMBER_ATTRS.forEach((attr) => {
                const value = element.getAttribute(attr);
                if (value && /\d/.test(value)) {
                    element.setAttribute(attr, compressNumbers(value, precision).replace(/\s+,/g, ","));
                }
            });
        });
    }
    return compactMarkup(serialize(svg));
};

/** 设置线条粗细：根节点下发，后代同名属性移除，保证整体一致 */
export const setSvgStrokeWidth = (source: string, width: number): string => {
    const svg = parseSvg(source);
    if (!svg) {
        throw new Error("SVG 解析失败，请检查源码");
    }
    applyStrokeWidth(svg, width);
    return compactMarkup(serialize(svg));
};

/** 设置图标颜色：固定色替换为目标色，根节点写 color 以驱动 currentColor；传空表示恢复 currentColor */
export const setSvgColor = (source: string, color: string): string => {
    const svg = parseSvg(source);
    if (!svg) {
        throw new Error("SVG 解析失败，请检查源码");
    }
    const target = color || "currentColor";
    const elements = [svg, ...Array.from(svg.querySelectorAll("*"))];
    elements.forEach((element) => {
        COLOR_PROPS.forEach((prop) => {
            const value = element.getAttribute(prop);
            if (value && (isFixedColor(value) || (color && value.trim().toLowerCase() === "currentcolor"))) {
                element.setAttribute(prop, target);
            }
        });
        const style = element.getAttribute("style");
        if (style) {
            element.setAttribute(
                "style",
                style
                    .split(";")
                    .map((segment) => {
                        const [rawKey, rawValue] = segment.split(":");
                        const key = (rawKey || "").trim().toLowerCase();
                        if (COLOR_PROPS.includes(key) && rawValue && isFixedColor(rawValue)) {
                            return `${rawKey.trim()}:${target}`;
                        }
                        return segment;
                    })
                    .join(";"),
            );
        }
    });
    if (color) {
        svg.setAttribute("color", color);
    } else {
        svg.removeAttribute("color");
    }
    return compactMarkup(serialize(svg));
};

/** 设置图标内容占比：100 为原始大小，数值越小图形越小、留白越多 */
export const setSvgScale = (source: string, percent: number): string => {
    const svg = parseSvg(source);
    if (!svg) {
        throw new Error("SVG 解析失败，请检查源码");
    }
    const viewBox = readViewBox(svg);
    const ratio = 100 / Math.min(100, Math.max(10, percent));
    const width = viewBox.width * ratio;
    const height = viewBox.height * ratio;
    const x = viewBox.x - (width - viewBox.width) / 2;
    const y = viewBox.y - (height - viewBox.height) / 2;
    svg.setAttribute("viewBox", `${roundNumber(x, 3)} ${roundNumber(y, 3)} ${roundNumber(width, 3)} ${roundNumber(height, 3)}`);
    svg.removeAttribute("width");
    svg.removeAttribute("height");
    return compactMarkup(serialize(svg));
};

/** 识别 SVG 的绘制方式：是否有填充图形（闭合路径等）、是否有描边 */
export const detectSvgPaint = (source: string): { filled: boolean; stroked: boolean; closed: boolean } => {
    const svg = parseSvg(source);
    if (!svg) {
        return { filled: false, stroked: false, closed: false };
    }
    const isNone = (value: string | null): boolean => typeof value === "string" && value.trim().toLowerCase() === "none";
    const rootFillNone = isNone(svg.getAttribute("fill"));
    const rootStroke = svg.getAttribute("stroke");
    const nodes = Array.from(svg.querySelectorAll("path,rect,circle,ellipse,polygon,polyline,line,text,use"));
    let filled = false;
    let stroked = false;
    let closed = false;
    nodes.forEach((node) => {
        const element = node as SVGElement;
        const fillRaw = element.getAttribute("fill");
        // fill 未显式设置时继承根节点，根节点也未设置则为默认黑色填充
        if (!(fillRaw === null ? rootFillNone : isNone(fillRaw))) {
            filled = true;
        }
        const strokeRaw = element.getAttribute("stroke") ?? rootStroke;
        if (strokeRaw && !isNone(strokeRaw)) {
            stroked = true;
        }
        if (/[zZ]/.test(element.getAttribute("d") || "")) {
            closed = true;
        }
    });
    return { filled, stroked, closed };
};

/** 设置填充颜色：仅改有填充的图形（fill="none" 的线性元素保持透明） */
export const setSvgFillColor = (source: string, color: string): string => {
    const svg = parseSvg(source);
    if (!svg) {
        throw new Error("SVG 解析失败，请检查源码");
    }
    const target = color || "currentColor";
    const isNone = (value: string | null): boolean => typeof value === "string" && value.trim().toLowerCase() === "none";
    const rootFillNone = isNone(svg.getAttribute("fill"));
    svg.querySelectorAll("path,rect,circle,ellipse,polygon,polyline,text,use").forEach((node) => {
        const element = node as SVGElement;
        const fillRaw = element.getAttribute("fill");
        if (fillRaw === null) {
            if (!rootFillNone) {
                element.setAttribute("fill", target);
            }
            return;
        }
        if (!isNone(fillRaw)) {
            element.setAttribute("fill", target);
        }
    });
    return compactMarkup(serialize(svg));
};

/** 设置渲染尺寸（保留 viewBox，仅补 width/height 属性） */
export const applyIconSize = (source: string, size: number): string => {
    const svg = parseSvg(source);
    if (!svg) {
        return source;
    }
    svg.setAttribute("width", String(size));
    svg.setAttribute("height", String(size));
    return serialize(svg);
};

/** SVG 转 data URI */
export const svgToDataUri = (source: string): string => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;

/** SVG 转 base64（UTF-8 安全） */
export const svgToBase64 = (source: string): string => {
    const bytes = new TextEncoder().encode(source);
    let binary = "";
    bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
    });
    return btoa(binary);
};

/** 图标名转 PascalCase */
export const pascalCase = (name: string): string =>
    name
        .split(/[^a-zA-Z0-9]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join("");

/** 规范图标类名：小写 kebab-case */
export const sanitizeIconName = (name: string): string => {
    const normalized = name
        .trim()
        .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase();
    return normalized || "icon";
};

/** 同项目内生成唯一的图标类名 */
export const uniqueIconName = (name: string, exists: Iterable<string>): string => {
    const used = new Set(exists);
    const base = sanitizeIconName(name);
    if (!used.has(base)) {
        return base;
    }
    let index = 2;
    while (used.has(`${base}-${index}`)) {
        index += 1;
    }
    return `${base}-${index}`;
};

/** 用代码模板渲染图标代码（支持 {name} 与 %icon_name% 两套占位符，取图标的 className） */
export const renderIconCode = (
    template: string,
    icon: Pick<IconItem, "className" | "svg">,
    size: number,
    color = "currentColor",
): string => {
    const svg = applyIconSize(icon.svg, size);
    const base64 = svgToBase64(svg);
    // 先替换带收尾符号的写法，避免 %icon_name% 被 %icon_name 抢先替换后残留 %
    return template
        .replaceAll("{name}", icon.className)
        .replaceAll("%icon_name%", icon.className)
        .replaceAll("%icon-name%", icon.className)
        .replaceAll("%name%", icon.className)
        .replaceAll("%icon_name", icon.className)
        .replaceAll("%icon-name", icon.className)
        .replaceAll("%name", icon.className)
        .replaceAll("{Name}", pascalCase(icon.className))
        .replaceAll("%IconName%", pascalCase(icon.className))
        .replaceAll("%IconName", pascalCase(icon.className))
        .replaceAll("{size}", String(size))
        .replaceAll("%size%", String(size))
        .replaceAll("%size", String(size))
        .replaceAll("{color}", color)
        .replaceAll("%color%", color)
        .replaceAll("%color", color)
        .replaceAll("{svgBase64}", base64)
        .replaceAll("%svgBase64%", base64)
        .replaceAll("%svgBase64", base64)
        .replaceAll("{svg}", svg)
        .replaceAll("%svg%", svg)
        .replaceAll("%svg", svg);
};

/** 从文件名推断图标类名 */
export const nameFromFileName = (fileName: string): string => sanitizeIconName(fileName.replace(/\.[^.]+$/, ""));
