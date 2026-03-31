/**
 * s10_multi_agent.ts — 多 Agent 协作演示
 * 对应 Ch10: 多 Agent 协作
 * 演示 Subagent (一次性) / Teammate (持久化) / Swarm (自治) 三层模型
 * 运行: npx tsx agents/s10_multi_agent.ts
 */

// ============================================================
// 三层协作模型
// ============================================================

type AgentStatus = 'working' | 'idle' | 'shutdown'
interface MailboxMessage { from: string; to: string; content: string; ts: number }
interface TaskItem { id: number; subject: string; status: 'pending' | 'in_progress' | 'completed'; owner?: string }

// Layer 1: Subagent — 一次性, 独立上下文, 返回摘要后丢弃
function runSubagent(prompt: string): string {
  console.log(`    [subagent] 启动, 独立 messages[], prompt: "${prompt.slice(0, 50)}"`)
  console.log(`    [subagent] 执行工具调用 ×3...`)
  console.log(`    [subagent] 完成, 返回摘要, 上下文丢弃`)
  return `Summary: completed analysis of "${prompt.slice(0, 30)}"`
}

// Layer 2: Teammate — 持久化线程, 通过邮箱通信
class TeammateManager {
  private teammates: Map<string, { role: string; status: AgentStatus }> = new Map()
  private mailbox: MailboxMessage[] = []

  spawn(name: string, role: string): void {
    this.teammates.set(name, { role, status: 'working' })
    console.log(`  [\x1b[32m+\x1b[0m] Spawned teammate "${name}" (${role})`)
  }

  sendMessage(from: string, to: string, content: string): void {
    this.mailbox.push({ from, to, content, ts: Date.now() })
    console.log(`  [📨] ${from} → ${to}: "${content.slice(0, 50)}"`)
  }

  readInbox(name: string): MailboxMessage[] {
    const msgs = this.mailbox.filter(m => m.to === name)
    this.mailbox = this.mailbox.filter(m => m.to !== name)
    return msgs
  }

  setStatus(name: string, status: AgentStatus): void {
    const tm = this.teammates.get(name)
    if (tm) tm.status = status
  }

  getTeam(): [string, { role: string; status: AgentStatus }][] {
    return [...this.teammates.entries()]
  }
}

// Layer 3: Swarm — 自治, 自动扫描看板认领任务
class TaskBoard {
  private tasks: TaskItem[] = []
  private nextId = 1

  create(subject: string): TaskItem {
    const task: TaskItem = { id: this.nextId++, subject, status: 'pending' }
    this.tasks.push(task)
    return task
  }

  scanUnclaimed(): TaskItem[] {
    return this.tasks.filter(t => t.status === 'pending' && !t.owner)
  }

  claim(taskId: number, owner: string): void {
    const task = this.tasks.find(t => t.id === taskId)
    if (task) { task.owner = owner; task.status = 'in_progress' }
  }

  complete(taskId: number): void {
    const task = this.tasks.find(t => t.id === taskId)
    if (task) task.status = 'completed'
  }

  getAll(): TaskItem[] { return this.tasks }
}

// ============================================================
// 主程序
// ============================================================

function main() {
  console.log('╔══════════════════════════════════════════════════════╗')
  console.log('║  s10: Claude Code 多 Agent 协作演示                  ║')
  console.log('║  Subagent + Teammate + Swarm 三层模型               ║')
  console.log('╚══════════════════════════════════════════════════════╝\n')

  // --- Layer 1: Subagent ---
  console.log('━━━ Layer 1: Subagent (一次性, AgentTool 228KB) ━━━\n')
  const summary = runSubagent('Analyze the testing framework used in this project')
  console.log(`    父 Agent 收到: "${summary}"\n`)

  // --- Layer 2: Teammate ---
  console.log('━━━ Layer 2: Teammate (持久化, teammateMailbox.ts 33KB) ━━━\n')
  const team = new TeammateManager()
  team.spawn('alice', 'frontend-developer')
  team.spawn('bob', 'backend-developer')
  team.sendMessage('lead', 'alice', 'Implement the login UI component')
  team.sendMessage('lead', 'bob', 'Create the /api/auth endpoint')
  team.sendMessage('alice', 'bob', 'What format should the auth response be?')
  console.log()
  console.log('  Alice 的收件箱:')
  for (const m of team.readInbox('alice')) { console.log(`    ← ${m.from}: ${m.content}`) }
  console.log('  Bob 的收件箱:')
  for (const m of team.readInbox('bob')) { console.log(`    ← ${m.from}: ${m.content}`) }

  // --- Layer 3: Swarm ---
  console.log('\n━━━ Layer 3: Swarm (自治, 自动认领) ━━━\n')
  const board = new TaskBoard()
  board.create('Implement user authentication')
  board.create('Add unit tests for auth module')
  board.create('Update API documentation')
  board.create('Fix CSS responsive layout')

  console.log('  任务看板:')
  for (const t of board.getAll()) { console.log(`    #${t.id} [${t.status}] ${t.subject}`) }

  // 模拟自治认领
  console.log('\n  自治 Agent 扫描看板...')
  const unclaimed = board.scanUnclaimed()
  if (unclaimed.length > 0) {
    board.claim(unclaimed[0].id, 'alice')
    console.log(`  \x1b[32m→ alice 自动认领 #${unclaimed[0].id}: ${unclaimed[0].subject}\x1b[0m`)
  }
  if (unclaimed.length > 1) {
    board.claim(unclaimed[1].id, 'bob')
    console.log(`  \x1b[32m→ bob 自动认领 #${unclaimed[1].id}: ${unclaimed[1].subject}\x1b[0m`)
  }
  board.complete(unclaimed[0].id)
  console.log(`  \x1b[36m✓ alice 完成 #${unclaimed[0].id}\x1b[0m`)

  console.log('\n  更新后的看板:')
  for (const t of board.getAll()) {
    const icon = { pending: '[ ]', in_progress: '[>]', completed: '[x]' }[t.status]
    console.log(`    ${icon} #${t.id} ${t.subject}${t.owner ? ` \x1b[90m(${t.owner})\x1b[0m` : ''}`)
  }

  console.log('\n━━━ 真实源码规模 ━━━')
  console.log('  AgentTool.tsx          228KB — 子代理主实现')
  console.log('  spawnMultiAgent.ts      35KB — 多 Agent 并行')
  console.log('  teammateMailbox.ts      33KB — 邮箱通信')
  console.log('  utils/swarm/            多文件 — Swarm 集群')

  console.log('\n━━━ 关键洞察 ━━━')
  console.log('  1. 三层递进 — 一次性子代理 → 持久化队友 → 自治集群')
  console.log('  2. 上下文隔离 — 子代理独立 messages[], 不污染父级')
  console.log('  3. 异步通信 — 邮箱模式, 非阻塞')
  console.log('  4. 自组织 — 空闲 Agent 自己扫描看板认领任务')
}
main()
