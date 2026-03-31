# Ch11: CLI 传输层 — 从终端到远程的桥梁

`Ch01 > Ch02 > Ch03 > Ch04 > Ch05 > Ch06 | Ch07 > Ch08 > Ch09 > Ch10 > [ Ch11 ] Ch12`

> *"传输层决定了 Agent 能在哪里运行——终端、IDE、远程服务器、还是浏览器"*

## 问题

Claude Code 不只是一个终端工具。它需要作为 VS Code 扩展的后端、作为远程服务器、作为 SDK 被嵌入到其他应用。同一套核心逻辑，需要多种输入/输出方式。

## 架构图

```
用户界面层:
  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
  │   终端 REPL   │  │   VS Code    │  │   SDK/API    │
  │  (React Ink)  │  │  (IDE 集成)   │  │  (headless)  │
  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
         │                 │                  │
         v                 v                  v
传输层:
  ┌──────────────────────────────────────────────────┐
  │                cli/transports/                    │
  │  ┌─────────┐  ┌──────────┐  ┌────────────────┐  │
  │  │  SSE    │  │WebSocket │  │    Hybrid       │  │
  │  │Transport│  │Transport │  │   Transport     │  │
  │  │ (23KB)  │  │ (28KB)   │  │   (11KB)       │  │
  │  └─────────┘  └──────────┘  └────────────────┘  │
  └──────────────────────┬───────────────────────────┘
                         │
                         v
核心逻辑层:
  ┌──────────────────────────────────────────────────┐
  │  QueryEngine → query() → tools → API             │
  │  (与传输层无关)                                    │
  └──────────────────────────────────────────────────┘
```

## 源码导读

### 1. React Ink — 终端 UI 框架

文件路径: `src/ink.ts` (4KB)

Claude Code 的终端 UI 不是传统的 `console.log`，而是用 **React Ink** 渲染——在终端中使用 React 组件：

```
components/
├── Spinner.tsx          — 加载动画
├── MessageSelector.tsx  — 消息过滤
├── ToolRenderer.tsx     — 工具输出渲染
└── ... (100+ 组件)

hooks/
├── useTextInput.ts      (17KB)  — 文本输入
├── useTypeahead.tsx     (208KB) — 自动补全
├── useVirtualScroll.ts  (34KB)  — 虚拟滚动
├── useVoice.ts          (45KB)  — 语音输入
└── ... (108 个 hooks)
```

### 2. 传输协议

```
cli/transports/
├── Transport.ts              (234B)  — 接口定义
├── SSETransport.ts           (23KB)  — Server-Sent Events
├── WebSocketTransport.ts     (28KB)  — WebSocket 双向通信
├── HybridTransport.ts        (11KB)  — SSE + WS 混合
├── SerialBatchEventUploader.ts (9KB) — 批量事件上传
└── ccrClient.ts              (33KB)  — CCR 客户端
```

### 3. 结构化 IO

文件路径: `src/cli/structuredIO.ts` (28KB)

SDK 模式下，输入输出以 JSON 格式通过 stdio 传输（NDJSON 格式）。

### 4. 远程会话

文件路径: `src/remote/` 目录

支持远程会话——Agent 运行在远程服务器，通过 WebSocket 与本地终端通信。

### 5. 打印系统

文件路径: `src/cli/print.ts` (208KB)

这是项目中**最大的文件之一**，负责将 Agent 的各种输出格式化为终端可读的形式。

## 关键设计决策

| 决策 | 原因 |
|------|------|
| React Ink 而非 raw stdout | 复杂 UI（进度条、表格、diff 高亮）需要组件化 |
| 多种传输协议 | 适配不同部署场景 |
| NDJSON 结构化输出 | SDK 集成需要机器可读的格式 |
| 远程会话支持 | 云端开发环境（如 Codespace） |

## 实践练习

1. **查看传输接口**：打开 `src/cli/transports/Transport.ts`，理解传输层需要实现什么
2. **理解 Ink 组件**：打开 `src/components/` 目录，浏览几个组件的实现，感受 React 在终端中的使用方式
3. **追踪输出渲染**：当模型返回一段代码时，它是如何被 `print.ts` 格式化和高亮显示的？
