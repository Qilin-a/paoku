module.exports = {
    // 基础格式化
    semi: true,
    singleQuote: true,
    quoteProps: 'as-needed',
    trailingComma: 'none',
    
    // 缩进和空格
    tabWidth: 4,
    useTabs: false,
    
    // 行长度
    printWidth: 100,
    
    // 括号和空格
    bracketSpacing: true,
    bracketSameLine: false,
    arrowParens: 'avoid',
    
    // 换行
    endOfLine: 'lf',
    
    // 对象和数组
    objectCurlyNewline: true,
    
    // 特殊文件处理
    overrides: [
        {
            files: '*.json',
            options: {
                tabWidth: 2
            }
        },
        {
            files: '*.md',
            options: {
                printWidth: 80,
                proseWrap: 'always'
            }
        }
    ]
};
