import { useId } from "react";
import type { FormEvent, FormHTMLAttributes } from "react";

/**
 * 让对话框表单支持「回车提交」：
 * 内容用 form 包裹，footer 的主按钮通过 form 属性与之关联（type="submit"）
 */
export const useDialogForm = (onSubmit: () => void) => {
    const formId = useId();

    const formProps: FormHTMLAttributes<HTMLFormElement> = {
        id: formId,
        className: "dialog-form",
        onSubmit: (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
            // 只响应主提交按钮；输入框回车时 submitter 为 null
            if (submitter && submitter.dataset.formSubmit !== "true") {
                return;
            }
            onSubmit();
        },
    };

    const submitProps = {
        type: "submit" as const,
        form: formId,
        "data-form-submit": "true",
    };

    return { formProps, submitProps };
};
