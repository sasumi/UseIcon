/**
 * UseIcon BrowserExt 内容脚本
 * 在任意页面注入右下角的「采集」按钮与悬浮面板：
 * - 抓取页面上的 SVG / 图片 / iconfont 字体图标
 * - 支持把页面上的 SVG、图片拖进面板
 * - 通过隐藏 iframe 加载 UseIcon 的 /#/ext-bridge 页面，复用站点登录态批量写入项目
 */
(() => {
    if (window.__USEICON_EXT_LOADED__) {
        window.dispatchEvent(new CustomEvent("useicon-ext-toggle"));
        return;
    }
    window.__USEICON_EXT_LOADED__ = true;

    const DEFAULT_SITE_URL = "http://localhost:5190/";
    const BRIDGE_HASH = "#/ext-bridge";

    const state = {
        siteUrl: DEFAULT_SITE_URL,
        open: false,
        frame: null,
        frameOrigin: "",
        bridgeState: "off", // off / connecting / ready
        user: null,
        projects: [],
        candidates: [],
        busy: false,
        host: null,
        shadow: null,
        toastTimer: null,
    };

    const normalizeSiteUrl = (value) => {
        try {
            const url = new URL(String(value || ""));
            return `${url.origin}/`;
        } catch {
            return DEFAULT_SITE_URL;
        }
    };

    const isUseIconSite = () => {
        try {
            return location.host === new URL(state.siteUrl).host;
        } catch {
            return false;
        }
    };

    const escapeHtml = (value) =>
        String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));

    const nameFromText = (value, fallback) => {
        const name = String(value || "")
            .replace(/\.[^.]+$/, "")
            .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
            .replace(/[^a-zA-Z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .toLowerCase();
        return name || fallback;
    };

    /** 清理抓取到的 SVG：移除 script / 事件属性 */
    const sanitizeSvg = (markup) => {
        if (!markup || typeof markup !== "string") {
            return null;
        }
        const text = markup.trim();
        if (!/<svg/i.test(text)) {
            return null;
        }
        try {
            const doc = new DOMParser().parseFromString(text, "image/svg+xml");
            if (doc.querySelector("parsererror")) {
                return null;
            }
            doc.querySelectorAll("script, foreignObject").forEach((node) => node.remove());
            doc.querySelectorAll("*").forEach((element) => {
                Array.from(element.attributes).forEach((attr) => {
                    if (/^on/i.test(attr.name)) {
                        element.removeAttribute(attr.name);
                    }
                });
            });
            const root = doc.documentElement;
            if (!root.getAttribute("xmlns")) {
                root.setAttribute("xmlns", "http://www.w3.org/2000/svg");
            }
            return new XMLSerializer().serializeToString(root);
        } catch {
            return null;
        }
    };

    const imageToSvg = (dataUrl, width, height) => {
        const w = Math.max(1, Math.round(width || 96));
        const h = Math.max(1, Math.round(height || 96));
        return sanitizeSvg(
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><image width="${w}" height="${h}" href="${dataUrl}"/></svg>`,
        );
    };

    const readFileAsDataUrl = (file) =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(new Error("文件读取失败"));
            reader.readAsDataURL(file);
        });

    const addCandidate = (candidate) => {
        const svg = sanitizeSvg(candidate.svg);
        if (!svg) {
            toast(`「${candidate.name}」不是有效的 SVG`, "warn");
            return;
        }
        if (state.candidates.some((item) => item.svg === svg)) {
            return;
        }
        state.candidates.push({
            id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: nameFromText(candidate.name, "icon"),
            svg,
            checked: true,
        });
        render();
    };

    // ---------- 桥接：隐藏 iframe 加载 UseIcon 站点 ----------
    const postToBridge = (payload) => {
        if (!state.frame || !state.frame.contentWindow) {
            return;
        }
        state.frame.contentWindow.postMessage({ source: "useicon-ext", ...payload }, state.frameOrigin);
    };

    const connectBridge = () => {
        if (isUseIconSite()) {
            return;
        }
        const origin = new URL(state.siteUrl).origin;
        if (state.frame && state.frameOrigin === origin) {
            postToBridge({ type: "ping" });
            return;
        }
        if (state.frame) {
            state.frame.remove();
            state.frame = null;
        }
        state.frameOrigin = origin;
        state.bridgeState = "connecting";
        render();
        const frame = document.createElement("iframe");
        frame.src = new URL(BRIDGE_HASH, state.siteUrl).href;
        frame.setAttribute("aria-hidden", "true");
        frame.style.cssText =
            "position:fixed;left:-20px;top:-20px;width:2px;height:2px;opacity:0;pointer-events:none;border:0;z-index:-1;";
        frame.addEventListener("load", () => postToBridge({ type: "ping" }));
        document.documentElement.appendChild(frame);
        state.frame = frame;
    };

    const handleBridgeMessage = (event) => {
        if (!state.frame || event.source !== state.frame.contentWindow) {
            return;
        }
        const data = event.data;
        if (!data || data.source !== "useicon-bridge") {
            return;
        }
        if (data.type === "ready") {
            state.bridgeState = "ready";
            state.user = data.user;
            state.projects = (data.projects || []).filter((project) => project.canEdit);
            render();
            return;
        }
        if (data.type === "uploaded") {
            state.busy = false;
            const names = new Set(data.names || []);
            state.candidates = state.candidates.filter((item) => !names.has(item.name));
            toast(`已加入项目 ${data.count} 个图标`, "ok");
            render();
            return;
        }
        if (data.type === "error") {
            state.busy = false;
            toast(data.message || "操作失败", "warn");
            render();
        }
    };

    window.addEventListener("message", handleBridgeMessage);

    // ---------- 抓取页面图标 ----------
    const guessName = (element, index) => {
        const attrs = ["data-icon", "aria-label", "title", "data-name", "data-testid", "alt"];
        for (const attr of attrs) {
            const value = element.getAttribute(attr);
            if (value && value.trim()) {
                return value.trim();
            }
        }
        const parentLabel = element.parentElement && element.parentElement.getAttribute("title");
        if (parentLabel) {
            return parentLabel;
        }
        return `icon-${index + 1}`;
    };

    const scanPage = () => {
        const found = [];
        Array.from(document.querySelectorAll("svg")).forEach((element, index) => {
            const rect = element.getBoundingClientRect();
            if (rect.width < 8 || rect.height < 8) {
                return;
            }
            const markup = element.outerHTML;
            if (markup.length > 300000) {
                return;
            }
            const svg = sanitizeSvg(markup);
            if (svg) {
                found.push({ name: guessName(element, index), svg });
            }
        });
        Array.from(document.querySelectorAll("img")).forEach((element, index) => {
            const rect = element.getBoundingClientRect();
            if (rect.width < 8 || rect.height < 8 || rect.width > 240 || rect.height > 240) {
                return;
            }
            const src = element.currentSrc || element.src;
            if (!src) {
                return;
            }
            if (src.startsWith("data:image/svg+xml")) {
                const svg = sanitizeSvg(decodeURIComponent(src.replace(/^data:image\/svg\+xml[^,]*,/, "")));
                if (svg) {
                    found.push({ name: guessName(element, index), svg });
                }
                return;
            }
            if (/^https?:/.test(src)) {
                found.push({ name: guessName(element, index), imageUrl: src, width: element.naturalWidth, height: element.naturalHeight });
            }
        });
        const fontIcons = Array.from(document.querySelectorAll('i.iconfont, span.iconfont, [class*="iconfont"]'))
            .filter((element) => element.className && /icon-/.test(element.className))
            .slice(0, 40)
            .map((element) => {
                const match = String(element.className).match(/icon-([a-zA-Z0-9_-]+)/);
                return { name: match ? match[1] : "font-icon", fontIcon: true };
            });

        if (found.length === 0 && fontIcons.length > 0) {
            toast("检测到 iconfont 字体图标：请点图标上的「复制 SVG」后用「从剪贴板导入」", "warn");
            return;
        }
        if (found.length === 0) {
            toast("本页没有找到可采集的 SVG 或图片", "warn");
            return;
        }
        let added = 0;
        found.forEach((item) => {
            if (item.svg) {
                addCandidate(item);
                added += 1;
            } else if (item.imageUrl) {
                importImageUrl(item.imageUrl, item.name, item.width, item.height);
                added += 1;
            }
        });
        toast(`抓取到 ${Math.max(added, fontIcons.length)} 个图标`, "ok");
    };

    const importImageUrl = (url, name, width, height) => {
        chrome.runtime.sendMessage({ type: "fetchImage", url }, (result) => {
            if (!result || !result.ok) {
                toast(`图片下载失败：${result && result.error ? result.error : "未知错误"}`, "warn");
                return;
            }
            const svg = imageToSvg(result.dataUrl, width, height);
            if (svg) {
                addCandidate({ name, svg });
            }
        });
    };

    const importClipboard = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (!text || !/<svg/i.test(text)) {
                toast("剪贴板里没有 SVG 代码", "warn");
                return;
            }
            addCandidate({ name: "clipboard-svg", svg: text });
            toast("已从剪贴板导入", "ok");
        } catch (error) {
            toast("读取剪贴板失败，请允许浏览器剪贴板权限后重试", "warn");
        }
    };

    const handleDrop = async (event) => {
        event.preventDefault();
        const transfer = event.dataTransfer;
        if (!transfer) {
            return;
        }
        const files = Array.from(transfer.files || []);
        for (const file of files) {
            if (file.type === "image/svg+xml" || /\.svg$/i.test(file.name)) {
                addCandidate({ name: file.name, svg: await file.text() });
            } else if (file.type.startsWith("image/")) {
                const dataUrl = await readFileAsDataUrl(file);
                const image = new Image();
                image.src = dataUrl;
                await new Promise((resolve) => {
                    image.onload = resolve;
                    image.onerror = resolve;
                });
                addCandidate({ name: file.name, svg: imageToSvg(dataUrl, image.naturalWidth, image.naturalHeight) });
            }
        }
        const html = transfer.getData("text/html");
        if (html) {
            const svgMatch = html.match(/<svg[\s\S]*?<\/svg>/i);
            if (svgMatch) {
                addCandidate({ name: "dragged-svg", svg: svgMatch[0] });
            } else {
                const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
                if (imgMatch) {
                    importImageUrl(imgMatch[1], "dragged-image");
                }
            }
        }
        const uri = transfer.getData("text/uri-list");
        if (uri && /^https?:/.test(uri)) {
            importImageUrl(uri, "dragged-image");
        }
        const text = transfer.getData("text/plain");
        if (text && /<svg/i.test(text)) {
            addCandidate({ name: "dragged-svg", svg: text });
        }
    };

    const uploadCandidates = () => {
        const projectId = state.shadow.querySelector(".ui-select").value;
        const selected = state.candidates.filter((item) => item.checked);
        if (!projectId) {
            toast("请选择一个有编辑权限的项目", "warn");
            return;
        }
        if (selected.length === 0) {
            toast("请先勾选要加入的图标", "warn");
            return;
        }
        state.busy = true;
        render();
        postToBridge({
            type: "upload",
            payload: {
                projectId,
                icons: selected.map((item) => ({ name: item.name, title: "", svg: item.svg, source: "upload", tags: ["browser-ext"] })),
            },
        });
    };

    const toast = (text, kind) => {
        if (!state.shadow) {
            return;
        }
        const element = state.shadow.querySelector(".toast");
        if (!element) {
            return;
        }
        element.textContent = text;
        element.dataset.kind = kind || "info";
        element.hidden = false;
        clearTimeout(state.toastTimer);
        state.toastTimer = setTimeout(() => {
            element.hidden = true;
        }, 3600);
    };

    // ---------- 面板渲染 ----------
    const panelStyle = `
        :host { all: initial; }
        * { box-sizing: border-box; font-family: ui-sans-serif, system-ui, "Segoe UI", sans-serif; }
        .fab {
            position: fixed; right: 18px; bottom: 18px; z-index: 2147483647;
            width: 44px; height: 44px; border-radius: 50%; border: 1px solid #3c3c3c;
            background: #007acc; color: #fff; font-size: 13px; font-weight: 700; cursor: pointer;
            box-shadow: 0 8px 20px rgb(0 0 0 / 35%); display: inline-flex; align-items: center; justify-content: center;
        }
        .fab:hover { filter: brightness(1.1); }
        .panel {
            position: fixed; right: 18px; bottom: 72px; z-index: 2147483647;
            width: 360px; max-width: calc(100vw - 24px); max-height: min(640px, calc(100vh - 96px));
            display: flex; flex-direction: column; overflow: hidden;
            border-radius: 10px; border: 1px solid #3c3c3c; background: #1e1e1e; color: #ccc;
            box-shadow: 0 16px 40px rgb(0 0 0 / 45%); font-size: 13px;
        }
        header { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: #323233; border-bottom: 1px solid #3c3c3c; }
        .logo { width: 22px; height: 22px; border-radius: 5px; background: #007acc; color: #fff; font-size: 10px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; }
        .title { display: flex; flex-direction: column; line-height: 1.3; flex: 1; min-width: 0; }
        .title strong { font-size: 12px; color: #fff; }
        .conn { font-size: 10px; color: #9d9d9d; }
        .conn[data-state="ready"] { color: #3fb950; }
        .conn[data-state="connecting"] { color: #cca700; }
        .icon-btn { width: 24px; height: 24px; border-radius: 4px; border: 1px solid transparent; background: transparent; color: #9d9d9d; cursor: pointer; font-size: 13px; line-height: 1; }
        .icon-btn:hover { background: #2a2d2e; color: #fff; }
        .body { display: flex; flex-direction: column; gap: 8px; padding: 10px; overflow: auto; }
        .row { display: flex; gap: 6px; }
        .ui-select { flex: 1; min-width: 0; height: 28px; padding: 0 6px; border-radius: 4px; border: 1px solid #4d4d4d; background: #252526; color: #ccc; font-size: 12px; }
        .btn { height: 28px; padding: 0 10px; border-radius: 4px; border: 1px solid #4d4d4d; background: #2d2d2d; color: #ccc; font-size: 12px; cursor: pointer; white-space: nowrap; }
        .btn:hover { background: #37373d; }
        .btn.primary { background: #0e639c; border-color: #0e639c; color: #fff; }
        .btn.primary:hover { background: #1177bb; }
        .btn[disabled] { opacity: 0.45; pointer-events: none; }
        .actions { display: flex; gap: 6px; }
        .actions .btn { flex: 1; }
        .drop { display: flex; align-items: center; justify-content: center; min-height: 56px; padding: 10px; border: 1.5px dashed #4d4d4d; border-radius: 6px; color: #9d9d9d; font-size: 11px; text-align: center; }
        .drop.over { border-color: #007acc; background: rgb(0 122 204 / 14%); color: #fff; }
        .list { display: flex; flex-direction: column; gap: 4px; margin: 0; padding: 0; list-style: none; }
        .item { display: flex; align-items: center; gap: 6px; padding: 4px 6px; border: 1px solid #333; border-radius: 5px; background: #252526; }
        .item .preview { width: 22px; height: 22px; flex: none; color: #ccc; display: inline-flex; }
        .item .preview svg { width: 100%; height: 100%; }
        .item input[type="text"] { flex: 1; min-width: 0; height: 24px; padding: 0 6px; border-radius: 4px; border: 1px solid #3c3c3c; background: #1e1e1e; color: #ccc; font-size: 11px; }
        .item .remove { width: 20px; height: 20px; border: 0; background: transparent; color: #9d9d9d; cursor: pointer; font-size: 12px; }
        .item .remove:hover { color: #f14c4c; }
        .hint { margin: 0; font-size: 10px; line-height: 1.6; color: #8c8c8c; }
        footer { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-top: 1px solid #3c3c3c; background: #252526; }
        .count { font-size: 11px; color: #9d9d9d; flex: 1; }
        .toast { position: absolute; left: 10px; right: 10px; bottom: 54px; padding: 6px 8px; border-radius: 5px; background: #04395e; color: #fff; font-size: 11px; line-height: 1.5; }
        .toast[data-kind="warn"] { background: #5a1d1d; }
        .toast[data-kind="ok"] { background: #1b4721; }
        .empty { padding: 10px; text-align: center; font-size: 11px; color: #8c8c8c; }
    `;

    const buildPanel = () => {
        const host = document.createElement("div");
        host.setAttribute("data-useicon-ext", "root");
        document.documentElement.appendChild(host);
        const shadow = host.attachShadow({ mode: "open" });
        shadow.innerHTML = `
            <style>${panelStyle}</style>
            <button class="fab" type="button" title="打开 UseIcon 采集面板">UI</button>
            <section class="panel" hidden>
                <header>
                    <span class="logo">UI</span>
                    <div class="title">
                        <strong>UseIcon 采集</strong>
                        <span class="conn" data-state="off">未连接</span>
                    </div>
                    <button class="icon-btn" type="button" data-act="reconnect" title="重新连接 UseIcon">⟳</button>
                    <button class="icon-btn" type="button" data-act="close" title="关闭">✕</button>
                </header>
                <div class="body">
                    <div class="row">
                        <select class="ui-select" data-role="project"></select>
                    </div>
                    <div class="actions">
                        <button class="btn primary" type="button" data-act="scan">抓取本页图标</button>
                        <button class="btn" type="button" data-act="clipboard">从剪贴板导入</button>
                    </div>
                    <div class="drop" data-role="drop">把页面上的 SVG / 图片拖到这里</div>
                    <ul class="list" data-role="list"></ul>
                    <p class="hint">iconfont：字体图标无法直出路径，请点图标上的「复制 SVG」，再用「从剪贴板导入」。IconPark：直接「抓取本页图标」即可。</p>
                </div>
                <footer>
                    <span class="count" data-role="count">0 个待加入</span>
                    <button class="btn primary" type="button" data-act="upload">加入项目</button>
                </footer>
                <div class="toast" hidden></div>
            </section>
        `;
        state.host = host;
        state.shadow = shadow;

        shadow.querySelector(".fab").addEventListener("click", () => {
            state.open = !state.open;
            render();
            if (state.open) {
                connectBridge();
            }
        });

        shadow.addEventListener("click", (event) => {
            const target = event.target.closest("[data-act]");
            if (!target) {
                return;
            }
            const action = target.getAttribute("data-act");
            if (action === "close") {
                state.open = false;
                render();
            } else if (action === "scan") {
                scanPage();
            } else if (action === "clipboard") {
                importClipboard();
            } else if (action === "reconnect") {
                connectBridge();
            } else if (action === "upload") {
                uploadCandidates();
            }
        });

        const drop = shadow.querySelector('[data-role="drop"]');
        drop.addEventListener("dragover", (event) => {
            event.preventDefault();
            drop.classList.add("over");
        });
        drop.addEventListener("dragleave", () => drop.classList.remove("over"));
        drop.addEventListener("drop", (event) => {
            drop.classList.remove("over");
            handleDrop(event);
        });

        shadow.querySelector('[data-role="list"]').addEventListener("input", (event) => {
            const input = event.target.closest("input[data-id]");
            if (input) {
                const item = state.candidates.find((entry) => entry.id === input.getAttribute("data-id"));
                if (item) {
                    item.name = nameFromText(input.value, item.name);
                }
            }
        });
        shadow.querySelector('[data-role="list"]').addEventListener("change", (event) => {
            const checkbox = event.target.closest("input[type=checkbox]");
            if (checkbox) {
                const item = state.candidates.find((entry) => entry.id === checkbox.getAttribute("data-id"));
                if (item) {
                    item.checked = checkbox.checked;
                    render();
                }
            }
        });
        shadow.querySelector('[data-role="list"]').addEventListener("click", (event) => {
            const remove = event.target.closest("[data-remove]");
            if (remove) {
                const id = remove.getAttribute("data-remove");
                state.candidates = state.candidates.filter((item) => item.id !== id);
                render();
            }
        });

        render();
    };

    const render = () => {
        if (!state.shadow) {
            return;
        }
        const panel = state.shadow.querySelector(".panel");
        panel.hidden = !state.open;

        const conn = state.shadow.querySelector(".conn");
        if (state.bridgeState === "ready") {
            conn.dataset.state = "ready";
            conn.textContent = state.user ? `已连接：${state.user.nickname || state.user.name}` : "已连接，但未登录";
        } else if (state.bridgeState === "connecting") {
            conn.dataset.state = "connecting";
            conn.textContent = "正在连接 UseIcon...";
        } else {
            conn.dataset.state = "off";
            conn.textContent = "未连接：请在 UseIcon 登录";
        }

        const select = state.shadow.querySelector('[data-role="project"]');
        const current = select.value;
        select.innerHTML = state.projects.length
            ? state.projects.map((project) => `<option value="${escapeHtml(project.id)}">${escapeHtml(project.name)}（${project.iconCount}）</option>`).join("")
            : `<option value="">没有可编辑的项目</option>`;
        if (current && state.projects.some((project) => project.id === current)) {
            select.value = current;
        }

        const list = state.shadow.querySelector('[data-role="list"]');
        list.innerHTML = state.candidates.length
            ? state.candidates
                  .map(
                      (item) => `
                <li class="item">
                    <input type="checkbox" ${item.checked ? "checked" : ""} data-id="${escapeHtml(item.id)}" title="选择" />
                    <span class="preview">${item.svg}</span>
                    <input type="text" value="${escapeHtml(item.name)}" data-id="${escapeHtml(item.id)}" />
                    <button class="remove" type="button" data-remove="${escapeHtml(item.id)}" title="移除">✕</button>
                </li>`,
                  )
                  .join("")
            : `<li class="empty">还没有采集到图标</li>`;

        const count = state.candidates.filter((item) => item.checked).length;
        state.shadow.querySelector('[data-role="count"]').textContent = `${count} 个待加入`;
        const uploadBtn = state.shadow.querySelector('[data-act="upload"]');
        uploadBtn.disabled = state.busy || count === 0 || state.bridgeState !== "ready" || state.projects.length === 0;
        uploadBtn.textContent = state.busy ? "加入中..." : "加入项目";
    };

    // ---------- 初始化 ----------
    const init = () => {
        if (isUseIconSite()) {
            return;
        }
        buildPanel();
    };

    chrome.storage.sync.get({ siteUrl: DEFAULT_SITE_URL }, (config) => {
        state.siteUrl = normalizeSiteUrl(config.siteUrl);
        init();
    });

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message && message.type === "toggle-panel") {
            if (!state.shadow) {
                buildPanel();
            }
            state.open = !state.open;
            render();
            if (state.open) {
                connectBridge();
            }
            sendResponse({ open: state.open });
        }
        return false;
    });

    window.addEventListener("useicon-ext-toggle", () => {
        if (!state.shadow) {
            return;
        }
        state.open = !state.open;
        render();
        if (state.open) {
            connectBridge();
        }
    });
})();
