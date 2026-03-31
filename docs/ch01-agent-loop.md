# Ch02: 查询引擎 — 对话循环的心脏

`Ch01 > [ Ch02 ] Ch03 > Ch04 > Ch05 > Ch06 | Ch07 > Ch08 > Ch09 > Ch10 > Ch11 > Ch12`

> *"所有 Agent 的本质是一个循环：调用模型 → 执行工具 → 回传结果"*

## 问题

一个教学版 Agent 循环只有 30 行。但生产环境需要处理：流式输出、工具权限检查、Token 预算、自动压缩、错误重试、中止信号、会话持久化、SDK 兼容……如何在保持核心循环简洁的同时支撑这些功能？

## 架构图

```
                        QueryEngine (一个会话一个实例)
                        ============================
                        |  mutableMessages: Message[]  |  ← 会话状态
                        |  totalUsage: Usage           |
                        |  readFileState: FileStateCache|
                        |  config: QueryEngineConfig    |
                        +==============================+
                                     |
                          submitMessage(prompt)
                                     |
                                     v
┌──────────────────────────────────────────────────────────┐
│                    query() 函数 (query.ts)                │
│                                                           │
│  ┌─────────┐    ┌──────────┐    ┌───────────────────┐    │
│  │ 构建     │    │ API 调用  │    │ 工具执行          │    │
│  │ system   │───>│ Claude   │───>│ canUseTool()      │    │
│  │ prompt   │    │ 流式响应  │    │ tool.call()       │    │
│  └─────────┘    └────┬─────┘    │ append(result)    │    │
│                      │          └────────┬──────────┘    │
│                      │                   │               │
│                      │    ┌──────────────┘               │
│                      │    │                              │
│                      v    v                              │
│              stop_reason != "tool_use"?                   │
│                 /              \                          │
│               yes               no ──> 继续循环           │
│                |                                         │
│            ┌───┴────────────────────┐                    │
│            │ 自动压缩检查            │                    │
│            │ 会话持久化              │                    │
│            │ Token 使用统计          │                    │
│            │ yield SDKMessage        │                    │
│            └────────────────────────┘                    │
└──────────────────────────────────────────────────────────┘
```

## 源码导读

### 1. QueryEngine 类 — 会话管理器

文件路径: `src/QueryEngine.ts`

QueryEngine 是**一个会话一个实例**的设计。每次 `submitMessage()` 是一个新的对话轮次，但状态跨轮次保持：

```typescript
// src/QueryEngine.ts:184-207
export class QueryEngine {
  private config: QueryEngineConfig
  private mutableMessages: Message[]        // 会话消息历史（跨轮次）
  private abortController: AbortController  // 中止信号
  private permissionDenials: SDKPermissionDenial[]
  private totalUsage: NonNullableUsage      // 累计 Token 使用
  private readFileState: FileStateCache     // 文件状态缓存
  private discoveredSkillNames = new Set<string>()

  constructor(config: QueryEngineConfig) {
    this.mutableMessages = config.initialMessages ?? []
    this.abortController = config.abortController ?? createAbortController()
    this.totalUsage = EMPTY_USAGE
  }
}
```

`QueryEngineConfig` 定义了引擎需要的一切：

```typescript
// src/QueryEngine.ts:130-173
export type QueryEngineConfig = {
  cwd: string                    // 工作目录
  tools: Tools                   // 可用工具集
  commands: Command[]            // 斜杠命令
  mcpClients: MCPServerConnection[]  // MCP 连接
  agents: AgentDefinition[]      // Agent 定义
  canUseTool: CanUseToolFn       // 权限检查函数
  getAppState: () => AppState    // 应用状态
  thinkingConfig?: ThinkingConfig // 思考模式配置
  maxTurns?: number              // 最大轮次
  maxBudgetUsd?: number          // 最大预算（美元）
  // ...
}
```

### 2. submitMessage() — 对话轮次入口

```typescript
// src/QueryEngine.ts:209-212
async *submitMessage(
  prompt: string | ContentBlockParam[],
  options?: { uuid?: string; isMeta?: boolean },
): AsyncGenerator<SDKMessage, void, unknown> {
```

注意返回类型是 `AsyncGenerator<SDKMessage>`——这是一个**异步生成器**，可以流式产出消息。这让调用方可以：
- 实时显示模型回复
- 逐步展示工具执行进度
- 在任意时刻中止

