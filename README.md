# UseIcon

VSCode 风格的图标管理平台：公共 SVG 图标库、可协作的项目、个人收藏与采集车、竖屏小窗拖拽使用，以及配套的浏览器采集扩展。

- **前端**：React 19 + Vite 8 + TypeScript 6 + SCSS + zustand + [minreact-ui](../minreact-ui)（本地 link）
- **用户体系**：直连 `api.tthaoke.com`（与同通好课 / 易纸 / 路书共用账号）
- **业务数据**：项目、项目成员、图标与收藏由 `uiapi.tthaoke.com`（[uiapi](../uiapi)）提供，服务端存储、多人共享

## 快速开始

```bash
pnpm install
pnpm dev      # http://localhost:5190/
pnpm build    # 类型检查 + 生产构建
```

`minreact-ui` / `minutool` 通过 `link:` 引入本地仓库：

```json
"minreact-ui": "link:../minreact-ui",
"minutool": "link:../minutool"
```

修改自研库后需重新构建对应库（本项目直接使用其 `dist` 产物）。

## 局域网访问

`vite.config.ts` 的 `server.host` / `preview.host` 已设为 `true`，启动时会同时监听局域网地址：

```bash
pnpm dev        # 终端会打印 Network: http://192.168.x.x:5190/
pnpm preview    # 预览生产构建，同样可通过局域网访问
```

同一局域网内的其他设备（含平板 / 手机 / VSCode Simple Browser）打开 `http://<本机IP>:5190/` 即可使用。

> 注意：`api.tthaoke.com` / `uiapi.tthaoke.com` 的 CORS 白名单目前只包含 `localhost` 与 `127.0.0.1`，
> 用局域网 IP 打开时接口会被拦。
> 需要局域网内使用时，请让后端把该 IP 加入白名单，或改用 `127.0.0.1` 同源代理。

## 功能

| 模块 | 说明 |
| --- | --- |
| 公共图标库 | 内置 80+ 线性图标，按分类浏览、关键词搜索、收藏（打标签）与加入项目 |
| 我的收藏 | 跨公共库 / 项目的图标快照，支持打标签、搜索、复制、下载、加入项目、加入采集车 |
| 采集车 | 类似购物车：先把看中的图标收进来，再一次性批量加入某个项目 |
| 项目 | 工作区：侧栏常驻项目列表（筛选 / 滚动加载 / 切换 / 新建），主区为当前项目图标网格，支持搜索与标签筛选（进入即打开第一个项目） |
| 角色权限 | 管理员（管理项目与成员）、协作人员（增删改图标）、普通用户（仅查看与使用）；可开启游客访问 |
| 图标导入 | 本地上传 SVG、图片转内嵌 SVG、iconfont（Symbol / SVG 字体）批量导入、浏览器扩展采集 |
| 批量操作 | 批量删除、统一画布尺寸、统一 currentColor、统一线条粗细、精简数字精度、批量重命名 |
| 使用与导出 | 代码模板拖拽插入、复制代码、单图标 SVG/PNG 下载；项目详情「导出」菜单支持 SVG 列表、SVG Sprite、PNG、iconfont 字体包、JSON |
| 拓展模式（ExtMode） | `/#/projects/:id/ext-mode` 竖屏页面，适合在 VSCode 的 Simple Browser 中常驻，拖动图标插入代码；代码模板可切换并新增自定义模板 |
| 侧栏调宽 | 各页侧栏与采集车抽屉的分隔条可拖动调整宽度，双击 / 回车恢复默认，宽度按页面记忆在本地；项目侧栏窄于 220px 时自动精简为图标 + 弹出面板 |
| 主题 | 亮色 / 暗色 / 跟随系统，配色对齐 VSCode，含 minreact-ui 组件的主题补丁 |

## 账号体系（api.tthaoke.com）

- 登录页通过 iframe 内嵌 `https://api.tthaoke.com/login.php?origin=...&from=useicon&return=...`，
  登录成功后由登录页 `postMessage` 回传 `{ token, user }`（与 pathbooker 一致）；
