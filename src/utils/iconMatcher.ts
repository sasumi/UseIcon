import { parseSvg, setSvgColor } from "./svg";

/** 采样边长（16×16，每行 15 个横向差分） */
const SAMPLE_SIZE = 16;

/** 采样后的平滑半径：压掉线条粗细 / 抗锯齿带来的像素差异 */
const BLUR_RADIUS = 1;

/** 指纹位数（16 行 × 15 个横向差分） */
const PHASH_BITS = SAMPLE_SIZE * (SAMPLE_SIZE - 1);

/** 指纹的十六进制长度（240 位） */
export const ICON_PHASH_LENGTH = PHASH_BITS / 4;

/** 判定为相似图标的汉明距离阈值（240 位） */
export const ICON_PHASH_THRESHOLD = 24;

/** 指纹缓存上限 */
const PHASH_CACHE_LIMIT = 2000;

/** 批量计算时的并发数（栅格化是异步解码，过高会拖慢主线程） */
const PHASH_CONCURRENCY = 4;

/** 指纹缓存：SVG 源码 → 指纹，避免重复栅格化 */
const phashCache = new Map<string, string>();

let sharedCanvas: HTMLCanvasElement | null = null;

/** 复用的离屏画布 */
const getCanvas = (): HTMLCanvasElement => {
    if (!sharedCanvas) {
        sharedCanvas = document.createElement("canvas");
        sharedCanvas.width = SAMPLE_SIZE;
        sharedCanvas.height = SAMPLE_SIZE;
    }
    return sharedCanvas;
};

/** SVG → 灰度采样矩阵（白底黑图，颜色统一成黑色，只保留形状） */
const renderGray = async (svg: string): Promise<Float64Array> => {
    const root = parseSvg(setSvgColor(svg, "#000"));
    if (!root) {
        throw new Error("SVG 解析失败");
    }
    // 固定宽高，保证同一图标在不同环境下栅格化结果一致
    root.setAttribute("width", String(SAMPLE_SIZE));
    root.setAttribute("height", String(SAMPLE_SIZE));
    const source = new XMLSerializer().serializeToString(root);
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = () => reject(new Error("SVG 栅格化失败"));
        element.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
    });
    const context = getCanvas().getContext("2d", { willReadFrequently: true });
    if (!context) {
        throw new Error("当前浏览器不支持 Canvas");
    }
    context.clearRect(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
    context.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
    const { data } = context.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
    const gray = new Float64Array(SAMPLE_SIZE * SAMPLE_SIZE);
    for (let index = 0; index < gray.length; index++) {
        const offset = index * 4;
        // 反相为墨量：图形越密值越大，与配色方案无关
        gray[index] = 1 - (data[offset] * 0.299 + data[offset + 1] * 0.587 + data[offset + 2] * 0.114) / 255;
    }
    return gray;
};

/** 盒式模糊（边缘按可用邻域平均） */
const blurGray = (gray: Float64Array, radius = BLUR_RADIUS): Float64Array => {
    const result = new Float64Array(gray.length);
    for (let y = 0; y < SAMPLE_SIZE; y++) {
        for (let x = 0; x < SAMPLE_SIZE; x++) {
            let sum = 0;
            let count = 0;
            for (let dy = -radius; dy <= radius; dy++) {
                const row = y + dy;
                if (row < 0 || row >= SAMPLE_SIZE) {
                    continue;
                }
                for (let dx = -radius; dx <= radius; dx++) {
                    const column = x + dx;
                    if (column < 0 || column >= SAMPLE_SIZE) {
                        continue;
                    }
                    sum += gray[row * SAMPLE_SIZE + column];
                    count++;
                }
            }
            result[y * SAMPLE_SIZE + x] = sum / count;
        }
    }
    return result;
};

/** 灰度矩阵 → 差分指纹：比较同一行相邻像素的墨量 */
const grayToHash = (gray: Float64Array): string => {
    let hash = "";
    let nibble = 0;
    let count = 0;
    for (let y = 0; y < SAMPLE_SIZE; y++) {
        for (let x = 0; x < SAMPLE_SIZE - 1; x++) {
            if (gray[y * SAMPLE_SIZE + x] > gray[y * SAMPLE_SIZE + x + 1]) {
                nibble |= 1 << (3 - count);
            }
            count += 1;
            if (count === 4) {
                hash += nibble.toString(16);
                nibble = 0;
                count = 0;
            }
        }
    }
    return hash;
};

/** 顺时针旋转 90° */
const rotateGray = (gray: Float64Array): Float64Array => {
    const result = new Float64Array(gray.length);
    for (let y = 0; y < SAMPLE_SIZE; y++) {
        for (let x = 0; x < SAMPLE_SIZE; x++) {
            result[y * SAMPLE_SIZE + x] = gray[(SAMPLE_SIZE - 1 - x) * SAMPLE_SIZE + y];
        }
    }
    return result;
};

