import { MOCK_DELAY } from "@/config";
import { ApiError } from "./http";

export { ApiError } from "./http";

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * 模拟一次接口调用：延迟 + 执行 + 统一错误包装。
 * 后期切换到 PHP 后台时，只需把各 api 模块内部替换为 fetch 调用，函数签名保持不变。
 */
export const mockResponse = async <T>(producer: () => T | Promise<T>, ms = MOCK_DELAY): Promise<T> => {
    await delay(ms);
    return producer();
};

/** 生成随机 ID */
export const createId = (prefix: string): string => {
    const random = Math.random().toString(36).slice(2, 8);
    return `${prefix}-${Date.now().toString(36)}${random}`;
};

/** 邮箱归一化 */
export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

/** 深拷贝（防止外部直接修改仓储中的对象） */
export const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;


/** 断言，不满足时抛出 ApiError */
export const assert = (condition: unknown, message: string, code = "invalid"): void => {
    if (!condition) {
        throw new ApiError(message, code);
    }
};
