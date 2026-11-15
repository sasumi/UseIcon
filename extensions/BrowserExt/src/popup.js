const DEFAULT_SITE_URL = "http://localhost:5190/";

const siteInput = document.getElementById("siteUrl");
const status = document.getElementById("status");

const normalizeSiteUrl = (value) => {
    try {
        const url = new URL(String(value || ""));
        return `${url.origin}/`;
    } catch {
        return "";
    }
};

chrome.storage.sync.get({ siteUrl: DEFAULT_SITE_URL }, (config) => {
    siteInput.value = normalizeSiteUrl(config.siteUrl) || DEFAULT_SITE_URL;
});

document.getElementById("save").addEventListener("click", () => {
    const url = normalizeSiteUrl(siteInput.value);
    if (!url) {
        status.textContent = "地址无效，请填完整 URL";
        status.style.color = "#f14c4c";
        return;
    }
    chrome.storage.sync.set({ siteUrl: url }, () => {
        siteInput.value = url;
        status.textContent = "已保存，刷新页面后生效";
        status.style.color = "#3fb950";
    });
});

document.getElementById("panel").addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs && tabs[0];
        if (!tab || !tab.id) {
            status.textContent = "没有可用的标签页";
            status.style.color = "#f14c4c";
            return;
        }
        chrome.runtime.sendMessage({ type: "openPanel", tabId: tab.id }, (result) => {
            if (!result || !result.ok) {
                status.textContent = `打开失败：${(result && result.error) || "请刷新页面后重试"}`;
                status.style.color = "#f14c4c";
                return;
            }
            window.close();
        });
    });
});

document.getElementById("openSite").addEventListener("click", () => {
    chrome.storage.sync.get({ siteUrl: DEFAULT_SITE_URL }, (config) => {
        chrome.runtime.sendMessage({ type: "openUrl", url: normalizeSiteUrl(config.siteUrl) || DEFAULT_SITE_URL });
        window.close();
    });
});
