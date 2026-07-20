# Inkstone

Inkstone 是一个基于 **Electron + React + TypeScript + Tailwind CSS + shadcn/ui** 的跨平台 Markdown 编辑器与阅读器。项目已从原生 SwiftUI/AppKit 实现完整迁移到 TypeScript，保留安静写作、多标签、工作区文件树和编辑/分屏/阅读三种核心工作流。

## 功能

- 工作区文件树、文件筛选、新建、重命名、移到废纸篓和系统文件管理器定位
- 多文档标签页、未保存状态、保存、另存为和退出前确认
- CodeMirror 6 Markdown 编辑器，支持语法高亮、行号、拼写检查和格式快捷键
- GFM 表格、任务列表、删除线、Front Matter、数学公式和本地图片预览
- 编辑器 / 实时分屏 / 阅读器三种布局，以及编辑器与预览同步滚动
- 文档大纲和标题跳转
- 系统 / 浅色 / 深色主题，字体、字号、行距等编辑器设置
- HTML 与 PDF 导出；HTML 导出会内嵌本地图片，可离线阅读
- 单实例运行和系统 Markdown 文件关联，避免重复窗口
- macOS、Windows、Linux 打包配置

## 开发

需要 Node.js 22 或更高版本。

```bash
npm install
npm run dev
```

## 验证

```bash
npm run typecheck
npm test
npm run build
```

## 打包

生成未安装的应用目录：

```bash
npm run package
```

生成当前平台的安装包：

```bash
npm run dist
```

构建结果位于 `dist/`。macOS 默认生成 DMG 和 ZIP，Windows 生成 NSIS 安装包，Linux 生成 AppImage。

## 主要快捷键

| 操作 | 快捷键 |
| --- | --- |
| 新建文档 | `⌘/Ctrl + N` |
| 打开文档 | `⌘/Ctrl + O` |
| 打开工作区 | `⇧ + ⌘/Ctrl + O` |
| 保存 / 另存为 | `⌘/Ctrl + S` / `⇧ + ⌘/Ctrl + S` |
| 关闭当前标签 | `⌘/Ctrl + W` |
| 粗体 / 斜体 / 链接 | `⌘/Ctrl + B` / `⌘/Ctrl + I` / `⌘/Ctrl + K` |
| 切换第 1～9 个标签 | `⌘/Ctrl + 1` … `9` |
| 编辑 / 分屏 / 阅读 | `⌃ + ⌘/Ctrl + 1` / `2` / `3` |
| 显示大纲 | `⌥/Alt + ⌘/Ctrl + L` |

## 工程结构

```text
src/
├── main/       # Electron 主进程、文件系统、系统菜单和导出
├── preload/    # contextBridge 类型化安全桥接
├── renderer/   # React 界面、CodeMirror 编辑器和 Markdown 预览
└── shared/     # 主进程与渲染进程共享类型
```

渲染进程启用了 `contextIsolation` 并关闭 `nodeIntegration`，所有本地文件操作都通过 preload 白名单 API 完成。
