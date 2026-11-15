import { useEffect, useState } from "react";
import { DIALOG_SIZE_NORMAL, Dialog, Toast } from "minreact-ui";
import { DEFAULT_CODE_TEMPLATE } from "@/config";
import { useCodeTypeStore } from "@/store/codeTypeStore";
import type { CodeType } from "@/store/codeTypeStore";

/** 新增 / 修改自定义代码模板：输入名称 + 模板内容 */
export const CodeTypeDialog = ({
    open,
    setOpen,
    editing,
    onSaved,
}: {
    open: boolean; // 是否打开
    setOpen: (open: boolean) => void; // 显隐控制
    editing: CodeType | null; // 正在修改的模板（null 表示新增）
    onSaved: (type: CodeType) => void; // 保存成功回调
}) => {
    const addType = useCodeTypeStore((state) => state.addType);
    const updateType = useCodeTypeStore((state) => state.updateType);
    const [name, setName] = useState("");
    const [template, setTemplate] = useState(DEFAULT_CODE_TEMPLATE);

    useEffect(() => {
        if (!open) {
            return;
        }
        setName(editing?.name ?? "");
        setTemplate(editing?.template ?? DEFAULT_CODE_TEMPLATE);
    }, [open, editing]);

    const submit = () => {
        const trimmed = name.trim();
        if (!trimmed) {
            Toast.showError("请输入模板名称");
            return;
        }
        if (editing) {
            if (!updateType(editing.id, { name: trimmed, template })) {
                Toast.showError("已存在同名的代码模板");
                return;
            }
            Toast.showSuccess("代码模板已更新");
            onSaved({ ...editing, name: trimmed, template });
            setOpen(false);
            return;
        }
        const created = addType(trimmed, template);
        if (!created) {
            Toast.showError("已存在同名的代码模板");
            return;
        }
        Toast.showSuccess(`已新增代码模板「${created.name}」`);
        onSaved(created);
        setOpen(false);
    };

    return (
        <Dialog open={open} setOpen={setOpen} width={DIALOG_SIZE_NORMAL} clickMaskerToClose>
            <Dialog.Title>{editing ? "修改代码模板" : "新增代码模板"}</Dialog.Title>
            <Dialog.Content>
                <div className="dialog-body">
                    <div className="ui-field">
                        <label htmlFor="code-type-name">模板名称</label>
                        <input
                            id="code-type-name"
                            className="ui-input"
                            placeholder="例如：小程序组件"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            onKeyDown={(event) => event.key === "Enter" && submit()}
                        />
                        <span className="ui-field-tip">名称会显示在 ExtMode 的代码模板下拉里</span>
                    </div>
                    <div className="ui-field">
                        <label htmlFor="code-type-template">代码模板</label>
                        <textarea
                            id="code-type-template"
                            className="ui-textarea"
                            style={{ minHeight: "7rem" }}
                            spellCheck={false}
                            value={template}
                            onChange={(event) => setTemplate(event.target.value)}
                        />
                        <span className="ui-field-tip">支持 %icon_name% / %size% / %color% / %svg% 等占位符</span>
                    </div>
                </div>
            </Dialog.Content>
            <Dialog.Action align="right">
                <button className="ui-btn" type="button" onClick={() => setOpen(false)}>
                    取消
                </button>
                <button className="ui-btn primary" type="button" onClick={submit}>
                    {editing ? "保存" : "创建"}
                </button>
            </Dialog.Action>
        </Dialog>
    );
};
