/**
 * s12_production.ts — 生产级工程模式演示
 * 对应 Ch12: 从 Demo 到 Production
 * 演示: 错误分类重试 + 优雅关机 + 会话持久化 + A/B 测试
 * 运行: npx tsx agents/s12_production.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

// ============================================================
// 第 1 部分: 错误分类重试
// 真实源码: src/services/api/errors.ts (41KB) + withRetry.ts (28KB)
// ============================================================

type ErrorCategory = 'retryable' | 'prompt_too_long' | 'auth_error' | 'rate_limit' | 'unknown'

function categorizeError(statusCode: number, message: string): {
  category: ErrorCategory
  action: string
  retryAfter?: number
} {
  if (statusCode === 429) return { category: 'rate_limit', action: '指数退避重试', retryAfter: 30 }
  if (statusCode === 500 || statusCode === 502 || statusCode === 503) return { category: 'retryable', action: '立即重试 (最多 3 次)' }
  if (statusCode === 401) return { category: 'auth_error', action: '停止, 提示用户更新 API Key' }
  if (statusCode === 400 && message.includes('prompt is too long')) return { category: 'prompt_too_long', action: '自动触发压缩, 然后重试' }
  return { category: 'unknown', action: '记录错误并中止' }
}

// ============================================================
// 第 2 部分: 优雅关机
// 真实源码: src/utils/gracefulShutdown.ts (20KB)
// ============================================================

interface ShutdownStep { name: string; duration: string; description: string }

const SHUTDOWN_SEQUENCE: ShutdownStep[] = [
  { name: 'cancel_api_requests', duration: '0ms', description: '取消正在进行的 API 请求 (AbortController)' },
  { name: 'wait_tool_completion', duration: '≤5s', description: '等待工具执行完成 (有超时)' },
  { name: 'persist_session', duration: '~50ms', description: '将会话状态写入磁盘 (sessionStorage.ts 176KB)' },
  { name: 'close_mcp_connections', duration: '~100ms', description: '关闭所有 MCP 服务器连接' },
  { name: 'stop_background_tasks', duration: '~10ms', description: '停止后台任务 (DreamTask 等)' },
  { name: 'flush_analytics', duration: '~200ms', description: '发送缓冲的分析事件 (Datadog/GrowthBook)' },
  { name: 'restore_terminal', duration: '0ms', description: '恢复终端状态 (光标/原始模式/Alt Screen)' },
]

// ============================================================
// 第 3 部分: 会话持久化
// 真实源码: src/utils/sessionStorage.ts (176KB)
// ============================================================

interface SessionData {
  id: string; cwd: string; model: string; startTime: number
  messages: any[]; usage: { input: number; output: number }
  metadata: { gitBranch?: string; os: string }
}

function persistSession(session: SessionData): string {
  const dir = path.join(os.homedir(), '.claude', 'sessions')
  const filepath = path.join(dir, `${session.id}.json`)
  // 真实代码会写入磁盘, 这里只模拟
  return filepath
}

// ============================================================
// 第 4 部分: Feature Flag / A/B 测试
// 真实源码: src/services/analytics/growthbook.ts (40KB)
// ============================================================

interface FeatureFlag { name: string; type: 'compile_time' | 'runtime_ab'; enabled: boolean; description: string }

const FEATURE_FLAGS: FeatureFlag[] = [
  { name: 'ABLATION_BASELINE', type: 'compile_time', enabled: false, description: '消融实验基线 (内部)' },
  { name: 'COORDINATOR_MODE', type: 'compile_time', enabled: false, description: '协调器模式' },
  { name: 'REACTIVE_COMPACT', type: 'compile_time', enabled: true, description: '响应式压缩' },
  { name: 'CONTEXT_COLLAPSE', type: 'compile_time', enabled: true, description: '上下文折叠' },
  { name: 'new_compact_strategy', type: 'runtime_ab', enabled: true, description: '新压缩策略 (A/B)' },
  { name: 'extended_thinking_v2', type: 'runtime_ab', enabled: false, description: '扩展思考 v2 (A/B)' },
  { name: 'tool_parallelism', type: 'runtime_ab', enabled: true, description: '工具并行执行 (A/B)' },
]

// ============================================================
// 主程序
// ============================================================

function main() {
  console.log('╔══════════════════════════════════════════════════════╗')
  console.log('║  s12: Claude Code 生产级工程模式演示                  ║')
  console.log('║  错误重试 + 优雅关机 + 持久化 + A/B 测试           ║')
  console.log('╚══════════════════════════════════════════════════════╝\n')

  // 1. 错误分类重试
  console.log('━━━ 1. API 错误分类重试 (errors.ts 41KB + withRetry.ts 28KB) ━━━\n')
  const errorCases: [number, string][] = [
    [429, 'rate_limit_error'],
    [500, 'internal_server_error'],
    [401, 'authentication_error'],
    [400, 'prompt is too long'],
    [502, 'bad_gateway'],
    [418, 'unknown_error'],
  ]
  for (const [code, msg] of errorCases) {
    const result = categorizeError(code, msg)
    const color = result.category === 'retryable' || result.category === 'rate_limit' ? '\x1b[33m' : result.category === 'prompt_too_long' ? '\x1b[36m' : '\x1b[31m'
    console.log(`  HTTP ${code} "${msg}"`)
    console.log(`    ${color}→ ${result.category}: ${result.action}\x1b[0m${result.retryAfter ? ` (${result.retryAfter}s 后)` : ''}\n`)
  }

  // 2. 优雅关机
  console.log('━━━ 2. 优雅关机序列 (gracefulShutdown.ts 20KB) ━━━\n')
  console.log('  SIGINT/SIGTERM 触发:')
  for (let i = 0; i < SHUTDOWN_SEQUENCE.length; i++) {
    const step = SHUTDOWN_SEQUENCE[i]
    console.log(`  ${i + 1}. ${step.name.padEnd(25)} ${step.duration.padEnd(8)} ${step.description}`)
  }

  // 3. 会话持久化
  console.log('\n━━━ 3. 会话持久化 (sessionStorage.ts 176KB) ━━━\n')
  const mockSession: SessionData = {
    id: 'sess_abc123', cwd: process.cwd(), model: 'claude-sonnet-4-20250514',
    startTime: Date.now(), messages: [{ role: 'user', content: 'hello' }],
    usage: { input: 1500, output: 300 },
    metadata: { gitBranch: 'main', os: `${os.platform()} ${os.arch()}` },
  }
  const filepath = persistSession(mockSession)
  console.log(`  会话 ID: ${mockSession.id}`)
  console.log(`  存储位置: ${filepath}`)
  console.log(`  支持: 崩溃恢复 / 历史浏览 / 导出分享 / 数据迁移`)

  // 4. Feature Flags
  console.log('\n━━━ 4. 双重功能门控 (feature() + GrowthBook) ━━━\n')
  console.log(`  ${'名称'.padEnd(28)} ${'类型'.padEnd(15)} 状态`)
  console.log(`  ${'─'.repeat(28)} ${'─'.repeat(15)} ${'─'.repeat(6)}`)
  for (const f of FEATURE_FLAGS) {
    const icon = f.enabled ? '\x1b[32m✓\x1b[0m' : '\x1b[90m✗\x1b[0m'
    const typeLabel = f.type === 'compile_time' ? 'feature() 编译时' : 'GrowthBook 运行时'
    console.log(`  ${icon} ${f.name.padEnd(26)} ${typeLabel.padEnd(15)} ${f.description}`)
  }

  // 5. 生产代码规模对比
  console.log('\n━━━ 5. 教学版 vs 生产版 最终对比 ━━━\n')
  const comparisons = [
    ['总代码量', '~35KB (s_full.py)', '~10MB+ (960 文件)'],
    ['工具数', '16', '50+'],
    ['安全代码', '~10 行黑名单', '535KB 多层验证'],
    ['上下文管理', '简单三层压缩', '三层 + 微压缩 + 做梦 + 折叠'],
    ['持久化', '文件 JSON', '176KB 会话存储'],
    ['错误处理', 'try/except', '41KB 分类 + 28KB 重试'],
    ['可观测性', 'print', 'GrowthBook + OTel + Datadog'],
    ['启动优化', '无', '并行预取 + 动态导入 + DCE'],
  ]
  console.log(`  ${'维度'.padEnd(12)} ${'教学版'.padEnd(25)} 生产版`)
  console.log(`  ${'─'.repeat(12)} ${'─'.repeat(25)} ${'─'.repeat(30)}`)
  for (const [dim, teach, prod] of comparisons) {
    console.log(`  ${dim.padEnd(12)} ${teach.padEnd(25)} ${prod}`)
  }

  console.log('\n━━━ 核心洞察 ━━━')
  console.log('  1. 循环不变 — 从教学版到生产版, Agent 循环本质一样')
  console.log('  2. 90% 是工程 — 核心功能 10%, 剩余是安全/可靠/可观测')
  console.log('  3. 双重门控 — 编译时 DCE 减体积 + 运行时 A/B 灰度发布')
  console.log('  4. 防御性设计 — 每个失败路径都有恢复策略')
  console.log()
  console.log('  \x1b[33m"模型就是智能体。我们的工作就是给它工具, 然后让开。"\x1b[0m')
  console.log('  \x1b[33m——但这个"让开"的过程, 需要 960 个文件的工程能力。\x1b[0m')
}
main()
