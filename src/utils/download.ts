import type { IconItem } from "@/types";
import { svgToPngBlob } from "./image";
import { applyIconSize } from "./svg";

/** 触发浏览器下载 */
export const downloadBlob = (blob: Blob, fileName: string): void => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
};

/** 下载文本 */
export const downloadText = (text: string, fileName: string, mime = "text/plain;charset=utf-8"): void => {
    downloadBlob(new Blob([text], { type: mime }), fileName);
};

/** 单个 SVG 下载 */
export const downloadSvg = (icon: Pick<IconItem, "className" | "svg">, size?: number): void => {
    const svg = size ? applyIconSize(icon.svg, size) : icon.svg;
    downloadText(svg, `${icon.className}.svg`, "image/svg+xml;charset=utf-8");
};

/** 单个 PNG 下载 */
export const downloadPng = async (
    icon: Pick<IconItem, "className" | "svg">,
    size = 128,
    color = "#000000",
): Promise<void> => {
    const blob = await svgToPngBlob(icon.svg, size, color);
    downloadBlob(blob, `${icon.className}.png`);
};

/** 复制文本到剪贴板 */
export const copyText = async (text: string): Promise<void> => {
    if (navigator.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return;
        } catch {
            // 无权限 / 非安全上下文时回退到 execCommand
        }
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    if (!copied) {
        throw new Error("复制失败");
    }
};
