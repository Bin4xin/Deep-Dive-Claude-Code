# Ch01: 启动流程 — 从按下回车到看到提示符

`[ Ch01 ] Ch02 > Ch03 > Ch04 > Ch05 > Ch06 | Ch07 > Ch08 > Ch09 > Ch10 > Ch11 > Ch12`

> *"快速路径决定用户体验，完整路径决定系统能力"*

## 问题

CLI 工具的第一印象来自启动速度。`claude --version` 应该瞬间返回，但完整的 REPL 需要加载数百个模块、初始化认证、连接 MCP 服务器。如何让两者共存？

## 架构图

```
bun run dev
    |
    v
dev-entry.ts                          (还原版入口)
    |  扫描 src/ 和 vendor/ 的缺失导入
    |  缺失=0 时转发到 cli.tsx
    v
entrypoints/cli.tsx                    (快速路径分发)
    |
    ├── --version         → console.log(MACRO.VERSION)   [零模块加载]
    ├── --dump-system-prompt → 动态导入 prompts.ts        [最小加载]
    ├── --claude-in-chrome-mcp → Chrome MCP 服务器
    ├── --daemon-worker   → 守护进程工作线程
    └── (其他)            → 动态导入 main.tsx             [完整加载]
                               |
                               v
main.tsx (785KB)
    |  并行预取: MDM配置 + Keychain凭证 + GrowthBook
    |  Commander.js 参数解析
    |  init() 初始化链
    v
  REPL 启动
```

## 源码导读

### 1. dev-entry.ts — 还原版启动守卫 (146 行)

文件路径: `src/dev-entry.ts`

这个文件是还原版专有的。它解决一个问题：source map 还原的源码可能有缺失的模块，直接启动会崩溃。

```typescript
// src/dev-entry.ts:26-29
// 注入编译时宏，正式版由 bun:bundle 在构建时内联
if (!('MACRO' in globalThis)) {
  (globalThis as typeof globalThis & { MACRO: MacroConfig }).MACRO = defaultMacro
}
```

`collectMissingRelativeImports()` 递归扫描所有 `.ts/.tsx` 文件，用正则匹配相对导入，检查目标文件是否存在：

```typescript
// src/dev-entry.ts:73-74
const pattern =
  /(?:import|export)\s+[\s\S]*?from\s+['"](\.\.?\/[^'"]+)['"]|require\(\s*['"](\.\.?\/[^'"]+)['"]\s*\)/g
```

缺失导入为 0 时，才转发到真正的入口：

```typescript
// src/dev-entry.ts:145
await import('./entrypoints/cli.tsx')
```

### 2. cli.tsx — 快速路径分发 (303 行)

文件路径: `src/entrypoints/cli.tsx`

核心设计思想：**按需加载**。`--version` 不需要任何模块，只读编译时常量：

```typescript
// src/entrypoints/cli.tsx:37-42
if (args.length === 1 && (args[0] === '--version' || args[0] === '-v')) {
  // MACRO.VERSION 在构建时内联，零运行时导入
  console.log(`${MACRO.VERSION} (Claude Code)`);
  return;
}
```

其他路径全部使用 **动态 `import()`**，避免在快速路径上加载无关模块：

```typescript
// src/entrypoints/cli.tsx:45-48
// 只有非 --version 路径才加载 startupProfiler
const { profileCheckpoint } = await import('../utils/startupProfiler.js');
profileCheckpoint('cli_entry');
```

`feature()` 宏实现**编译时功能消除**（Dead Code Elimination）：

```typescript
// src/entrypoints/cli.tsx:21-26
// feature('ABLATION_BASELINE') 在外部构建中被替换为 false
// 整个 if 块在构建时被删除，不进入最终产物
if (feature('ABLATION_BASELINE') && process.env.CLAUDE_CODE_ABLATION_BASELINE) {
  // 消融实验：禁用 thinking、compact、auto memory 等功能
}
```

### 3. main.tsx — 完整启动 (785KB, 4691 行)

文件路径: `src/main.tsx`

这是整个项目**最大的文件**。前 20 行包含了关键的性能优化——三个并行预取：

```typescript
// src/main.tsx:1-20
// 这些副作用必须在所有其他导入之前执行：
// 1. profileCheckpoint 标记入口时间
// 2. startMdmRawRead 启动 MDM 子进程（plutil/reg query），与后续 135ms 的导入并行
// 3. startKeychainPrefetch 并行读取 macOS 钥匙串（OAuth + API key），节省 ~65ms

import { profileCheckpoint } from './utils/startupProfiler.js';
profileCheckpoint('main_tsx_entry');

import { startMdmRawRead } from './utils/settings/mdm/rawRead.js';
startMdmRawRead();

import { startKeychainPrefetch } from './utils/secureStorage/keychainPrefetch.js';
startKeychainPrefetch();
```

**为什么把副作用放在 import 之间？** 因为 ES module 的 import 是顺序求值的。`startMdmRawRead()` 在第 16 行执行后，第 17-66 行的 import 还需要 ~135ms 来求值——这段时间 MDM 子进程已经在后台运行了。

## 关键设计决策

| 决策 | 原因 | 替代方案 |
|------|------|----------|
| `--version` 零加载 | 用户体验：瞬间返回 | 加载后输出（慢 200ms+） |
| 动态 `import()` | 快速路径不付完整加载的代价 | 顶层 import（所有路径都慢） |
| `feature()` 编译时消除 | 外部构建不包含内部功能代码 | 运行时 if 判断（代码仍在产物中） |
| 并行预取（MDM + Keychain） | 利用 import 求值时间做 I/O | 串行执行（启动慢 65ms+） |
| `require()` 延迟加载 | 打破循环依赖 | 重构依赖图（成本高） |

## 实践练习

1. **跟踪启动流程**：在 `dev-entry.ts` 第 98 行加 `console.time('startup')`，在 `cli.tsx` 进入 `main()` 前加 `console.timeEnd('startup')`，观察启动耗时
2. **查看缺失导入**：运行 `bun run version`，观察输出中是否有 `missing_relative_imports`
3. **理解 feature() 宏**：在源码中搜索 `feature(`，列出所有功能门控，思考哪些是内部功能、哪些是实验功能
