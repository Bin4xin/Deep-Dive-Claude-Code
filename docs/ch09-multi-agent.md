# Ch10: 多 Agent 协作 — Agent/Team/Swarm

`Ch01 > Ch02 > Ch03 > Ch04 > Ch05 > Ch06 | Ch07 > Ch08 > Ch09 > [ Ch10 ] Ch11 > Ch12`

> *"规模化来自分工，不是来自更大的上下文窗口"*

## 问题

一个 Agent 的上下文是有限的。大型重构、多文件修改、需要不同专长的任务……一个 Agent 难以胜任。解法和人类一样：组建团队。

## 架构图

```
三层协作模型:

Layer 1: Subagent (一次性)
  ┌──────────┐     spawn      ┌──────────────┐
  │  Parent  │ ──────────────>│  Subagent    │
  │  Agent   │     summary    │  fresh ctx   │
  │          │ <──────────────│  执行后丢弃  │
  └──────────┘                └──────────────┘

Layer 2: Teammate (持久化)
  ┌──────────┐     spawn      ┌──────────────┐
  │   Lead   │ ──────────────>│  Teammate A  │──┐
  │  Agent   │                │  持久化线程  │  │ JSONL 邮箱
  │          │     spawn      ├──────────────┤  │
  │          │ ──────────────>│  Teammate B  │──┤
  │          │                │  持久化线程  │  │
  │          │ <──────────────│              │<─┘
  └──────────┘   消息通信      └──────────────┘

Layer 3: Swarm (自治)
  ┌─────────────────────────────────────────┐
  │           .tasks/ 任务看板               │
  │  task_1: pending (unclaimed)            │
  │  task_2: in_progress (owner: alice)     │
  │  task_3: completed                      │
  └─────────────────────────────────────────┘
        ↑              ↑              ↑
     自动认领        自动认领        自动认领
   ┌───────┐      ┌───────┐      ┌───────┐
   │ Alice │      │  Bob  │      │ Carol │
   │ WORK  │      │ IDLE  │      │ WORK  │
   │ → IDLE│      │ → 扫描 │      │       │
   │ → 扫描│      │ → 认领 │      │       │
   └───────┘      └───────┘      └───────┘
```

## 源码导读

### 1. AgentTool — 子代理生成器 (228KB)

文件路径: `src/tools/AgentTool/AgentTool.tsx`

这是整个项目**最大的工具**，负责：
- 生成子代理（fresh context）
- 管理子代理生命周期
- 收集子代理结果

```
tools/AgentTool/
├── AgentTool.tsx        (228KB) — 主实现
├── UI.tsx               (122KB) — 终端渲染
├── runAgent.ts          (35KB)  — Agent 运行逻辑
├── forkSubagent.ts      (8KB)   — fork 模式
├── loadAgentsDir.ts     (26KB)  — Agent 定义加载
├── prompt.ts            (16KB)  — Agent 提示词
└── built-in/                    — 内置 Agent 定义
    ├── exploreAgent.ts          — 代码探索 Agent
    ├── planAgent.ts             — 规划 Agent
    └── verificationAgent.ts     — 验证 Agent
```

### 2. 多 Agent 并行 — spawnMultiAgent.ts (35KB)

文件路径: `src/tools/shared/spawnMultiAgent.ts`

支持同时生成多个子代理并行执行不同任务。

### 3. 团队通信 — 邮箱系统

```
utils/
├── teammateMailbox.ts   (33KB) — 邮箱通信核心
├── teammate.ts          (9KB)  — Teammate 生命周期
├── teammateContext.ts   (3KB)  — 队友上下文
├── teamDiscovery.ts     (2KB)  — 团队发现
└── swarm/                      — Swarm 集群通信
    ├── reconnection.ts         — 重连逻辑
    ├── teammatePromptAddendum.ts — 队友提示词
    └── backends/               — 通信后端
```

### 4. 任务系统

文件路径: `src/tasks.ts` + `src/utils/tasks.ts` (26KB)

六种后台任务类型：
- **LocalShellTask** — 本地 Shell 任务
- **LocalAgentTask** — 本地 Agent 任务
- **RemoteAgentTask** — 远程 Agent 任务
- **DreamTask** — 记忆整合任务
- **LocalWorkflowTask** — 本地工作流
- **MonitorMcpTask** — MCP 监控任务

## 实践练习

1. **阅读内置 Agent**：打开 `src/tools/AgentTool/built-in/exploreAgent.ts`，了解"代码探索"Agent 的提示词和行为定义
2. **追踪团队消息流**：从 `src/tools/SendMessageTool/SendMessageTool.ts` 开始，追踪一条消息如何到达目标队友
3. **理解任务类型**：打开 `src/tasks.ts`，列出所有任务类型，思考为什么需要区分这么多种
