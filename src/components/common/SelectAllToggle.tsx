import { useEffect, useRef } from "react";

/** 列表全选开关：勾选 / 半选状态，未选择时显示「全选（n）」，有选择时显示「已选择 x/y」 */
export const SelectAllToggle = ({
    selected,
    total,
    onChange,
}: {
    selected: number; // 当前列表已选数量
    total: number; // 当前列表条目总数
    onChange: (checked: boolean) => void; // 全选 / 取消全选
}) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const checked = total > 0 && selected >= total;
    const indeterminate = selected > 0 && selected < total;

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.indeterminate = indeterminate;
        }
    }, [indeterminate]);

    if (total === 0) {
        return null;
    }

    return (
        <label className="ui-label-check ui-note">
            <input ref={inputRef} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
            {selected > 0 ? `已选择 ${selected}/${total}` : `全选(${total})`}
        </label>
    );
};
