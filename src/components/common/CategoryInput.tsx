import { useMemo, useState } from "react";
import { DataListInput } from "minreact-ui";
import { COMMON_CATEGORIES } from "@/data/library";
import { mergeCategories, readCategoryHistory } from "@/utils/category";

/**
 * 分类输入：既能自由输入新分类，也能从已有分类 / 本机历史分类里快速选择
 */
export const CategoryInput = ({
    value,
    onChange,
    options,
    disabled = false,
    placeholder = "输入或选择分类",
    className = "ui-input",
}: {
    value: string; // 当前分类
    onChange: (category: string) => void; // 分类变化回调
    options?: string[]; // 可选分类（已有分类）
    disabled?: boolean; // 只读
    placeholder?: string; // 空状态提示
    className?: string; // 输入框样式
}) => {
    const [history, setHistory] = useState<string[]>(readCategoryHistory);

    // 历史分类优先（最近用过的排前面），其次是已有分类与内置分类
    const candidates = useMemo(() => mergeCategories(history, options, COMMON_CATEGORIES), [history, options]);

    return (
        <DataListInput
            className={className}
            value={value}
            options={candidates}
            disabled={disabled}
            placeholder={placeholder}
            maxLength={32}
            onFocus={() => setHistory(readCategoryHistory())}
            onInput={(event) => onChange((event.target as HTMLInputElement).value)}
            onSelect={(next) => onChange(next)}
        />
    );
};
