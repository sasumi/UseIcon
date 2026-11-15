/**
 * UseIcon BrowserExt 后台脚本（MV3 Service Worker）
 * 职责：
 * 1. 响应 popup 的「打开采集面板」：转发给内容脚本，必要时动态注入
 * 2. 代理跨域图片下载：内容脚本受页面 CORS 限制，改由扩展后台抓取并转成 dataURL
 */

const DEFAULT_SITE_URL = "http://localhost:5190/";

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.get({ siteUrl: DEFAULT_SITE_URL }, (config) => {
        if (!config.siteUrl) {
            chrome.storage.sync.set({ siteUrl: DEFAULT_SITE_URL });
        }
    });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || !message.type) {
        return false;
    }

    if (message.type === "openPanel") {
        const tabId = message.tabId;
        if (!tabId) {
            sendResponse({ ok: false, error: "没有可用的标签页" });
            return false;
        }
        chrome.tabs.sendMessage(tabId, { type: "toggle-panel" }, (result) => {
            if (chrome.runtime.lastError) {
                // 页面在扩展安装前就已打开，动态注入后再打开面板
                chrome.scripting.executeScript({ target: { tabId }, files: ["src/content.js"] }, () => {
                    if (chrome.runtime.lastError) {
                        sendResponse({ ok: false, error: chrome.runtime.lastError.message });
                        return;
                    }
                    chrome.tabs.sendMessage(tabId, { type: "toggle-panel" }, () => {
                        sendResponse({ ok: true });
                    });
                });
                return;
            }
            sendResponse({ ok: !!result });
        });
        return true;
    }

    if (message.type === "fetchImage") {
        fetchImageAsDataUrl(message.url)
            .then((dataUrl) => sendResponse({ ok: true, dataUrl }))
            .catch((error) => sendResponse({ ok: false, error: String(error && error.message ? error.message : error) }));
        return true;
    }

    if (message.type === "openUrl") {
        chrome.tabs.create({ url: message.url });
        sendResponse({ ok: true });
        return false;
    }

    return false;
});

/**
 * 下载图片并转为 dataURL
 * @param {string} url 图片地址
 * @returns {Promise<string>}
 */
async function fetchImageAsDataUrl(url) {
    const response = await fetch(url, { credentials: "omit" });
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    const blob = await response.blob();
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    const chunkSize = 0x8000;
    for (let index = 0; index < bytes.length; index += chunkSize) {
        binary += String.fromCharCode.apply(null, bytes.subarray(index, index + chunkSize));
    }
    const base64 = btoa(binary);
    return `data:${blob.type || "image/png"};base64,${base64}`;
}