- 令牌保存在 `localStorage`（`useicon:token`），请求通过 `Authorization: Bearer` 回传；
- 头像 / 昵称分别调用 `account/uploadAvatar`、`account/changeNickname`；
- `ttapi` 的 CORS 白名单已包含 `localhost:*` 与 `127.0.0.1:*`，本地开发可直接联调；
  需要连本地后端时在 `.env.development.local` 覆盖 `VITE_PUBLIC_API_HOST`。

> 项目成员可用「邮箱 / 登录名 / 昵称」添加，需要对方先登录过一次 UseIcon（后台会保存用户快照）。

## 拓展模式（ExtMode，VSCode 中打开）

1. 项目页点「打开拓展模式」弹出 420×900 的竖屏窗口；
2. 或复制拓展模式地址，在 VSCode 里执行 `Simple Browser: Show` 打开；
3. 在拓展模式中**点击图标或把图标拖进下方代码区**，会按当前代码模板（项目模板 / 内置预设 / 自定义模板）插入代码；
4. 点击工具栏的铅笔按钮可设置**我的代码模板**（仅保存在本机，`useicon:ext-templates`），
   可用占位符：`%icon_name%`、`%IconName%`、`%size%`、`%color%`、`%svg%`、`%svgBase64%`
   （也兼容 `{name}`、`{Name}`、`{size}`、`{color}`、`{svg}`、`{svgBase64}` 写法）。
   其中 `%icon_name%` / `{name}` 取图标的 **className**，`%IconName%` / `{Name}` 为其 PascalCase。

> 图标只保存 `className` 与标签列表：卡片统一显示 className，下一行显示标签（`tag1 · tag2`），
> 收藏 / 采集 / 更多操作集中在卡片右上角。项目图标、公共库图标与收藏项使用同一套卡片组件。

> 旧地址 `/#/projects/:id/mini` 仍可访问，会解析到同一拓展模式页面。

## 浏览器扩展

见 [extensions/BrowserExt/README.md](./extensions/BrowserExt/README.md)：
支持 iconfont、IconPark 页面抓取，也支持把页面上的 SVG / 图片直接拖进采集面板，再批量写入项目。

## 目录结构

```
src/
├── api/               # API 层：http（api.tthaoke.com + uiapi.tthaoke.com）
│   ├── http.ts        # 统一请求 / 令牌 / 错误 / 两套接口主机
│   ├── auth.ts        # 登录态、头像、昵称
│   ├── projects.ts    # 项目 / 成员
│   ├── icons.ts       # 项目图标 / 批量操作 / 公共库导入
│   └── favorites.ts   # 个人收藏 + 公共库目录
├── data/library.ts    # 内置公共图标库
├── store/             # zustand：auth / library / project / cart / theme / display / 代码模板
├── hooks/             # 可复用 hooks（侧栏拖动调宽等）
├── utils/             # SVG 解析优化、iconfont 解析、图片转 SVG、导出、权限
├── components/        # 布局、公共组件、项目对话框、账户、采集车
├── pages/             # 公共库、收藏、项目工作区、拓展模式、登录、版本发布、扩展桥接
└── styles/            # SCSS：变量（明暗主题）、各页面样式、minreact-ui 主题补丁
extensions/BrowserExt/ # Chrome MV3 浏览器扩展
```

## 接口层

`src/api/index.ts` 统一导出 `api`，业务组件只依赖 `api.projects / api.icons / api.favorites` 的函数签名：

- `api.auth.*` → `api.tthaoke.com`（登录 / 账户 / 附件）
- `api.projects / api.icons / api.favorites` → `uiapi.tthaoke.com/v1/*`（项目 / 图标 / 收藏）

接口地址可用 `.env` 覆盖：`VITE_PUBLIC_API_HOST`（账号）、`VITE_ICON_API_HOST`（业务，默认 `https://uiapi.tthaoke.com/`）。
后台服务与接口清单见 [uiapi/README.md](../uiapi/README.md)。
