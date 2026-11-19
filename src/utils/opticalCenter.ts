import { applyTransformToSvg, getOpticalCenter, transformViewBox } from "optical-center";
import { parseSvg } from "@/utils/svg";

/** 光栅化尺寸：64px 已足够判断视觉重心 */
const RASTER_SIZE = 64;

/** 偏移小于该值（光栅像素）时视为已居中，跳过改动 */
const MIN_OFFSET = 0.5;

/** 判断“最外层形状”时的边界容差（渲染像素） */
const OUTER_SHAPE_TOLERANCE = 1.5;

const SHAPE_SELECTOR = "path,rect,circle,ellipse,polygon,polyline,line";
const ROUND_SELECTOR = "rect,circle,ellipse";
const IGNORED_SHAPE_ANCESTOR = "defs,clipPath,mask,symbol,marker";

/** 给根 svg 补上固定宽高，保证按正方形光栅化 */
const withRasterSize = (source: string, size: number): string =>
    source.replace(/<svg\b[^>]*>/i, (tag) =>
        tag.replace(/\s(?:width|height)\s*=\s*("[^"]*"|'[^']*')/gi, "").replace(/^<svg\b/i, `<svg width="${size}" height="${size}"`),
    );

/** 浏览器端光栅化 SVG（离屏图片 + canvas） */
const rasterizeSvg = (source: string, size: number): Promise<ImageData> =>
    new Promise((resolve, reject) => {
        const url = URL.createObjectURL(new Blob([source], { type: "image/svg+xml;charset=utf-8" }));
        const image = new Image();
        image.decoding = "async";
        image.onload = () => {
            try {
                const canvas = document.createElement("canvas");
                canvas.width = size;
                canvas.height = size;
                const context = canvas.getContext("2d", { willReadFrequently: true });
                if (!context) {
                    throw new Error("无法创建画布");
                }
                context.clearRect(0, 0, size, size);
                context.drawImage(image, 0, 0, size, size);
                resolve(context.getImageData(0, 0, size, size));
            } catch (error) {
                reject(error instanceof Error ? error : new Error("SVG 光栅化失败"));
            } finally {
                URL.revokeObjectURL(url);
            }
        };
        image.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("SVG 光栅化失败"));
        };
        image.src = url;
    });

/**
 * 检测矩形 / 圆形是否作为最外层形状包住其它图形：
 * 这类外框图标几何居中即可，做视觉居中反而会偏移，直接跳过
 */
const hasOutermostRoundShape = (source: string): boolean => {
    if (!/<(rect|circle|ellipse)\b/i.test(source)) {
        return false;
    }
    const svg = parseSvg(source);
    if (!svg) {
        return false;
    }
    const host = document.createElement("div");
    host.style.cssText = "position:fixed;left:-99999px;top:0;width:1px;height:1px;overflow:hidden;pointer-events:none;";
    document.body.appendChild(host);
    host.appendChild(svg);
    try {
        const shapes = (Array.from(svg.querySelectorAll(SHAPE_SELECTOR)) as SVGGraphicsElement[]).filter(
            (element) => !element.closest(IGNORED_SHAPE_ANCESTOR),
        );
        const boxes = shapes.map((element) => element.getBoundingClientRect()).filter((box) => box.width > 0 && box.height > 0);
        if (boxes.length === 0) {
            return false;
        }
        const union = boxes.reduce(
            (acc, box) => ({
                left: Math.min(acc.left, box.left),
                top: Math.min(acc.top, box.top),
                right: Math.max(acc.right, box.right),
                bottom: Math.max(acc.bottom, box.bottom),
            }),
            { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity },
        );
        const candidates = Array.from(svg.querySelectorAll(ROUND_SELECTOR)) as SVGGraphicsElement[];
        return candidates.some((element) => {
            if (element.closest(IGNORED_SHAPE_ANCESTOR)) {
                return false;
            }
            const box = element.getBoundingClientRect();
            if (box.width <= 0 || box.height <= 0) {
                return false;
            }
            return (
                box.left <= union.left + OUTER_SHAPE_TOLERANCE &&
                box.top <= union.top + OUTER_SHAPE_TOLERANCE &&
                box.right >= union.right - OUTER_SHAPE_TOLERANCE &&
                box.bottom >= union.bottom - OUTER_SHAPE_TOLERANCE
            );
        });
    } finally {
        host.remove();
    }
};

/**
 * 光学居中：需在其它优化项处理完之后调用，通过平移 viewBox 让图形视觉重心居中
 */
export const centerSvgOptically = async (source: string): Promise<string> => {
    try {
        // 矩形 / 圆形外框类图标保持几何居中，不做视觉居中
        if (hasOutermostRoundShape(source)) {
            return source;
        }
        const raster = await rasterizeSvg(withRasterSize(source, RASTER_SIZE), RASTER_SIZE);
        const { dx, dy } = getOpticalCenter(raster);
        if (!Number.isFinite(dx) || !Number.isFinite(dy) || (Math.abs(dx) < MIN_OFFSET && Math.abs(dy) < MIN_OFFSET)) {
            return source;
        }
        const offset = {
            dxPercent: (dx / raster.width) * 100,
            dyPercent: (dy / raster.height) * 100,
        };
        const { viewBox, breadcrumb } = transformViewBox(source, raster, offset);
        return applyTransformToSvg(source, { viewBox, breadcrumb });
    } catch (error) {
        console.warn("视觉中心优化失败，保留原图", error);
        return source;
    }
};
