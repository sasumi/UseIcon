import { Dialog } from "minreact-ui";
import { useLoginDialogStore } from "@/store/loginDialogStore";
import { LoginFrame } from "@/components/account/LoginFrame";

/** 登录 / 注册对话框：内嵌 api.tthaoke.com 统一登录页 */
export const LoginDialog = () => {
    const open = useLoginDialogStore((state) => state.open);
    const setOpen = useLoginDialogStore((state) => state.setOpen);

    return (
        <Dialog open={open} setOpen={setOpen} width="27em" clickMaskerToClose>
            <Dialog.Title>登录 / 注册</Dialog.Title>
            <Dialog.Content>
                <LoginFrame onSuccess={() => setOpen(false)} minHeight={420} maxHeight={560} />
            </Dialog.Content>
        </Dialog>
    );
};
