/**
 * 跨窗口同步：主窗口、拓展模式窗口与浏览器扩展桥接页各自运行独立的 store，
 * 图标增删后通过 BroadcastChannel 通知其他窗口重新拉取数据。
 */

const CHANNEL_NAME = "useicon-project-icons";

interface ProjectIconsMessage {
    projectId: string; // 图标发生增删的项目
}

let channel: BroadcastChannel | null = null;

const getChannel = (): BroadcastChannel | null => {
    if (channel) {
        return channel;
    }
    if (typeof BroadcastChannel === "undefined") {
        return null;
    }
    channel = new BroadcastChannel(CHANNEL_NAME);
    return channel;
};

/** 通知其他窗口：指定项目的图标已增删 */
export const broadcastProjectIconsChanged = (projectId: string) => {
    const target = getChannel();
    if (!target) {
        return;
    }
    const message: ProjectIconsMessage = { projectId };
    target.postMessage(message);
};

/** 监听其他窗口的项目图标变更，返回取消监听的函数 */
export const subscribeProjectIconsChanged = (listener: (projectId: string) => void) => {
    const target = getChannel();
    if (!target) {
        return () => undefined;
    }
    const handle = (event: MessageEvent<ProjectIconsMessage>) => {
        const projectId = event.data?.projectId;
        if (typeof projectId === "string" && projectId) {
            listener(projectId);
        }
    };
    target.addEventListener("message", handle);
    return () => target.removeEventListener("message", handle);
};
