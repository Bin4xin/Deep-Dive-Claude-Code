# Ch07: 上下文管理 — 在有限窗口内做无限的事

`Ch01 > Ch02 > Ch03 > Ch04 > Ch05 > Ch06 | [ Ch07 ] Ch08 > Ch09 > Ch10 > Ch11 > Ch12`

> *"上下文总会满，关键是什么时候压缩、怎么压缩、压缩后怎么恢复记忆"*

## 问题

模型上下文窗口有限（128K-200K tokens）。一个长对话很快就会被工具输出撑满——读一个大文件 50K tokens，执行几次 grep 又 30K tokens。当上下文满了，要么丢失早期信息，要么直接报错。

## 架构图

```
消息列表增长过程:

Turn 1:  [user] [assistant] [tool_result]                    ~5K tokens
Turn 5:  [user] [assistant] [tool×3] [assistant] [tool×2]   ~30K tokens
Turn 10: [...很多工具输出...]                                ~80K tokens
Turn 15: [...接近上限...]                                    ~120K tokens ⚠️
                                                              |
         三层压缩策略自动介入:                                 |
         ================================                      |
                                                              v
Layer 1: 微压缩 (microCompact)          ← 单条消息级别
         截断过长的工具输出
         e.g. 50K 的文件内容 → 保留前后 + 摘要

Layer 2: 自动压缩 (autoCompact)         ← 会话级别
         Token 超过阈值时触发
         用模型总结前半段对话 → 替换为压缩摘要

Layer 3: 会话记忆 (SessionMemory)       ← 跨压缩级别
         压缩前提取关键记忆
         压缩后重新注入
         + "做梦" (autoDream) 后台整合

压缩后的消息列表:
[compact_boundary] [memory_injection] [recent_messages...]
```

## 源码导读

### 1. 自动压缩 — autoCompact.ts (13KB)

文件路径: `src/services/compact/autoCompact.ts`

压缩触发条件：

```typescript
// Token 使用量超过阈值时触发
// TOKEN_THRESHOLD 在 s_full.py 中是 100000
// 生产版有更精细的计算
function calculateTokenWarningState(usage) {
  // 根据当前 token 使用量计算告警级别
  // warning → auto-compact → forced-compact
}
```

### 2. 压缩执行 — compact.ts (59KB)

文件路径: `src/services/compact/compact.ts`

这是上下文管理的核心。`buildPostCompactMessages()` 负责构建压缩后的消息列表：

```typescript
// src/query.ts:13 — 在查询循环中使用
import { buildPostCompactMessages } from './services/compact/compact.js'
```

压缩策略：
1. 找到压缩边界（保留最近 N 条消息）
2. 将边界前的消息发给模型做摘要
3. 用摘要替换原始消息
4. 插入 `compact_boundary` 标记

### 3. 微压缩 — microCompact.ts (19KB)

文件路径: `src/services/compact/microCompact.ts`

微压缩发生在**单条消息级别**，不需要 API 调用：

```typescript
// src/query.ts:54 — 微压缩边界标记
import { createMicrocompactBoundaryMessage } from './utils/messages.js'
```

例如一个 50K token 的文件内容，微压缩会：
- 保留前 1000 行
- 保留后 100 行
- 中间替换为 `... (N lines omitted) ...`

### 4. 会话记忆 — SessionMemory/

文件路径: `src/services/SessionMemory/`

```
SessionMemory/
├── sessionMemory.ts       (16KB) — 记忆管理
├── sessionMemoryUtils.ts  (6KB)  — 辅助函数
└── prompts.ts             (12KB) — 记忆提取 prompt
```

在压缩之前，系统会提取关键记忆（用户偏好、重要决策、进度信息），压缩后重新注入。

### 5. 做梦 — autoDream/

文件路径: `src/services/autoDream/`

```
autoDream/
├── autoDream.ts           (11KB) — 做梦逻辑
├── config.ts              (1KB)  — 配置
├── consolidationLock.ts   (4KB)  — 防止并发
└── consolidationPrompt.ts (3KB)  — 整合提示词
```

"做梦"是一个**后台异步操作**——在用户空闲时，系统用 API 调用将散落的记忆片段整合为连贯的知识。类似人类睡眠时的记忆整合。

### 6. 上下文分析 — analyzeContext.ts (42KB)

文件路径: `src/utils/analyzeContext.ts`

分析当前上下文的 token 分布，决定裁剪策略：

- 哪些工具输出最占空间？
- 哪些消息可以安全删除？
- 系统 prompt 占多少比例？

## 关键设计决策

| 决策 | 原因 |
|------|------|
| 三层分级压缩 | 微压缩无 API 开销、自动压缩有、做梦在后台 |
| 压缩边界标记 | 让后续代码知道哪些消息是压缩后的 |
| 记忆跨压缩保持 | 防止压缩导致 Agent "失忆" |
| 后台做梦 | 不阻塞用户交互 |

## 实践练习

1. **查找压缩阈值**：在 `src/services/compact/autoCompact.ts` 中找到 Token 阈值是如何计算的
2. **理解微压缩**：在 `src/services/compact/microCompact.ts` 中找到工具输出截断逻辑
3. **追踪记忆注入**：从 `src/services/SessionMemory/sessionMemory.ts` 找到记忆在压缩后如何被重新注入到消息列表
