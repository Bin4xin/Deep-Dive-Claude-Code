/**
 * s11_transport.ts — CLI 传输层演示
 * 对应 Ch11: CLI 传输层
 * 演示 Claude Code 的三种传输协议 + 结构化 IO
 * 运行: npx tsx agents/s11_transport.ts
 */

// ============================================================
// 传输接口 (真实源码: src/cli/transports/Transport.ts)
// ============================================================

interface SDKEvent { type: string; data: any; timestamp: number }

interface Transport {
  name: string
  send(event: SDKEvent): void
  onReceive(handler: (event: SDKEvent) => void): void
  connect(): Promise<void>
  disconnect(): void
}

// ============================================================
// 三种传输实现
// ============================================================

class StdioTransport implements Transport {
  name = 'stdio (NDJSON)'
  private handler?: (event: SDKEvent) => void
  send(event: SDKEvent): void { process.stdout.write(JSON.stringify(event) + '\n') }
  onReceive(handler: (event: SDKEvent) => void): void { this.handler = handler }
  async connect(): Promise<void> { /* stdin 监听 */ }
  disconnect(): void { /* 关闭 stdin */ }
}

class SSETransport implements Transport {
  name = 'SSE (Server-Sent Events)'
  constructor(private url: string) {}
  send(event: SDKEvent): void { /* POST to url */ }
  onReceive(handler: (event: SDKEvent) => void): void { /* EventSource 监听 */ }
  async connect(): Promise<void> { /* new EventSource(url) */ }
  disconnect(): void { /* eventsource.close() */ }
}

class WebSocketTransport implements Transport {
  name = 'WebSocket (双向)'
  constructor(private url: string) {}
  send(event: SDKEvent): void { /* ws.send(JSON.stringify(event)) */ }
  onReceive(handler: (event: SDKEvent) => void): void { /* ws.onmessage */ }
  async connect(): Promise<void> { /* new WebSocket(url) */ }
  disconnect(): void { /* ws.close() */ }
}

class HybridTransport implements Transport {
  name = 'Hybrid (SSE + WebSocket fallback)'
  private active?: Transport
  constructor(private sse: SSETransport, private ws: WebSocketTransport) {}
  send(event: SDKEvent): void { this.active?.send(event) }
  onReceive(handler: (event: SDKEvent) => void): void { this.active?.onReceive(handler) }
  async connect(): Promise<void> {
    try { await this.sse.connect(); this.active = this.sse }
    catch { await this.ws.connect(); this.active = this.ws }
  }
  disconnect(): void { this.active?.disconnect() }
}

// ============================================================
// 结构化 IO 消息类型 (真实源码: src/cli/structuredIO.ts)
// ============================================================

type SDKMessageType =
  | 'assistant_text'     // 模型文本回复
  | 'tool_use'           // 工具调用
  | 'tool_result'        // 工具结果
  | 'system'             // 系统消息
  | 'progress'           // 进度更新
  | 'permission_request' // 权限请求
  | 'turn_complete'      // 轮次完成
  | 'error'              // 错误

function main() {
  console.log('╔══════════════════════════════════════════════════════╗')
  console.log('║  s11: Claude Code 传输层演示                         ║')
  console.log('║  stdio/SSE/WebSocket + 结构化 IO                   ║')
  console.log('╚══════════════════════════════════════════════════════╝\n')

  // 传输协议对比
  console.log('━━━ 1. 三种传输协议 ━━━\n')
  const transports = [
    { name: 'stdio (NDJSON)', file: 'StdioTransport', size: '-', usage: 'SDK headless 模式, 进程间通信', direction: '双向 (stdin/stdout)' },
    { name: 'SSE', file: 'SSETransport.ts (23KB)', size: '23KB', usage: '远程会话 (服务器→客户端推送)', direction: '单向推送 + HTTP POST' },
    { name: 'WebSocket', file: 'WebSocketTransport.ts (28KB)', size: '28KB', usage: '远程会话 (全双工通信)', direction: '全双工' },
    { name: 'Hybrid', file: 'HybridTransport.ts (11KB)', size: '11KB', usage: 'SSE 优先, WebSocket 降级', direction: '自适应' },
  ]

  for (const t of transports) {
    console.log(`  \x1b[36m${t.name}\x1b[0m`)
    console.log(`    文件: ${t.file}`)
    console.log(`    方向: ${t.direction}`)
    console.log(`    用途: ${t.usage}\n`)
  }

  // SDK 消息类型
  console.log('━━━ 2. SDK 消息类型 (structuredIO.ts 28KB) ━━━\n')
  const msgTypes: [SDKMessageType, string][] = [
    ['assistant_text', '模型文本回复 — 流式输出每个 token'],
    ['tool_use', '工具调用 — 模型请求执行某个工具'],
    ['tool_result', '工具结果 — 工具执行完毕的返回值'],
    ['system', '系统消息 — 压缩通知、状态变更等'],
    ['progress', '进度更新 — 工具执行中的进度信息'],
    ['permission_request', '权限请求 — 需要用户确认的操作'],
    ['turn_complete', '轮次完成 — 包含 token 统计、耗时等'],
    ['error', '错误 — API 错误、工具错误等'],
  ]

  for (const [type, desc] of msgTypes) {
    console.log(`  ${type.padEnd(22)} ${desc}`)
  }

  // NDJSON 示例
  console.log('\n━━━ 3. NDJSON 输出示例 (SDK 模式) ━━━\n')
  const mockEvents: SDKEvent[] = [
    { type: 'assistant_text', data: { text: 'I\'ll read the file.' }, timestamp: 1 },
    { type: 'tool_use', data: { name: 'read_file', input: { path: 'src/main.ts' } }, timestamp: 2 },
    { type: 'tool_result', data: { content: 'const x = 1;\n...' }, timestamp: 3 },
    { type: 'turn_complete', data: { input_tokens: 1500, output_tokens: 200, duration_ms: 3400 }, timestamp: 4 },
  ]

  for (const e of mockEvents) {
    console.log(`  \x1b[90m${JSON.stringify(e)}\x1b[0m`)
  }

  // UI 层
  console.log('\n━━━ 4. React Ink 终端 UI ━━━\n')
  console.log('  真实源码: src/hooks/ (108 个文件)')
  console.log('  关键 hooks:')
  console.log('    useTypeahead.tsx     208KB — 自动补全')
  console.log('    useReplBridge.tsx    113KB — REPL 桥接')
  console.log('    useVirtualScroll.ts   34KB — 虚拟滚动')
  console.log('    useVoice.ts           45KB — 语音输入')
  console.log('    useTextInput.ts       17KB — 文本输入')

  console.log('\n━━━ 关键洞察 ━━━')
  console.log('  1. 核心逻辑与传输无关 — QueryEngine 不知道自己在终端还是远程')
  console.log('  2. NDJSON 机器友好 — SDK 集成只需解析 JSON 行')
  console.log('  3. React Ink 组件化 — 终端 UI 和 Web UI 同样的开发体验')
  console.log('  4. Hybrid 降级 — SSE 连不上自动降级到 WebSocket')
}
main()
