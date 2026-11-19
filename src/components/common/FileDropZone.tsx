import { useState, type ReactNode } from "react";
import { FilePicker } from "minreact-ui";
import { AppIcon } from "./AppIcon";

/**
 * 文件选择 / 拖放区：点击触发文件选择，也支持把文件拖进来
 */
export const FileDropZone = ({
    accept,
    multiple = false,
    onChange,
    title,
    description,
}: {
    accept?: string; // 接受的类型
    multiple?: boolean; // 是否多选
    onChange: (file: File | File[]) => void; // 选择回调
    title: string; // 标题
    description?: string; // 说明
    children?: ReactNode; // 额外内容
}) => {
    const [over, setOver] = useState(false);
    return (
        <label
            className={`drop-zone ${over ? "over" : ""}`}
            onDragOver={(event) => {
                event.preventDefault();
                setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(event) => {
                event.preventDefault();
                setOver(false);
                const files = Array.from(event.dataTransfer.files || []);
                if (files.length === 0) {
                    return;
                }
                onChange(multiple ? files : files[0]);
            }}
        >
            <FilePicker multiple={multiple} accept={accept} onChange={onChange} />
            <AppIcon name="upload" className="drop-zone__icon" />
            <strong className="drop-zone__title">{title}</strong>
            {description && <span className="drop-zone__description">{description}</span>}
        </label>
    );
};
