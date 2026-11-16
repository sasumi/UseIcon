import { useEffect, useState } from "react";
import { Dialog, DIALOG_SIZE_LARGE } from "minreact-ui";
import { useDialogForm } from "@/hooks/useDialogForm";

/** SVG 源码编辑对话框（与图标详情分离，避免详情页过长） */
export const SvgCodeDialog = ({
    open,
    setOpen,
    value,
    onSave,
}: {
    open: boolean; // 是否打开
    setOpen: (open: boolean) => void; // 显隐控制
    value: string; // 当前源码
    onSave: (svg: string) => void; // 保存回调
}) => {
    const [code, setCode] = useState(value);

    useEffect(() => {
        if (open) {
            setCode(value);
        }
    }, [open, value]);

    const { formProps, submitProps } = useDialogForm(() => {
        onSave(code);
        setOpen(false);
    });

    return (
        <Dialog open={open} setOpen={setOpen} width={DIALOG_SIZE_LARGE} clickMaskerToClose>
            <Dialog.Title>编辑 SVG 源码</Dialog.Title>
            <Dialog.Content>
                <form {...formProps}>
                    <div className="dialog-body">
                        <textarea
                            className="ui-textarea code svg-code-editor"
                            spellCheck={false}
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
                    应用
                </button>
            </Dialog.Action>
        </Dialog>
    );
};
