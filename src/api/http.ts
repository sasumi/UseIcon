import { TOKEN_STORAGE_KEY } from "@/config";

/** 公共 API（用户 / 鉴权 / 账户 / 附件），由 ttapi 提供 */
const DEFAULT_PUBLIC_API_HOST = "https://api.tthaoke.com/";

/** 公共 API 主机（可在 .env 中用 VITE_PUBLIC_API_HOST 覆盖） */
export const PUBLIC_API_HOST = String(import.meta.env.VITE_PUBLIC_API_HOST || DEFAULT_PUBLIC_API_HOST).replace(/\/+$/, "/");

/** 请求超时（毫秒） */
const REQUEST_TIMEOUT = 20_000;

/** 接口错误：带上后端的 code 与 data（如需要登录、需要验证码） */
export class ApiError extends Error {
    code: number | string; // 后端错误码
    data: unknown; // 后端附加数据

    constructor(message: string, code: number | string = "error", data: unknown = null) {
        super(message);
        this.name = "ApiError";
        this.code = code;
        this.data = data;
    }
}

/** 读取登录令牌 */
export const getToken = (): string | null => {
    try {
        return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
        return null;
    }
};

/** 写入登录令牌 */
export const setToken = (token: string | null): void => {
    try {
        if (token) {
            localStorage.setItem(TOKEN_STORAGE_KEY, token);
        } else {
            localStorage.removeItem(TOKEN_STORAGE_KEY);
        }
    } catch {
        // 忽略 storage 异常
    }
};

/** 构造接口地址：<host><uri> */
export const getApiUrl = (uri: string, params?: Record<string, string | number | null | undefined>): string => {
    let url = PUBLIC_API_HOST + uri;
    const entries = Object.entries(params || {}).filter(([, value]) => value !== null && value !== undefined);
    if (entries.length > 0) {
        url += `?${new URLSearchParams(entries.map(([key, value]) => [key, String(value)])).toString()}`;
    }
    return url;
};

/**
 * 统一 JSON 请求：后端返回 { code, message, data }，code === 0 为成功
 */
export const apiRequestJSON = async ({
    uri,
    data = null,
    method = "GET",
}: {
    uri: string; // 接口路径，如 auth/updateLoginUser
    data?: Record<string, unknown> | null; // 请求数据
    method?: "GET" | "POST";
}): Promise<any> => {
    const hasFile = Object.values(data || {}).some((value) => value instanceof File);
    const upperMethod = hasFile ? "POST" : method.toUpperCase();
    const query = upperMethod === "GET" && data ? (data as Record<string, string | number | null | undefined>) : undefined;
    const url = getApiUrl(uri, query);

    const headers: Record<string, string> = { Accept: "application/json" };
    let body: BodyInit | null = null;
    if (hasFile) {
        const formData = new FormData();
        Object.entries(data || {}).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                formData.append(key, value instanceof Blob ? value : String(value));
            }
        });
        body = formData;
    } else if (upperMethod === "POST") {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(data || {});
    }
    const token = getToken();
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    let response: Response;
    try {
        response = await fetch(url, { method: upperMethod, headers, body, credentials: "include", signal: controller.signal });
    } catch (error) {
        throw new ApiError(
            error instanceof DOMException && error.name === "AbortError" ? "请求超时，请检查网络后重试" : "网络请求失败，请检查网络或跨域配置",
            "network",
        );
    } finally {
        clearTimeout(timer);
    }

    let result: { code?: number; message?: string; data?: unknown } | null = null;
    try {
        result = await response.json();
    } catch {
        throw new ApiError(`接口返回异常（HTTP ${response.status}）`, response.status);
    }
    if (!result || result.code !== 0) {
        throw new ApiError(result?.message || `请求失败（HTTP ${response.status}）`, result?.code ?? response.status, result?.data ?? null);
    }
    return result.data;
};

/** GET 请求 */
export const apiGetJSON = (uri: string, data: Record<string, string | number | null | undefined> | null = null) =>
    apiRequestJSON({ uri, data, method: "GET" });

/** POST 请求 */
export const apiPostJSON = (uri: string, data: Record<string, unknown> | null = null) =>
    apiRequestJSON({ uri, data, method: "POST" });
