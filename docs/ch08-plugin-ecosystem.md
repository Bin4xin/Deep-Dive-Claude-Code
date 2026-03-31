# Ch09: 插件生态 — 可扩展的能力边界

`Ch01 > Ch02 > Ch03 > Ch04 > Ch05 > Ch06 | Ch07 > Ch08 > [ Ch09 ] Ch10 > Ch11 > Ch12`

> *"插件是 Agent 能力的乘法器——社区的力量远大于任何团队"*

## 问题

MCP 解决了工具标准化，但还有更多扩展需求：自定义斜杠命令、自定义输出样式、自定义 Agent 人格、LSP 集成……这些不是单纯的"工具"，需要一个更通用的扩展机制。

## 架构图

```
插件来源:
  ├── 官方市场 (officialMarketplace.ts)
  ├── Git 仓库 (npm/GitHub)
  ├── 本地目录
  └── DXT 打包格式 (dxt/)

       pluginLoader.ts (108KB)
              |
    ┌─────────┼─────────────────────────┐
    │         v                         │
    │   验证 (validatePlugin.ts 28KB)   │
    │   ├── Schema 检查                 │
    │   ├── 权限审核                    │
    │   └── 版本兼容性                  │
    │         |                         │
    │         v                         │
    │   加载插件能力:                    │
    │   ├── MCP 服务器 → 工具           │
    │   ├── 斜杠命令                    │
    │   ├── Agent 人格                  │
    │   ├── Hook (前置/后置)            │
    │   ├── 输出样式                    │
    │   └── LSP 配置                    │
    │         |                         │
    │         v                         │
    │   注入到 Agent 运行时             │
    └───────────────────────────────────┘
```

## 源码导读

### 关键文件索引

```
utils/plugins/
├── pluginLoader.ts              (108KB) — 插件加载核心
├── marketplaceManager.ts        (91KB)  — 插件市场
├── schemas.ts                   (58KB)  — 插件 Schema 定义
├── installedPluginsManager.ts   (40KB)  — 已安装插件管理
├── loadPluginCommands.ts        (30KB)  — 加载斜杠命令
├── mcpbHandler.ts               (31KB)  — MCP 插件处理
├── validatePlugin.ts            (28KB)  — 插件验证
├── loadPluginAgents.ts          (12KB)  — 加载 Agent 定义
├── loadPluginHooks.ts           (10KB)  — 加载 Hook
├── pluginInstallationHelpers.ts (20KB)  — 安装辅助
└── pluginDirectories.ts         (7KB)   — 目录管理
```

### 插件能力类型

| 能力 | 说明 | 加载文件 |
|------|------|----------|
| MCP 工具 | 通过 MCP 协议提供新工具 | `mcpbHandler.ts` |
| 斜杠命令 | `/my-command` 自定义命令 | `loadPluginCommands.ts` |
| Agent 定义 | 自定义 Agent 人格和行为 | `loadPluginAgents.ts` |
| Hook | 工具执行前后的拦截器 | `loadPluginHooks.ts` |
| 输出样式 | 自定义终端输出格式 | `loadPluginOutputStyles.ts` |
| LSP 配置 | 语言服务器配置 | `lspPluginIntegration.ts` |

### Skill 系统

文件路径: `src/utils/frontmatterParser.ts` (12KB)

Skill 是轻量级的知识注入：一个 Markdown 文件（带 frontmatter），按需通过 `tool_result` 注入到上下文。这与 learn-claude-code s05 的设计完全一致。

## 关键设计决策

| 决策 | 原因 |
|------|------|
| 多种加载来源 | 官方市场 + Git + 本地，降低插件创作门槛 |
| 严格验证 | Schema + 权限 + 版本，保证插件安全 |
| 多种能力类型 | 不只是工具，还有命令/Hook/样式/Agent |
| DXT 打包格式 | 标准化分发，类似 VS Code 的 `.vsix` |

## 实践练习

1. **查看插件 Schema**：打开 `src/utils/plugins/schemas.ts`，了解一个插件需要声明哪些元数据
2. **追踪插件加载流程**：从 `src/utils/plugins/pluginLoader.ts` 的入口函数开始，追踪一个插件从发现到注入的完整路径
3. **对比 Skill 与 Plugin**：Skill (`frontmatterParser.ts`) 和 Plugin (`pluginLoader.ts`) 有什么区别？什么时候用哪个？
