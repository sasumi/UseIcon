/** 主题模式：亮色 / 暗色 / 跟随系统 */
export type ThemeMode = "light" | "dark" | "auto";

/** 项目内角色：管理员 / 协作人员 / 普通用户 */
export type ProjectRole = "admin" | "editor" | "viewer";

/** 项目可见性：team 内部项目（仅成员）；public 公开项目（游客可用） */
export type ProjectVisibility = "team" | "public";

/** 用户（来自 api.tthaoke.com，字段对齐后端 baseInfo） */
export interface User {
    id: string; // 用户 ID（user_id）
    name: string; // 登录名
    nickname: string; // 昵称
    email: string; // 邮箱（可能为空）
    avatarThumb: string; // 头像地址
    state: string; // 账户状态：Normal / Canceled / Forbidden
    createTime: string; // 注册时间
}

/** 项目成员（带用户信息快照，便于离线展示） */
export interface ProjectMember {
    userId: string; // 成员用户 ID
    role: ProjectRole; // 项目内角色
    joinedAt: number; // 加入时间戳
    name: string; // 成员显示名
    email: string; // 成员邮箱
    avatarThumb: string; // 成员头像
}

/** 个人收藏图标（与来源项目/公共库解耦的快照） */
export interface FavoriteIcon {
    id: string; // 收藏记录 ID
    userId: string; // 所属用户
    className: string; // 图标类名（用于代码模板）
    svg: string; // SVG 源码
    tags: string[]; // 个人标签
    source: "library" | "project"; // 来源类型
    libraryId?: string; // 来源公共库 ID
    projectId?: string; // 来源项目 ID
    createdAt: number; // 收藏时间
    updatedAt: number; // 更新时间
}

/** 项目 */
export interface Project {
    id: string; // 项目 ID
    name: string; // 项目名
    description: string; // 项目描述
    ownerId: string; // 创建者用户 ID
    visibility: ProjectVisibility; // 可见性
    allowGuest: boolean; // 是否允许游客使用
    iconSize: number; // 导出/拖拽代码的默认尺寸
    codeTemplate: string; // 代码模板
    members: ProjectMember[]; // 成员列表
    createdAt: number; // 创建时间戳
    updatedAt: number; // 更新时间戳
}

/** 项目图标 */
export interface IconItem {
    id: string; // 图标 ID
    projectId: string; // 所属项目 ID
    className: string; // 图标类名（用于代码模板）
    svg: string; // 标准化的 SVG 源码
    tags: string[]; // 标签
    libraryId?: string; // 来自公共库时的引用 ID
    createdBy: string; // 创建者用户 ID
    createdAt: number; // 创建时间戳
    updatedAt: number; // 更新时间戳
    order?: number; // 自定义排序序号（升序，越小越靠前）
}

/** 公共库图标 */
/** 图标局部更新（批量优化 / 重命名等场景返回的最小字段集合） */
export type IconPatch = Pick<IconItem, "id" | "className" | "svg" | "tags"> & Partial<IconItem>;

/** 公共库图标（来自 uiapi 的 ui_icon 表，project_id=library） */
export interface LibraryIcon {
    id: string; // 图标 ID
    className: string; // 图标类名
    svg: string; // SVG 源码
    category: string; // 分类
    tags: string[]; // 搜索标签
    order?: number; // 排序号（升序）
    updatedAt?: number; // 更新时间戳
}

/** 当前用户的权限上下文 */
export interface ProjectAccess {
    role: ProjectRole | null; // 登录用户在项目内的角色，游客为 null
    isGuest: boolean; // 是否游客（未登录）
    canView: boolean; // 是否可查看
    canEdit: boolean; // 是否可增删改图标
    canManage: boolean; // 是否可管理项目与成员
}

/** 登录结果 */
export interface AuthResult {
    token: string; // 登录令牌
    user: User; // 登录用户
}

/** 图标批量优化参数 */
export interface IconOptimizeOptions {
    size?: number | null; // 统一 viewBox 尺寸，null 表示不改
    useCurrentColor?: boolean; // 将固定颜色替换为 currentColor
    strokeWidth?: number | null; // 统一线条粗细，null 表示不改
    precision?: number; // path 数字精度（小数位）
    removeFill?: boolean; // 线性图标移除 fill 填充
}

/** 新建图标入参 */
export interface IconInput {
    className: string; // 图标类名
    svg: string; // SVG 源码
    tags?: string[]; // 标签
    libraryId?: string; // 公共库引用 ID
    category?: string; // 分类（仅公共库使用）
}

/** 上传/导入时解析出的候选图标 */
export interface IconCandidate extends IconInput {
    key: string; // 本地唯一键
    checked?: boolean; // 是否勾选导入
}
