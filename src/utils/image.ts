import { IMAGE_RASTER_MAX_SIZE } from "@/config";
import { normalizeSvg } from "./svg";

/** 读取文件为文本 */
export const readTextFile = (file: File): Promise<string> => file.text();

/** 读取文件为 DataURL */
export const readDataUrl = (file: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("文件读取失败"));
        reader.readAsDataURL(file);
    });

/** 读取图片尺寸 */
export const readImageSize = (src: string): Promise<{ width: number; height: number }> =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
        image.onerror = () => reject(new Error("图片解码失败"));
        image.src = src;
    });

/** 将位图按最大边长压缩为 PNG DataURL */
const rasterToPngDataUrl = async (src: string, maxSize = IMAGE_RASTER_MAX_SIZE): Promise<{ dataUrl: string; width: number; height: number }> => {
    const source = await readImageSize(src);
    const scale = Math.min(1, maxSize / Math.max(source.width, source.height));
    const width = Math.max(1, Math.round(source.width * scale));
    const height = Math.max(1, Math.round(source.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
        throw new Error("当前浏览器不支持 Canvas");
    }
    await new Promise<void>((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
            context.drawImage(image, 0, 0, width, height);
            resolve();
        };
        image.onerror = () => reject(new Error("图片解码失败"));
        image.src = src;
    });
    return { dataUrl: canvas.toDataURL("image/png"), width, height };
};

/** 位图（png/jpg/webp）转 SVG：以 image 节点内嵌 PNG 数据 */
export const imageFileToSvg = async (file: File): Promise<string> => {
    const raw = await readDataUrl(file);
    const { dataUrl, width, height } = await rasterToPngDataUrl(raw);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><image width="${width}" height="${height}" href="${dataUrl}"/></svg>`;
    return normalizeSvg(svg);
};

/** 图片 URL 转 SVG */
export const imageUrlToSvg = async (url: string): Promise<string> => {
    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) {
        throw new Error(`图片下载失败（${response.status}）`);
    }
    const blob = await response.blob();
    const raw = await readDataUrl(blob);
    const { dataUrl, width, height } = await rasterToPngDataUrl(raw);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><image width="${width}" height="${height}" href="${dataUrl}"/></svg>`;
    return normalizeSvg(svg);
};

/**
 * SVG 转 PNG Blob（浏览器端栅格化）
 * @param svg SVG 源码
 * @param size 输出尺寸（正方形）
 * @param color 将 currentColor 替换成的颜色
 */
export const svgToPngBlob = (svg: string, size: number, color = "#000000"): Promise<Blob> =>
    new Promise((resolve, reject) => {
        const source = svg.replaceAll("currentColor", color);
        const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
        const image = new Image();
        image.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = size;
            canvas.height = size;
            const context = canvas.getContext("2d");
            if (!context) {
                reject(new Error("当前浏览器不支持 Canvas"));
                return;
            }
            context.clearRect(0, 0, size, size);
            context.drawImage(image, 0, 0, size, size);
            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error("PNG 导出失败"));
                }
            }, "image/png");
        };
        image.onerror = () => reject(new Error("SVG 栅格化失败"));
        image.src = url;
    });
