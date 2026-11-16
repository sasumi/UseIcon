import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 延时自动关闭的气泡提示（用于按钮旁的轻量反馈）
 * @param delay 自动关闭时间（毫秒）
 * @returns tip 当前提示文案（无提示时为 null），show 触发提示
 */
export const useTimedTip = (delay = 1800) => {
    const [tip, setTip] = useState<string | null>(null);
    const timerRef = useRef<number | null>(null);

    const clear = useCallback(() => {
        if (timerRef.current !== null) {
            window.clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const show = useCallback(
        (text: string) => {
            clear();
            setTip(text);
            timerRef.current = window.setTimeout(() => {
                setTip(null);
                timerRef.current = null;
            }, delay);
        },
        [clear, delay],
    );

    useEffect(() => clear, [clear]);

    return { tip, show };
};
