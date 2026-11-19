import { useEffect, useState } from "react";
import { DIALOG_SIZE_LARGE, Dialog } from "minreact-ui";
import { useDialogForm } from "@/hooks/useDialogForm";

/** 代码导入对话框：粘贴 iconfont symbol / SVG 字体 / SVG 源码，解析后并入待导入列表 */
export const IconCodeDialog = ({
    open,
    setOpen,
    onParse,
}: {
    open: boolean; // 是否打开
    setOpen: (open: boolean) => void; // 显隐控制
    onParse: (code: string) => boolean; // 解析回调，返回 true 时关闭对话框
}) => {
    const [code, setCode] = useState("");

    useEffect(() => {
        if (open) {
            setCode("");
        }
    }, [open]);

    const { formProps, submitProps } = useDialogForm(() => {
        if (onParse(code)) {
            setOpen(false);
        }
    });

    return (
        <Dialog open={open} setOpen={setOpen} width={DIALOG_SIZE_LARGE} clickMaskerToClose>
            <Dialog.Title>粘贴图标代码</Dialog.Title>
            <Dialog.Content>
                <form {...formProps}>
                    <div className="dialog-body">
                        <textarea
                            className="ui-textarea code svg-code-editor"
                            spellCheck={false}
                            placeholder="粘贴 iconfont 的 symbol 内容、SVG 字体代码，或一个 / 多个 <svg> 源码"
                            value={code}
                            onChange={(event) => setCode(event.target.value)}
                        />
                    </div>
                </form>
            </Dialog.Content>
            <Dialog.Action align="right">
                <button className="ui-btn" type="button" onClick={() => setOpen(false)}>
                    取消
                </button>
                <button className="ui-btn primary" {...submitProps}>
                    解析并添加
                </button>
            </Dialog.Action>
        </Dialog>
    );
};
