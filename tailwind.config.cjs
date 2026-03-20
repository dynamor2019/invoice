/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563eb',
          dark: '#1e40af',
        },
      },
      fontSize: {
        // 统一文字大小规范
        // 标题系列
        'h1': ['28px', { lineHeight: '1.3', fontWeight: '700', letterSpacing: '-0.5px' }],
        'h2': ['24px', { lineHeight: '1.4', fontWeight: '700', letterSpacing: '-0.3px' }],
        'h3': ['18px', { lineHeight: '1.4', fontWeight: '600' }],
        'h4': ['16px', { lineHeight: '1.5', fontWeight: '600' }],
        'h5': ['14px', { lineHeight: '1.5', fontWeight: '600' }],
        'h6': ['13px', { lineHeight: '1.5', fontWeight: '600' }],
        
        // 正文系列
        'body': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        'body-sm': ['13px', { lineHeight: '1.5', fontWeight: '400' }],
        'body-xs': ['12px', { lineHeight: '1.5', fontWeight: '400' }],
        
        // 标签和说明
        'label': ['13px', { lineHeight: '1.4', fontWeight: '500' }],
        'label-sm': ['12px', { lineHeight: '1.4', fontWeight: '500' }],
        
        // 组件文字
        'btn': ['13px', { lineHeight: '1.4', fontWeight: '600' }],
        'input': ['13px', { lineHeight: '1.4', fontWeight: '400' }],
        'table-head': ['12px', { lineHeight: '1.4', fontWeight: '600' }],
        'table-cell': ['13px', { lineHeight: '1.4', fontWeight: '400' }],
        'badge': ['11px', { lineHeight: '1.3', fontWeight: '600' }],
        
        // 保留 Tailwind 默认的 text-xs, text-sm 等，但重新定义大小
        'xs': ['12px', { lineHeight: '1.5' }],
        'sm': ['13px', { lineHeight: '1.5' }],
        'base': ['14px', { lineHeight: '1.5' }],
        'lg': ['16px', { lineHeight: '1.5' }],
        'xl': ['18px', { lineHeight: '1.4' }],
        '2xl': ['24px', { lineHeight: '1.4' }],
        '3xl': ['28px', { lineHeight: '1.3' }],
      },
      fontWeight: {
        // 统一字重
        'normal': '400',
        'medium': '500',
        'semibold': '600',
        'bold': '700',
      },
      lineHeight: {
        'tight': '1.3',
        'snug': '1.4',
        'normal': '1.5',
      },
    },
  },
  plugins: [],
};