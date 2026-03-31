# Ch06: 文件操作与权限 — 每一次读写都经过权限检查

`Ch01 > Ch02 > Ch03 > Ch04 > Ch05 > [ Ch06 ] | Ch07 > Ch08 > Ch09 > Ch10 > Ch11 > Ch12`

> *"权限不是事后添加的功能，而是架构的骨架"*

## 问题

AI Agent 可以读写任意文件。如何防止它读取 `/etc/passwd`、修改 `~/.ssh/authorized_keys`、或者覆盖用户没有让它动的代码？

## 架构图

```
文件操作请求
    |
    v
┌─────────────────────────────────────────────┐
│           permissions/permissions.ts (51KB)   │
│                                               │
│  PermissionRule[] (来自 CLAUDE.md + 设置)     │
│  ┌─────────────────────────────────────────┐ │
│  │ Allow: ["src/**", "tests/**"]           │ │
│  │ Deny:  [".env", "*.key", "/etc/**"]     │ │
│  │ Ask:   ["package.json", "*.config.*"]   │ │
│  └─────────────────────────────────────────┘ │
└──────────────────┬──────────────────────────┘
                   |
                   v
┌─────────────────────────────────────────────┐
│        permissions/filesystem.ts (61KB)       │
│                                               │
│  路径验证:                                    │
│  ├── 相对于工作区？                           │
│  ├── 命中 deny 规则？                         │
│  ├── 命中 allow 规则？                        │
│  └── 需要询问用户？                           │
│                                               │
│  路径规范化:                                  │
│  ├── 解析符号链接                             │
│  ├── 防止 ../ 遍历                            │
│  └── Windows/macOS/Linux 路径统一             │
└──────────────────┬──────────────────────────┘
                   |
          allow / deny / ask
                   |
                   v
┌─────────────────────────────────────────────┐
│       fsOperations.ts (24KB) — 抽象层        │
│                                               │
│  readFileSync()   writeFileSync()             │
│  copyFileSync()   unlinkSync()                │
│  renameSync()     mkdirSync()                 │
│  readdirSync()                                │
│                                               │
│  所有 fs 操作都通过这个抽象层                 │
│  便于测试、mock、权限拦截                     │
└───────────────────────────────────────────── ┘
```

## 源码导读

### 1. 权限引擎 — permissions.ts (51KB)

文件路径: `src/utils/permissions/permissions.ts`

权限规则支持 glob 模式匹配：

```typescript
// 规则示例（来自 CLAUDE.md 或用户设置）
// allow: "src/**"          → 允许操作 src 下所有文件
// deny: ".env"             → 禁止操作 .env
// ask: "package.json"      → 修改 package.json 时询问用户
```

### 2. 文件系统权限 — filesystem.ts (61KB)

文件路径: `src/utils/permissions/filesystem.ts`

这是权限系统中最大的文件，处理：
- 工作区边界检查（文件必须在允许的目录内）
- Scratchpad 目录（Agent 的专属临时目录）
- 附加工作目录管理
- 符号链接安全（防止通过软链逃逸沙箱）

### 3. 文件操作抽象 — fsOperations.ts (24KB)

文件路径: `src/utils/fsOperations.ts`

所有文件系统操作都经过统一抽象：

```typescript
// src/utils/fsOperations.ts — 接口定义
interface FsOperations {
  readFileSync(path: string, options?: { encoding?: string }): string | Buffer
  writeFileSync(path: string, data: string | Buffer): void
  copyFileSync(src: string, dest: string): void
  unlinkSync(path: string): void
  renameSync(oldPath: string, newPath: string): void
  mkdirSync(path: string, options?: { recursive?: boolean }): void
  readdirSync(path: string): Dirent[]
}
```

### 4. 文件操作工具

| 工具 | 文件 | 大小 | 功能 |
|------|------|------|------|
| FileReadTool | `tools/FileReadTool/FileReadTool.ts` | 38KB | 读取文件（支持范围读取、图片处理） |
| FileEditTool | `tools/FileEditTool/FileEditTool.ts` | 20KB | 精确文本替换（old_text → new_text） |
| FileWriteTool | `tools/FileWriteTool/FileWriteTool.ts` | 15KB | 创建/覆写文件 |

FileEditTool 的 diff 算法（`tools/FileEditTool/utils.ts`, 22KB）确保替换的精确性，避免误改。

### 5. 子进程环境清洗

文件路径: `src/utils/subprocessEnv.ts` (4KB)

当 Agent 生成子进程时，敏感环境变量会被清除：

```typescript
// src/utils/subprocessEnv.ts:17-31 — 清洗列表
const SENSITIVE_VARS = [
  'ANTHROPIC_API_KEY',
  'AWS_SECRET_ACCESS_KEY',
  // ... 更多敏感变量
]
```

这防止了 API Key 通过 `$ANTHROPIC_API_KEY` 在 bash 命令中被泄露。

## 关键设计决策

| 决策 | 原因 |
|------|------|
| 三级权限（allow/deny/ask） | 兼顾安全和效率 |
| Glob 模式匹配 | 用户友好，表达力强 |
| 文件操作抽象层 | 便于测试和权限拦截 |
| 环境变量清洗 | 防止 shell 扩展泄露密钥 |

## 实践练习

1. **查看权限规则解析器**：打开 `src/utils/permissions/permissionRuleParser.ts`，理解规则如何从配置变成运行时检查
2. **追踪 FileEditTool**：打开 `src/tools/FileEditTool/utils.ts`，找到 `old_text → new_text` 的匹配算法
3. **理解环境清洗**：在 `src/utils/subprocessEnv.ts` 中列出所有被清洗的环境变量
