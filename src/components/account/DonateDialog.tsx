import { Dialog } from "minreact-ui";
import rewardQr from "@/assets/wechat-reward.png";

/** 打赏对话框：微信收款码与 gargantua 项目使用同一张二维码 */
export const DonateDialog = ({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) => (
    <Dialog open={open} setOpen={setOpen} width="22em" clickMaskerToClose>
        <Dialog.Title>打赏 · 请我喝杯奶茶</Dialog.Title>
        <Dialog.Content>
            <div className="donate">
                <div className="donate__qr">
                    <img src={rewardQr} alt="微信打赏二维码" width={168} height={168} />
                </div>
                <p>如果 UseIcon 帮你省下了时间，可以微信扫码请我喝一杯奶茶。</p>
                <p>打赏完全随意，不打赏也能使用全部功能。</p>
                <p className="ui-note">手机上长按二维码、电脑上右键「图片另存为」，都可以存下来再用微信扫。</p>
            </div>
        </Dialog.Content>
        <Dialog.Action align="right">
            <button className="ui-btn" type="button" onClick={() => setOpen(false)}>
                关闭
            </button>
        </Dialog.Action>
    </Dialog>
);
