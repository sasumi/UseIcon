type FlexProps = React.HTMLAttributes<HTMLDivElement> & {
    gap?: number | string; // 间距，数字按 px 处理
    align?: React.CSSProperties["alignItems"]; // 交叉轴对齐
    justify?: React.CSSProperties["justifyContent"]; // 主轴对齐
    wrap?: boolean; // 是否换行
};

export const Flex = ({ children, gap = 0, align = "center", justify = "center", wrap = true, className, style, ...rest }: FlexProps) => {
    return (
        <div
            style={{
                display: "flex",
                gap: `${isNaN(Number(gap)) ? gap : `${gap}px`}`,
                alignItems: align,
                justifyContent: justify,
                flexWrap: wrap ? "wrap" : "nowrap",
                ...style,
            }}
            className={`${className || ""}`}
            {...rest}
        >
            {children}
        </div>
    );
};
