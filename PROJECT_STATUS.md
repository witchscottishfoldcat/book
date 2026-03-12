# MDNotes - 项目状态文档

> 最后更新: 2026-03-12（Phase 3.2 全文搜索完成）

## 项目愿景

开发一款 **"本地优先 + 纯Markdown管理 + 结合VS Code级代码体验 + Notion般高颜值块级编辑"** 的笔记软件。

核心理念：
- 本地优先：数据完全掌控在用户手中
- 纯 Markdown：文件格式开放、可迁移
- VS Code 体验：专业级代码编辑能力
- Notion 颜值：现代化的块级编辑界面

---

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 桌面框架 | Tauri | 2.x |
| 前端框架 | React + TypeScript | 18.x |
| 构建工具 | Vite | 5.x |
| 样式方案 | Tailwind CSS | 3.x |
| 状态管理 | Zustand | 4.x |
| WYSIWYG 编辑器 | Milkdown | 7.x |
| 代码编辑器 | Monaco Editor | - |
| 后端语言 | Rust | - |

---

## 项目结构

```
d:\ADM\PyExE\book\
├── src/                          # 前端源码
│   ├── components/
│   │   ├── editor/
│   │   │   ├── Editor.tsx        # 主编辑器容器（模式切换、保存）
│   │   │   ├── MilkdownEditor.tsx # WYSIWYG 编辑器
│   │   │   ├── MonacoCodeBlock.tsx # 代码块组件
│   │   │   ├── PropertyPanel.tsx # Frontmatter 属性面板
│   │   │   └── index.ts
│   │   └── sidebar/
│   │       ├── Sidebar.tsx       # 侧边栏（文件树）
│   │       ├── FileTreeItem.tsx  # 文件树节点
│   │       └── index.ts
│   ├── services/
│   │   ├── fileService.ts        # 文件读写服务
│   │   └── configService.ts      # 配置服务
│   ├── stores/
│   │   └── workspaceStore.ts     # Zustand 状态管理
│   ├── types/
│   │   └── index.ts              # TypeScript 类型定义
│   ├── utils/
│   │   └── frontmatter.ts        # Frontmatter 解析/序列化
│   ├── lib/
│   │   └── utils.ts              # 工具函数
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── src-tauri/                    # Tauri 后端
│   ├── src/
│   │   ├── lib.rs                # 主入口
│   │   ├── error.rs              # 错误处理
│   │   └── commands/
│   │       └── file_commands.rs  # 文件系统命令
│   ├── icons/                    # 应用图标
│   ├── Cargo.toml
│   └── tauri.conf.json
├── dist/                         # 构建产物
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── .gitignore
```

---

## 已完成功能

### Phase 1: 基础架构 ✅
- [x] Tauri 2.x + React 18 + Vite 5.x 项目搭建
- [x] Rust 文件系统命令（read_directory, read_file, write_file, create_file, delete_file, rename_file）
- [x] Zustand 状态管理（workspaceStore）
- [x] 侧边栏文件树组件
- [x] 基础编辑器框架

### Phase 2: 核心编辑体验 ✅
- [x] Milkdown 7.x WYSIWYG 编辑器集成
- [x] Monaco Editor 源码模式集成（VS Code 级体验）
- [x] 编辑器模式切换（所见即所得 / 源码）
- [x] Frontmatter 解析工具（支持多行数组、日期、嵌套对象）
- [x] 属性面板组件（可视化编辑 frontmatter）
- [x] 快捷键保存（Ctrl+S / Cmd+S）

---

## 核心功能说明

### 1. 编辑器模式
- **WYSIWYG 模式**：基于 Milkdown 的所见即所得编辑
- **源码模式**：基于 Monaco Editor 的代码编辑（支持语法高亮、代码折叠、minimap）

### 2. 属性面板
支持以下数据类型的可视化编辑：
| 类型 | 图标 | 说明 |
|------|------|------|
| string | Type | 普通文本输入 |
| number | Hash | 数字输入 |
| boolean | ToggleLeft | 开关切换 |
| date | Calendar | 日期时间选择器 |
| array | List | 标签式编辑（Enter 添加） |

