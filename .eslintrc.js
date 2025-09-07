module.exports = {
    env: {
        browser: true,
        es2021: true
    },
    extends: [
        'eslint:recommended'
    ],
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
    },
    rules: {
        // 语法规则
        'semi': ['error', 'always'],
        'quotes': ['error', 'single'],
        'no-unused-vars': ['warn', { 
            'argsIgnorePattern': '^_',
            'varsIgnorePattern': '^_' 
        }],
        'no-console': 'off', // 游戏开发需要调试
        'no-redeclare': 'error',
        'no-undef': 'error',
        
        // 代码质量
        'no-duplicate-imports': 'error',
        'no-unreachable': 'error',
        'no-constant-condition': 'warn',
        'no-empty': 'warn',
        
        // 性能相关（针对游戏开发）
        'no-new': 'warn', // 避免在循环中创建新对象
        'prefer-const': 'error',
        'no-var': 'error',
        
        // 代码风格
        'indent': ['error', 4],
        'brace-style': ['error', '1tbs'],
        'comma-dangle': ['error', 'never'],
        'object-curly-spacing': ['error', 'always'],
        'array-bracket-spacing': ['error', 'never'],
        'space-before-function-paren': ['error', 'never'],
        'keyword-spacing': ['error', { 'before': true, 'after': true }],
        
        // 函数规则
        'max-params': ['warn', 6], // 游戏函数可能参数较多
        'max-lines-per-function': ['warn', { 'max': 100 }],
        'complexity': ['warn', 15], // 游戏逻辑可能较复杂
        
        // 类和对象
        'no-this-before-super': 'error',
        'constructor-super': 'error',
        'prefer-arrow-callback': 'warn'
    },
    globals: {
        // 游戏相关全局变量
        'game': 'writable',
        'ParkourGame': 'readonly',
        'requestAnimationFrame': 'readonly',
        'cancelAnimationFrame': 'readonly',
        'performance': 'readonly'
    },
    overrides: [
        {
            files: ['script_clean.js'],
            rules: {
                // 对主游戏文件放宽一些限制
                'max-lines-per-function': ['warn', { 'max': 150 }],
                'max-lines': ['warn', 2000]
            }
        }
    ]
};