/** 水平镜像 */
const mirrorGray = (gray: Float64Array): Float64Array => {
    const result = new Float64Array(gray.length);
    for (let y = 0; y < SAMPLE_SIZE; y++) {
        for (let x = 0; x < SAMPLE_SIZE; x++) {
            result[y * SAMPLE_SIZE + x] = gray[y * SAMPLE_SIZE + (SAMPLE_SIZE - 1 - x)];
        }
    }
    return result;
};

/** 取 4 个旋转 × 2 个镜像里最小的指纹，使上下 / 左右 / 镜像的同类图标也能匹配 */
const canonicalHash = (gray: Float64Array): string => {
    let best = "";
    let current = gray;
    for (let turn = 0; turn < 4; turn++) {
        [current, mirrorGray(current)].forEach((variant) => {
            const hash = grayToHash(variant);
            if (!best || hash < best) {
                best = hash;
            }
        });
        current = rotateGray(current);
    }
    return best;
};

/**
 * 计算图标的感知哈希（240 位差分哈希，旋转 / 镜像不变的 60 位十六进制串）
 * @param svg 图标 SVG 源码
 * @returns 指纹；无法计算（非浏览器环境 / 解析失败）时返回空串
 */
export const computeIconPhash = async (svg: string): Promise<string> => {
    const source = (svg || "").trim();
    if (!source || typeof document === "undefined") {
        return "";
    }
    const cached = phashCache.get(source);
    if (cached !== undefined) {
        return cached;
    }
    try {
        const hash = canonicalHash(blurGray(await renderGray(source)));
        if (phashCache.size >= PHASH_CACHE_LIMIT) {
            phashCache.clear();
        }
        phashCache.set(source, hash);
        return hash;
    } catch (error) {
        console.warn("图标感知哈希计算失败", error);
        return "";
    }
};

/**
 * 批量计算图标指纹（顺序与入参一致，失败项为空串）
 * @param svgs SVG 源码列表
 */
export const computeIconPhashes = async (svgs: string[]): Promise<string[]> => {
    const result = new Array<string>(svgs.length).fill("");
    let cursor = 0;
    const worker = async () => {
        while (cursor < svgs.length) {
            const index = cursor;
            cursor += 1;
            result[index] = await computeIconPhash(svgs[index]);
        }
    };
    await Promise.all(Array.from({ length: Math.min(PHASH_CONCURRENCY, svgs.length) }, worker));
    return result;
};

/**
 * 两个指纹的汉明距离（0-240，越小越相似）
 * @param left 指纹 A
 * @param right 指纹 B
 */
export const phashDistance = (left: string, right: string): number => {
    if (!left || !right || left.length !== right.length) {
        return Number.MAX_SAFE_INTEGER;
    }
    let diff = BigInt(`0x${left}`) ^ BigInt(`0x${right}`);
    let distance = 0;
    while (diff > 0n) {
        distance += Number(diff & 1n);
        diff >>= 1n;
    }
    return distance;
};

/** 两个指纹是否相似（汉明距离不超过阈值） */
export const isSimilarPhash = (left: string, right: string, threshold = ICON_PHASH_THRESHOLD): boolean =>
    phashDistance(left, right) <= threshold;

/**
 * 在候选图标中查找与目标指纹相似的图标
 * @param phash 目标指纹
 * @param icons 候选图标（需带 phash）
 * @param threshold 汉明距离阈值
 */
export const matchSimilarIcons = <T extends { phash?: string }>(
    phash: string,
    icons: T[],
    threshold = ICON_PHASH_THRESHOLD,
): T[] => (phash ? icons.filter((icon) => phashDistance(phash, icon.phash ?? "") <= threshold) : []);

/**
 * 智能排序：按指纹把外形相近的图标聚成一组，组内按与组首指纹的距离（再按名称）排序；
 * 没有指纹的图标保持原顺序排在最后
 * @param icons 待排序图标
 * @param hashOf 取图标指纹
 * @param threshold 归为同组的汉明距离阈值
 */
export const sortIconsBySimilarity = <T extends { className: string }>(
    icons: T[],
    hashOf: (icon: T) => string,
    threshold = ICON_PHASH_THRESHOLD,
): T[] => {
    const groups: { anchor: string; items: { icon: T; distance: number }[] }[] = [];
    const unhashed: T[] = [];
    icons.forEach((icon) => {
        const hash = hashOf(icon);
        if (!hash) {
            unhashed.push(icon);
            return;
        }
        let group = groups.find((item) => phashDistance(item.anchor, hash) <= threshold);
        if (!group) {
            group = { anchor: hash, items: [] };
            groups.push(group);
        }
        group.items.push({ icon, distance: phashDistance(group.anchor, hash) });
    });
    const sorted: T[] = [];
    groups.forEach((group) => {
        group.items
            .sort((a, b) => a.distance - b.distance || a.icon.className.localeCompare(b.icon.className, "zh"))
            .forEach((item) => sorted.push(item.icon));
    });
    return [...sorted, ...unhashed];
};