权限检查被包装为一层拦截器，追踪所有被拒绝的工具调用：

```typescript
// src/QueryEngine.ts:244-271
const wrappedCanUseTool: CanUseToolFn = async (tool, input, ...) => {
  const result = await canUseTool(tool, input, ...)
  // 追踪权限拒绝，用于 SDK 报告
  if (result.behavior !== 'allow') {
    this.permissionDenials.push({
      tool_name: sdkCompatToolName(tool.name),
      tool_use_id: toolUseID,
      tool_input: input,
    })
  }
  return result
}
```

### 3. query() 函数 — 核心循环

文件路径: `src/query.ts`

这是真正的 Agent 循环所在。对比教学版：

**教学版 (learn-claude-code, 30 行)：**
```python
def agent_loop(messages):
    while True:
        response = client.messages.create(model=MODEL, messages=messages, tools=TOOLS)
        messages.append({"role": "assistant", "content": response.content})
        if response.stop_reason != "tool_use":
            return
        results = []
        for block in response.content:
            if block.type == "tool_use":
                output = TOOL_HANDLERS[block.name](**block.input)
                results.append({"type": "tool_result", "tool_use_id": block.id, "content": output})
        messages.append({"role": "user", "content": results})
```

**生产版 (query.ts, 67KB) 在同样的循环上叠加了：**

| 层 | 功能 | 教学版 | 生产版 |
|----|------|--------|--------|
| API 调用 | 模型请求 | 同步调用 | 流式 + 重试 + fallback 模型 |
| 工具执行 | 运行工具 | 直接调用 handler | 权限检查 → 工具执行 → 进度上报 |
| 消息管理 | 追加结果 | 简单 append | 规范化 + 截断 + 微压缩 |
| 上下文 | 发送给模型 | 原始 messages | 自动压缩 + 上下文折叠 + 附件 |
| 停止条件 | 循环退出 | `stop_reason` | + maxTurns + maxBudget + abort |
| 错误处理 | 异常 | 无 | 分类重试 + prompt-too-long 恢复 |
| 可观测性 | 监控 | 无 | 事件日志 + Token 统计 + profiler |

`query.ts` 中的关键导入揭示了它的复杂性：

```typescript
// src/query.ts:8-13
import { calculateTokenWarningState, isAutoCompactEnabled } from './services/compact/autoCompact.js'
import { buildPostCompactMessages } from './services/compact/compact.js'
// 条件编译：响应式压缩和上下文折叠
const reactiveCompact = feature('REACTIVE_COMPACT') ? require('./services/compact/reactiveCompact.js') : null
const contextCollapse = feature('CONTEXT_COLLAPSE') ? require('./services/contextCollapse/index.js') : null
```

### 4. 消息类型系统

文件路径: `src/types/message.ts`

生产版的消息不是简单的 `{role, content}`，而是一个**联合类型**：

```
Message = UserMessage
        | AssistantMessage
        | SystemMessage
        | AttachmentMessage
        | ProgressMessage
        | ToolUseSummaryMessage
        | TombstoneMessage        // 被压缩删除的消息的墓碑
        | SystemLocalCommandMessage
```

每种消息类型携带不同的元数据（Token 使用、时间戳、工具调用摘要等），这些是压缩和持久化的基础。

## 关键设计决策

| 决策 | 原因 |
|------|------|
| `AsyncGenerator` 返回类型 | 流式输出 + 可中止 |
| QueryEngine 类而非裸函数 | 跨轮次状态持久化 |
| `canUseTool` 注入而非硬编码 | REPL/SDK/headless 不同权限策略 |
| 消息类型联合 | 压缩、持久化、UI 渲染各需不同元数据 |

## 实践练习

1. **理解 QueryEngineConfig**：打开 `src/QueryEngine.ts:130-173`，列出所有配置项，分类标记哪些是必需的、哪些是可选的
2. **对比教学版与生产版**：打开 `src/query.ts`，搜索 `stop_reason`，找到循环退出的所有条件（不只是 `!= "tool_use"`）
3. **追踪一次工具调用**：从 `query.ts` 中找到 `tool_use` 处理逻辑，追踪到 `canUseTool` → `tool.call()` → `tool_result` 的完整路径
