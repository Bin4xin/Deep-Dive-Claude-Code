# Ch04: 工具架构 — 50+ 工具的注册与分发

`Ch01 > Ch02 > Ch03 > [ Ch04 ] Ch05 > Ch06 | Ch07 > Ch08 > Ch09 > Ch10 > Ch11 > Ch12`

> *"注册一个 handler 就多一种能力，循环永远不变"*

## 问题

教学版用一个 `TOOL_HANDLERS` 字典实现工具分发。但 50+ 工具意味着 50+ 种权限策略、50+ 种 UI 渲染方式、50+ 种错误处理逻辑。如何让每个工具自包含、可测试、可独立演进？

## 架构图

```
src/tools.ts (注册中心)
    |
    |  getTools() → 收集所有工具实例
    |
    ├── BashTool          (157KB 主文件 + 安全子系统)
    ├── FileReadTool      (38KB)
    ├── FileEditTool      (20KB + 22KB utils)
    ├── FileWriteTool     (15KB)
    ├── GrepTool          (20KB)
    ├── GlobTool          (6KB)
    ├── AgentTool         (228KB — 子代理系统)
    ├── WebFetchTool      (9KB + 16KB utils)
    ├── WebSearchTool     (13KB)
    ├── TodoWriteTool     (4KB)
    ├── MCPTool           (动态 — 从 MCP 服务器加载)
    ├── SkillTool         (37KB)
    ├── TeamCreate/Delete (协作工具)
    ├── SendMessageTool   (27KB)
    ├── Task* (CRUD)      (任务管理工具组)
    ├── LSPTool           (25KB)
    └── ... (50+ 工具)

每个工具目录结构:
  tools/BashTool/
  ├── BashTool.tsx       # 主实现（继承 Tool 基类）
  ├── prompt.ts          # 该工具的 system prompt 片段
  ├── UI.tsx             # 终端渲染组件（React Ink）
  ├── constants.ts       # 工具名常量
  └── *.ts               # 安全验证、辅助函数等
```

## 源码导读

### 1. Tool 基类 — 工具的契约

文件路径: `src/Tool.ts` (29KB)

每个工具必须实现的接口（简化）：

```typescript
// src/Tool.ts 核心类型
export type ToolInputJSONSchema = {
  type: 'object'
  properties?: { [x: string]: unknown }
}

// 工具需要提供的能力：
// - name: 工具名
// - description: 给模型看的描述
// - input_schema: JSON Schema 参数定义
// - call(): 执行函数
// - prompt(): system prompt 中的使用指南
// - renderToolUseMessage(): UI 渲染
```

### 2. tools.ts — 注册中心

文件路径: `src/tools.ts` (17KB)

`getTools()` 函数收集所有工具。注意条件加载模式：

```typescript
// src/tools.ts:16-53 — 条件加载（编译时消除 + 运行时判断）
const REPLTool = process.env.USER_TYPE === 'ant'
  ? require('./tools/REPLTool/REPLTool.js').REPLTool : null

const SleepTool = feature('PROACTIVE') || feature('KAIROS')
  ? require('./tools/SleepTool/SleepTool.js').SleepTool : null

const cronTools = feature('AGENT_TRIGGERS')
  ? [CronCreateTool, CronDeleteTool, CronListTool] : []
```

团队协作工具用 `lazy require` 打破循环依赖：

```typescript
// src/tools.ts:63-72
const getTeamCreateTool = () =>
  require('./tools/TeamCreateTool/TeamCreateTool.js').TeamCreateTool
const getTeamDeleteTool = () =>
  require('./tools/TeamDeleteTool/TeamDeleteTool.js').TeamDeleteTool
const getSendMessageTool = () =>
  require('./tools/SendMessageTool/SendMessageTool.js').SendMessageTool
```

### 3. 工具分类

| 类别 | 工具 | 说明 |
|------|------|------|
| **文件系统** | FileRead, FileEdit, FileWrite, Glob, Grep | 代码操作核心 |
| **Shell** | BashTool, PowerShellTool | 命令执行（最复杂的安全面） |
| **搜索** | GrepTool, WebSearchTool, ToolSearchTool | 信息获取 |
| **网络** | WebFetchTool | URL 内容抓取 |
| **AI 子代理** | AgentTool | 子 Agent 生成（228KB） |
| **协作** | TeamCreate, TeamDelete, SendMessage | 多 Agent 通信 |
| **任务管理** | TaskCreate/Get/List/Update/Stop/Output | 任务 CRUD |
| **规划** | TodoWriteTool, EnterPlanMode, ExitPlanMode | 计划管理 |
| **IDE** | LSPTool, NotebookEditTool | 编辑器集成 |
| **MCP** | MCPTool, McpAuthTool, ListMcpResources | MCP 协议工具 |
| **Worktree** | EnterWorktree, ExitWorktree | Git worktree 隔离 |
| **其他** | SkillTool, ConfigTool, BriefTool, SleepTool | 辅助功能 |

### 4. 与 learn-claude-code 的 dispatch map 对比

```python
# learn-claude-code: 一个字典搞定
TOOL_HANDLERS = {
    "bash":       lambda **kw: run_bash(kw["command"]),
    "read_file":  lambda **kw: run_read(kw["path"]),
    "write_file": lambda **kw: run_write(kw["path"], kw["content"]),
}
```

```typescript
// Claude Code: 每个工具是一个类，拥有独立的：
// - 权限策略 (canUseTool)
// - UI 渲染 (renderToolUseMessage)
// - 系统提示 (prompt.ts)
// - 安全验证 (pathValidation, readOnlyValidation 等)
// - 进度上报 (ToolProgressData)
```

## 关键设计决策

| 决策 | 原因 |
|------|------|
| 每个工具一个目录 | 工具代码、prompt、UI、测试自包含 |
| 条件编译加载 | 外部构建不包含内部工具 |
| lazy require | 打破循环依赖（工具→状态→工具） |
| 工具 prompt 独立 | 增删工具不改核心 prompt |

## 实践练习

1. **统计工具数量**：在 `src/tools.ts` 中数一下 `getTools()` 返回了多少个工具
2. **阅读最简单的工具**：打开 `src/tools/GlobTool/GlobTool.ts` (6KB)，理解一个工具的最小实现
3. **对比最复杂的工具**：打开 `src/tools/BashTool/BashTool.tsx` (157KB) 和 `src/tools/AgentTool/AgentTool.tsx` (228KB)，思考为什么它们这么大