### 3. Frontmatter 格式
```yaml
---
title: 笔记标题
created: 2026-03-11T10:30:00
updated: 2026-03-11T15:45:00
tags:
  - 技术
  - 笔记
published: false
---

正文内容...
```

---

## 构建与运行

### 开发模式
```bash
pnpm tauri dev
```

### 构建 Release
```bash
pnpm tauri build
```

### EXE 位置
```
d:\ADM\PyExE\book\src-tauri\target\release\mdnotes.exe
```

---

## 已解决的问题

| 问题 | 解决方案 |
|------|----------|
| Vite 初始化失败 | 手动创建前端配置和组件 |
| pnpm 代理问题 | 配置 .npmrc 代理 (127.0.0.1:7890) |
| Milkdown 7.x API 变更 | 使用 MilkdownProvider + Editor.make() |
| Monaco API 参数错误 | scrollBar → scrollbar，移除 margin |
| 端口冲突 | 停止 Vite 后由 Tauri 内部启动 |
| 构建时 EXE 被占用 | 关闭运行中的 mdnotes.exe |
| Tailwind dark 模式不生效 | main.tsx 启动时注入 `document.documentElement.classList.add("dark")` |

---

## 后续规划

### Phase 3: UI 美化与增强功能（进行中）

#### Phase 3.1: UI 全面美化 ✅
- [x] 深色主题默认启用（深邃蓝黑色系）
- [x] 主色调升级为 Indigo/Violet（248° 紫蓝色）
- [x] 侧边栏品牌化：MDNotes Logo + 渐变文字 + 应用徽标
- [x] 文件树：渐变选中态 + 左侧指示条 + 彩色文件类型图标
- [x] 编辑器工具栏：渐变保存按钮 + 保存成功动画（✓ 已保存）
- [x] 空状态页面：精致插图 + 快捷键提示卡片
- [x] 属性面板：彩色类型标签 + 卡片式行布局 + 圆角标签组件
- [x] CSS 动画系统：`animate-fade-in` + `animate-pulse-dot`
- [x] Milkdown 编辑器排版优化：最大宽度限制、行高、字体等
- [x] 全局滚动条美化 + 文字选中颜色优化
- [x] 底部状态栏重新设计（字符数、行数、模式、保存状态）

#### Phase 3.2: 增强功能 ✅
- [x] 全文搜索（基于 SQLite FTS5 索引）
  - Rust 后端：search_commands.rs（SQLite FTS5 虚拟表 + bm25 排序）
  - 前端服务：searchService.ts（Tauri invoke 封装）
  - 状态管理：searchStore.ts（Zustand）
  - UI 组件：SearchPanel.tsx（主题适配 + 高亮显示）
  - 自动索引：笔记保存时自动更新索引，删除时自动清理
  - 文件过滤：侧边栏独立文件名过滤输入框
- [x] 主题切换（亮色/暗色/跟随系统）+ 持久化
- [x] 文件重命名（右键菜单触发）
- [x] 右键上下文菜单（删除、重命名、新建、复制路径、在资源管理器打开）
- [x] 标签系统（自动颜色分配 + 筛选面板）
- [x] 文件夹收藏/书签（持久化 + 自动清理已删除书签）

### Phase 4: 高级功能（待开发）
- [ ] 双向链接 `[[]]`
- [ ] 反向链接面板
- [ ] 图谱视图
- [ ] 模板系统
- [ ] 导出功能（PDF/HTML）

### Phase 5: 性能优化（待开发）
- [ ] 虚拟滚动（大文件优化）
- [ ] 增量保存
- [ ] 懒加载文件树

---

## 开发注意事项

1. **代码风格**：遵循项目现有命名规范，使用 Tailwind CSS
2. **圈复杂度**：保持函数简洁，避免过高复杂度
3. **解耦原则**：优先考虑模块拆分，避免单文件过大
4. **测试文件**：放在 `tests/` 目录
5. **侵入性改造**：需先说明再执行

---

## 代理配置

如果遇到网络问题，检查 `.npmrc`:
```
proxy=http://127.0.0.1:7890
https-proxy=http://127.0.0.1:7890
```

---

*文档由阿杰（15年全栈开发经验的资深软件工程师）维护*
