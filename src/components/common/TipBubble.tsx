/** 按钮旁的提示气泡（显示与延时关闭由 useTimedTip 控制） */
export const TipBubble = ({ text }: { text: string | null }) => (text ? <span className="tip-bubble" role="status">{text}</span> : null);
