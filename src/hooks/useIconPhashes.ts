import { useEffect, useMemo, useRef, useState } from "react";
import { computeIconPhashes } from "@/utils/iconMatcher";

interface PhashSource {
    svg: string; // 图标 SVG 源码
    phash?: string; // 已入库的感知哈希
}

/**
 * 为缺少 phash 的图标现算指纹（仅在启用智能排序时执行），返回 svg → phash
 * @param icons 当前列表图标
 * @param enabled 是否启用计算
 */
export const useIconPhashes = (icons: PhashSource[], enabled: boolean): Map<string, string> => {
    const resolved = useRef(new Map<string, string>());
    const [version, setVersion] = useState(0);

    useEffect(() => {
        if (!enabled) {
            return;
        }
        const missing = icons.filter((icon) => icon.svg && !icon.phash && !resolved.current.has(icon.svg));
        if (missing.length === 0) {
            return;
        }
        let cancelled = false;
        void computeIconPhashes(missing.map((icon) => icon.svg)).then((hashes) => {
            if (cancelled) {
                return;
            }
            missing.forEach((icon, index) => {
                resolved.current.set(icon.svg, hashes[index] || "");
            });
            setVersion((value) => value + 1);
        });
        return () => {
            cancelled = true;
        };
    }, [icons, enabled]);

    return useMemo(() => new Map(Array.from(resolved.current.entries()).filter(([, hash]) => hash)), [version]);
};
