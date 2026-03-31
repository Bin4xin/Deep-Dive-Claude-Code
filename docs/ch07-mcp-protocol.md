# Ch08: MCP 协议 — 统一的工具调用标准

`Ch01 > Ch02 > Ch03 > Ch04 > Ch05 > Ch06 | Ch07 > [ Ch08 ] Ch09 > Ch10 > Ch11 > Ch12`

> *"MCP 让任何服务都能成为 AI 的工具——数据库、API、本地应用、远程服务"*

## 问题

Claude Code 内置了 50+ 工具，但用户的需求是无限的。数据库查询、Jira 操作、Slack 消息、Kubernetes 管理……不可能全部内置。需要一个标准协议，让第三方服务声明自己的能力，Agent 自动发现和调用。

## 架构图

```
Claude Code
    |
    |  MCP Client (client.ts 116KB)
    |
    ├── stdio 传输 ──────── 本地 MCP 服务器 (子进程)
    │   e.g. filesystem-server, git-server
    │
    ├── SSE 传输 ─────────── 远程 MCP 服务器
    │   e.g. Jira MCP, Slack MCP
    │
    └── WebSocket 传输 ──── 远程 MCP 服务器
        e.g. 自定义 MCP 服务器

MCP 服务器声明:
  tools:     [{name, description, inputSchema}]  → 变成 Agent 可用工具
  resources: [{uri, name, mimeType}]             → 可读取的资源
  prompts:   [{name, description, arguments}]    → 预定义的 prompt 模板
```

## 源码导读

### 1. MCP 客户端 — client.ts (116KB)

文件路径: `src/services/mcp/client.ts`

这是 MCP 实现中最大的文件，负责：
- 发现和连接 MCP 服务器
- 工具列表获取和缓存
- 工具调用代理
- 资源读取
- 连接生命周期管理

### 2. MCP 配置 — config.ts (50KB)

文件路径: `src/services/mcp/config.ts`

MCP 服务器配置来自多个层级：

```
~/.claude/settings.json        → 全局 MCP 配置
.claude/settings.local.json    → 项目级 MCP 配置
CLAUDE.md                      → 项目规则中的 MCP 声明
```

配置支持环境变量展开（`envExpansion.ts`）和多种传输方式。

### 3. MCP 认证 — auth.ts (87KB)

文件路径: `src/services/mcp/auth.ts`

支持 OAuth 2.0 认证流程，用于需要登录的 MCP 服务器：

```
用户 → MCP 服务器返回 401 → 启动 OAuth 流程
    → 本地 HTTP 服务器接收回调 (oauthPort.ts)
    → 获取 token → 重试请求
```

### 4. MCP 工具如何融入 Agent

MCP 服务器声明的工具被包装为 `MCPTool`，和内置工具一样参与分发：

```typescript
// src/tools/MCPTool/MCPTool.ts — MCP 工具包装器
// 从 MCP 服务器获取的 tool schema 被转换为 Claude Code 的 Tool 接口
// 调用时通过 MCP 协议转发到对应服务器
```

### 5. 关键文件索引

```
services/mcp/
├── client.ts               (116KB) — MCP 客户端核心
├── auth.ts                 (87KB)  — OAuth 认证
├── config.ts               (50KB)  — 配置管理
├── useManageMCPConnections.ts (44KB) — 连接管理 Hook
├── xaa.ts                  (18KB)  — 扩展认证代理
├── utils.ts                (18KB)  — 工具函数
├── types.ts                (7KB)   — 类型定义
├── channelPermissions.ts   (9KB)   — 频道权限
└── elicitationHandler.ts   (10KB)  — 请求处理
```

## 关键设计决策

| 决策 | 原因 |
|------|------|
| 支持 stdio/SSE/WebSocket 三种传输 | 本地服务器用 stdio，远程用网络协议 |
| OAuth 2.0 认证 | 安全访问需要登录的第三方服务 |
| 多级配置 | 全局 + 项目级，团队成员可以共享项目级 MCP 配置 |
| 工具自动发现 | 连接 MCP 服务器后自动获取工具列表，无需手动配置 |

## 实践练习

1. **查看 MCP 类型定义**：打开 `src/services/mcp/types.ts`，理解 MCP 服务器连接的数据结构
2. **追踪 MCP 工具调用**：从 `src/tools/MCPTool/MCPTool.ts` 开始，追踪一个 MCP 工具调用是如何转发到 MCP 服务器的
3. **了解配置格式**：在 `src/services/mcp/config.ts` 中找到 MCP 配置的 JSON Schema 定义
