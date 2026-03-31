# Ch05: Shell 安全体系 — 300KB+ 的安全验证代码

`Ch01 > Ch02 > Ch03 > Ch04 > [ Ch05 ] Ch06 | Ch07 > Ch08 > Ch09 > Ch10 > Ch11 > Ch12`

> *"最强大的工具需要最严密的防护——BashTool 是能力的天花板，也是安全的最大敌人"*

## 问题

教学版只用一个简单的黑名单拦截危险命令：`if any(d in command for d in ["rm -rf /", "sudo"])`。但真实世界中，用户可能通过变量替换、管道组合、编码绕过等方式突破黑名单。如何在不过度限制模型能力的前提下，防止危险操作？

## 架构图

```
用户请求 "运行 bash 命令"
        |
        v
BashTool.tsx (157KB)
        |
        ├──(1) 模式验证 ─────── modeValidation.ts
        │   "plan 模式下禁止执行"
        │
        ├──(2) 安全分类 ─────── bashSecurity.ts (100KB)
        │   命令 → [safe | readonly | destructive | dangerous]
        │   基于 AST 解析、模式匹配、命令语义分析
        │
        ├──(3) 权限判定 ─────── bashPermissions.ts (96KB)
        │   安全级别 × 权限模式 → [allow | deny | ask]
        │
        ├──(4) 只读验证 ─────── readOnlyValidation.ts (67KB)
        │   确保"只读"命令真的只读
        │
        ├──(5) 路径验证 ─────── pathValidation.ts (43KB)
        │   工作区沙箱 + 路径遍历防护
        │
        ├──(6) sed 验证 ──────── sedValidation.ts (21KB)
        │   sed 命令的特殊安全处理
        │
        └──(7) AI 分类器 ────── yoloClassifier.ts (51KB)
            让模型自己判断命令安全性
            （用于 "auto-accept" 模式）

        总计: 300KB+ 安全相关代码
```

## 源码导读

### 1. 安全分类引擎 — bashSecurity.ts (100KB)

这是核心中的核心。将每条命令分类为安全等级：

```
safe        → 只读操作（ls, cat, grep, git status）
readonly    → 明确无副作用（head, tail, wc, diff）
destructive → 有副作用但可控（mkdir, touch, git commit）
dangerous   → 高风险操作（rm -rf, chmod 777, curl | sh）
```

分类不是简单的字符串匹配——它基于对命令的**语义分析**：

- 解析管道：`cat file | grep pattern` → 最终命令是 grep（safe）
- 识别重定向：`echo hello > file` → 有写操作（destructive）
- 跟踪变量：`CMD="rm -rf /"; $CMD` → 检测变量展开
- 分析命令组合：`&&`, `||`, `;` 分割后逐个分析

### 2. Bash 命令 AST 解析

文件路径: `src/utils/bash/` 目录

这个子目录包含了一个完整的 **Bash 命令解析器**：

```
bash/
├── ast.ts              (109KB) — AST 节点定义
├── bashParser.ts       (128KB) — 递归下降解析器
├── commands.ts         (50KB)  — 命令语义数据库
├── bashPipeCommand.ts  (10KB)  — 管道命令处理
├── heredoc.ts          (31KB)  — Here-document 解析
├── shellQuote.ts       (11KB)  — Shell 引号处理
└── treeSitterAnalysis.ts (17KB) — Tree-sitter 集成
```

是的，Claude Code 内置了一个 **Bash 解析器**（128KB），将命令解析为 AST 后做安全分析。这不是简单的正则匹配。

### 3. 权限模式 — 用户可配置的安全等级

文件路径: `src/utils/permissions/PermissionMode.ts`

```typescript
// 三种权限模式：
type PermissionMode =
  | 'default'        // 默认：破坏性操作需要确认
  | 'plan'           // 计划模式：只能思考，不能执行
  | 'bypassPermissions' // 全自动模式（危险！）
```

### 4. YOLO 分类器 — 让 AI 判断安全性

文件路径: `src/utils/permissions/yoloClassifier.ts` (51KB)

在 "auto-accept" 模式下，系统用另一次 AI 调用来判断命令是否安全：

```
用户请求 → BashTool 想执行命令 → 发给 yoloClassifier
                                        |
                             "这条命令安全吗？"
                                        |
                               <thinking>
                               分析命令语义...
                               检查副作用...
                               </thinking>
                                        |
                              safe / unsafe
```

这是一个**用 AI 审核 AI** 的设计——主循环的 AI 生成命令，另一个 AI 评估命令的安全性。

## 关键设计决策

| 决策 | 原因 |
|------|------|
| 内置 Bash 解析器 | 正则无法处理嵌套引号、变量展开、管道组合 |
| 多层验证而非单点检查 | 每一层捕获不同类型的风险 |
| AI 辅助分类 | 命令语义无穷无尽，规则无法穷举 |
| 默认拒绝未知 | 安全第一，宁可误杀不可漏放 |

## 实践练习

1. **阅读命令数据库**：打开 `src/utils/bash/commands.ts` (50KB)，看看它收录了多少命令的安全元数据
2. **追踪一条命令的验证路径**：假设模型想执行 `rm -rf node_modules`，从 `BashTool.tsx` 开始追踪它经过哪些安全检查
3. **理解 AST 解析**：打开 `src/utils/bash/bashParser.ts`，找到解析管道命令（`|`）的逻辑
