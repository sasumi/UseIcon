import { APP_VERSION, UPDATE_LOGS } from "@/updates";

const MARK_LABELS: Record<string, string> = {
    "+": "新增",
    "*": "优化",
    "!": "修复",
    "-": "移除",
};

const CONTINUATION_TAIL = /[、，。；：！？）】」》”’)\]}>,;:!?]$/;

interface UpdateLine {
    mark: string; // 行首类型符号
    text: string; // 日志文本
}

/** 拆分一条版本的日志：行首无类型符号的行并进上一条 */
const parseUpdateLog = (log: string): UpdateLine[] => {
    const lines: UpdateLine[] = [];
    log.split("\n").forEach((raw) => {
        const text = raw.trim();
        if (!text) {
            return;
        }
        const mark = MARK_LABELS[text[0]] ? text[0] : "";
        const content = mark ? text.slice(1).trim() : text;
        if (!content) {
            return;
        }
        const last = lines[lines.length - 1];
        if (!mark && last) {
            last.text += CONTINUATION_TAIL.test(last.text) ? content : ` ${content}`;
        } else {
            lines.push({ mark, text: content });
        }
    });
    return lines;
};

/** 版本发布日志：页面与「选项 · 关于」对话框共用 */
export const UpdatesLog = () => (
    <div className="updates-page">
        <p className="updates-current">当前版本 v{APP_VERSION}</p>
        <ul>
            {[...UPDATE_LOGS].reverse().map(([version, log]) => (
                <li className="updates-item" key={version}>
                    <span className="updates-version">v{version}</span>
                    <div className="updates-log">
                        {parseUpdateLog(log).map((line, index) => (
                            <p className="updates-line" key={index}>
                                {line.mark ? (
                                    <span className="updates-tag" data-mark={line.mark}>
                                        {MARK_LABELS[line.mark]}
                                    </span>
                                ) : null}
                                <span>{line.text}</span>
                            </p>
                        ))}
                    </div>
                </li>
            ))}
        </ul>
    </div>
);
