# UseIcon BrowserExt

从任意网页（重点支持 [iconfont.cn](https://www.iconfont.cn/) 与 [IconPark](https://iconpark.oceanengine.com/)）采集图标，并批量写入 UseIcon 项目。

## 安装（Chrome / Edge）

1. 打开 `chrome://extensions`，开启右上角「开发者模式」；
2. 点击「加载已解压的扩展程序」，选择本仓库的 `extensions/BrowserExt` 目录；
3. 点击扩展图标，填写 UseIcon 站点地址（本地开发默认 `http://localhost:5190/`）并保存。

## 使用流程

1. 先在 UseIcon 站点登录（扩展通过隐藏桥接页复用同一份登录态与本地数据）；
2. 打开目标页面（iconfont 项目页 / IconPark 图标页 / 任意含 SVG 的页面）；
3. 点击右下角 `UI` 悬浮按钮打开采集面板：
   - **抓取本页图标**：扫描页面上可见的 `<svg>` 与 `<img>`（含 dataURI 的 SVG）；
   - **从剪贴板导入**：iconfont 的字体图标无法直出路径，请点图标上的「复制 SVG」，再点这个按钮；
   - 直接把页面上的 SVG / 图片**拖进面板的虚线区域**；
4. 在列表里勾选、改名、移除不需要的图标；
5. 选择目标项目（只列出「协作人员」及以上角色可编辑的项目），点「加入项目」。

## iconfont / IconPark 差异

| 站点 | 说明 |
| --- | --- |
| IconPark | 页面本身是 SVG，直接「抓取本页图标」即可 |
| iconfont 图标库 / 搜索页 | 图标用字体渲染，扩展会提示检测到字体图标；点图标悬浮菜单里的「复制 SVG」→「从剪贴板导入」 |
| iconfont 图标详情页 | 若页面内联了 SVG，可直接抓取 |

## 工作原理

- `src/content.js` 注入悬浮面板（Shadow DOM 隔离样式），负责抓取、拖放、剪贴板解析；
- 面板通过隐藏 iframe 加载 `站点地址/#/ext-bridge`，用 `postMessage` 与站点通信：
  - `ping` → 站点回传登录用户与可编辑项目列表；
  - `upload` → 站点调用本地 API 写入项目图标，回传结果。
- 跨域图片（`<img src="https://...">`）由 `src/background.js` 代理下载并转成 dataURL，再包装成内嵌 SVG。

## 权限说明

- `host_permissions: <all_urls>`：在任意页面注入采集入口、代理下载图片；
- `storage`：保存站点地址；
- `activeTab` / `scripting`：对安装扩展前就已打开的页面动态注入面板。

## 开发提示

- 内容脚本无需构建，修改 `src/*.js` 后在扩展管理页点「重新加载」并刷新目标页面；
- 站点地址改动后需刷新目标页面（内容脚本在页面加载时读取配置）。
