# Ch03: 提示词工程 — 动态组装的 System Prompt

`Ch01 > Ch02 > [ Ch03 ] Ch04 > Ch05 > Ch06 | Ch07 > Ch08 > Ch09 > Ch10 > Ch11 > Ch12`

> *"System Prompt 不是一个字符串，而是一个动态组装的管线"*

## 问题

教学版 Agent 的 system prompt 是一行字符串。但生产级 Agent 需要根据上下文动态调整：不同的模型能力不同、不同的工具集需要不同的指令、用户项目有自定义规则（CLAUDE.md）、MCP 服务器提供额外指令……如何把这些拼成一个连贯的 prompt？

## 架构图

```
System Prompt 组装管线:

┌─────────────────────────────────────────────────────┐
│                 getSystemPrompt()                    │
│                 constants/prompts.ts                 │
│                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ 核心身份     │  │ 工具使用规则  │  │ 安全约束   │ │
│  │ "你是       │  │ 每个工具的    │  │ 不允许做   │ │
│  │  Claude"    │  │ 使用指南      │  │ 什么       │ │
│  └──────┬──────┘  └──────┬───────┘  └─────┬──────┘ │
│         └────────────────┼─────────────────┘        │
│                          v                           │
│                   基础 prompt 数组                    │
└──────────────────────────┬──────────────────────────┘
                           |
           ┌───────────────┼───────────────┐
           v               v               v
    ┌────────────┐  ┌────────────┐  ┌────────────────┐
    │ CLAUDE.md  │  │ MCP 服务器  │  │ User Context   │
    │ 项目规则   │  │ 附加指令    │  │ 环境/模型/     │
    │ (claudemd  │  │             │  │ 工作区信息     │
    │  .ts 45KB) │  │             │  │                │
    └─────┬──────┘  └──────┬─────┘  └───────┬────────┘
          └────────────────┼─────────────────┘
                           v
                   最终 system prompt
                   (以数组形式传给 API)
```

## 源码导读

### 1. prompts.ts — 核心 Prompt 构建器 (53KB)

文件路径: `src/constants/prompts.ts`

这是整个项目最重要的文件之一。`getSystemPrompt()` 函数组装完整的 system prompt：

```typescript
// 调用方式 (src/entrypoints/cli.tsx:67)
const prompt = await getSystemPrompt([], model);
```

Prompt 以**数组**形式构建（不是单个字符串），便于后续拼接和操作。

### 2. CLAUDE.md — 项目级配置

文件路径: `src/utils/claudemd.ts` (45KB)

CLAUDE.md 是 Claude Code 的杀手级功能——用户在项目根目录放一个 Markdown 文件，就能自定义 Agent 行为：

```markdown
# CLAUDE.md 示例
- 使用 pnpm 而不是 npm
- 代码风格：使用 4 空格缩进
- 提交信息格式：feat(scope): description
```

`claudemd.ts` 负责：
- 多级查找：项目根目录 → 父目录 → 用户全局 → 团队共享
- 支持 `@include` 语法引入其他文件
- 解析 frontmatter 元数据
- 安全过滤（防止注入攻击）

### 3. messages.ts — 消息构建 (189KB)

文件路径: `src/utils/messages.ts`

这是项目第二大的文件。负责构建发送给 API 的消息，包括：

- `createSystemMessage()` — 系统消息
- `createUserMessage()` — 用户消息
- `normalizeMessagesForAPI()` — 消息规范化（处理各种边界情况）
- `getMessagesAfterCompactBoundary()` — 压缩后的消息裁剪
- `createToolUseSummaryMessage()` — 工具使用摘要
- `createMicrocompactBoundaryMessage()` — 微压缩边界

### 4. queryContext.ts — 上下文组装

文件路径: `src/utils/queryContext.ts`

`fetchSystemPromptParts()` 将各个来源的 prompt 片段组装在一起：

```typescript
// src/QueryEngine.ts:288-299
const {
  defaultSystemPrompt,
  userContext: baseUserContext,
  systemContext,
} = await fetchSystemPromptParts({
  tools,
  mainLoopModel: initialMainLoopModel,
  additionalWorkingDirectories: [...],
  mcpClients,
  customSystemPrompt: customPrompt,
})
```

返回三部分：
- `defaultSystemPrompt` — 核心 prompt
- `userContext` — 用户相关上下文（注入到 user 消息中）
- `systemContext` — 系统上下文（追加到 system prompt 末尾）

## System Prompt 的分层设计

```
第 1 层: 核心身份 (不变)
  "你是 Claude，一个 AI 编程助手..."
  "你有以下工具可用..."

第 2 层: 工具指令 (根据工具集变化)
  "使用 Bash 工具时..."
  "使用 FileEdit 工具时..."
  每个工具的 prompt.ts 文件提供自己的使用指南

第 3 层: 项目规则 (根据 CLAUDE.md 变化)
  用户定义的编码规范、构建命令等

第 4 层: 环境上下文 (每次变化)
  当前工作目录、Git 分支、操作系统、模型名称
  MCP 服务器提供的附加指令
```

## 关键设计决策

| 决策 | 原因 |
|------|------|
| Prompt 以数组而非字符串存储 | 便于分段操作、缓存、统计 Token |
| 每个工具有独立的 `prompt.ts` | 工具增删不影响核心 prompt |
| CLAUDE.md 多级查找 | monorepo 子目录可以有不同的规则 |
| User Context 与 System Prompt 分离 | User Context 注入到 user 消息，不占系统 prompt 的 cache 位置 |

## 实践练习

1. **查看工具 Prompt**：打开 `src/tools/BashTool/prompt.ts` 和 `src/tools/FileEditTool/prompt.ts`，对比两个工具的使用指南有什么不同
2. **理解 CLAUDE.md 解析**：在源码仓库根目录创建一个 `CLAUDE.md`，然后在 `src/utils/claudemd.ts` 中找到解析逻辑
3. **追踪 Prompt 组装**：从 `QueryEngine.ts` 的 `fetchSystemPromptParts()` 开始，追踪到 `prompts.ts` 的 `getSystemPrompt()`，画出完整的数据流
