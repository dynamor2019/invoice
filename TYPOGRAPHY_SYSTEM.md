# 全网站统一文字系统规范

## 概述
本文档定义了整个财务管理系统的文字大小、字体、字重等参数，确保UI视觉一致性。

## 基础字体设置

### 字体族
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, 'Noto Sans', sans-serif
```

**平台特定优化：**
- **iOS**: SF Pro Display / SF Pro Text
- **Android**: Roboto / Noto Sans CJK SC
- **Windows**: Segoe UI / Microsoft YaHei

### 基础行高
- 桌面端: `line-height: 1.5`
- 移动端: `line-height: 1.5`

---

## 文字大小规范

### 标题系列

| 级别 | 桌面端 | 移动端 | 字重 | 用途 |
|------|--------|--------|------|------|
| h1 | 28px | 20px | 700 | 页面主标题 |
| h2 | 24px | 18px | 700 | 页面副标题、卡片标题 |
| h3 | 18px | 15px | 600 | 区域标题、表单标题 |
| h4 | 16px | 13px | 600 | 小标题、列表项标题 |
| h5/h6 | 14px | 12px | 600 | 辅助标题 |

### 正文文字

| 类型 | 桌面端 | 移动端 | 字重 | 用途 |
|------|--------|--------|------|------|
| 正文 | 14px | 13px | 400 | 段落、描述文字 |
| 标签 | 13px | 12px | 500 | 表单标签、说明文字 |
| 小文字 | 12px | 11px | 400 | 辅助信息、时间戳 |
| 超小文字 | 11px | 10px | 400 | 徽章、提示 |

### 组件文字

| 组件 | 桌面端 | 移动端 | 字重 | 备注 |
|------|--------|--------|------|------|
| 按钮 | 13px | 12px | 600 | 统一按钮文字大小 |
| 输入框 | 13px | 12px | 400 | 表单输入 |
| 表格头 | 12px | 11px | 600 | 表格列标题 |
| 表格单元格 | 13px | 12px | 400 | 表格数据 |
| 徽章 | 11px | 10px | 600 | 状态标签 |

---

## CSS 类名规范

### 按钮类
```css
.modern-btn          /* 主按钮 - 13px, 600字重 */
.modern-btn-secondary /* 次按钮 - 13px, 600字重 */
.modern-btn-success   /* 成功按钮 - 13px, 600字重 */
```

### 输入框类
```css
.modern-input        /* 统一输入框 - 13px */
```

### 表格类
```css
.modern-table        /* 表格容器 - 13px */
.modern-table th     /* 表头 - 12px, 600字重 */
.modern-table td     /* 单元格 - 13px */
```

### 徽章类
```css
.modern-badge        /* 徽章 - 11px, 600字重 */
.badge-success       /* 成功徽章 */
.badge-warning       /* 警告徽章 */
.badge-danger        /* 危险徽章 */
.badge-info          /* 信息徽章 */
```

---

## 响应式断点

### 移动端 (max-width: 768px)
- 基础字体: 13px
- 标题缩小 20-30%
- 按钮、输入框、表格字体统一缩小到 12px
- 间距和内边距相应调整

### 桌面端 (min-width: 769px)
- 基础字体: 14px
- 标题保持标准大小
- 按钮、输入框、表格字体保持 13px
- 更大的间距和内边距

---

## 字重规范

| 字重 | 用途 |
|------|------|
| 400 | 正文、描述、输入框内容 |
| 500 | 标签、说明文字 |
| 600 | 按钮、标题、表头、徽章 |
| 700 | 页面主标题、重要标题 |

---

## 行高规范

| 类型 | 行高 | 用途 |
|------|------|------|
| 标题 | 1.3-1.4 | h1-h6 |
| 正文 | 1.5 | 段落、描述 |
| 表单 | 1.4 | 输入框、标签 |
| 组件 | 1.3-1.4 | 按钮、徽章 |

---

## 字间距规范

| 类型 | 字间距 | 用途 |
|------|--------|------|
| 标题 | -0.3 to -0.5px | h1-h3 |
| 徽章 | 0.2px | 大写徽章 |
| 正常 | 0 | 其他 |

---

## 实施指南

### 1. 页面标题
```jsx
<h1 className="text-2xl md:text-3xl font-bold">页面标题</h1>
```

### 2. 卡片标题
```jsx
<h2 className="text-xl md:text-2xl font-bold">卡片标题</h2>
```

### 3. 表单标签
```jsx
<label className="block text-gray-700 font-medium mb-2">标签文字</label>
```

### 4. 按钮
```jsx
<button className="modern-btn">按钮文字</button>
```

### 5. 输入框
```jsx
<input className="modern-input" />
```

### 6. 表格
```jsx
<table className="modern-table">
  <thead>
    <tr>
      <th>列标题</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>单元格</td>
    </tr>
  </tbody>
</table>
```

### 7. 徽章
```jsx
<span className="modern-badge badge-success">成功</span>
```

---

## 禁止事项

❌ **不要混用不同的文字大小**
- 同一类型的组件应使用统一的字体大小

❌ **不要使用内联样式设置字体大小**
- 使用预定义的 CSS 类

❌ **不要修改基础字体族**
- 保持跨平台一致性

❌ **不要随意调整行高**
- 遵循规范的行高设置

---

## 检查清单

在提交代码前，请检查：

- [ ] 所有标题使用正确的 h1-h6 标签
- [ ] 所有按钮使用 `.modern-btn` 或相关类
- [ ] 所有输入框使用 `.modern-input` 类
- [ ] 所有表格使用 `.modern-table` 类
- [ ] 所有徽章使用 `.modern-badge` 类
- [ ] 没有使用内联 `style` 设置字体大小
- [ ] 移动端和桌面端文字大小正确显示
- [ ] 字重和行高符合规范

---

## 更新日志

### v1.0 (2025-01-28)
- 初始化全网站文字系统规范
- 定义桌面端和移动端字体大小
- 统一所有组件的文字样式
- 添加响应式断点优化
