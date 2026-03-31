"use client";

import { motion } from "framer-motion";
import { useSteppedVisualization } from "@/hooks/useSteppedVisualization";
import { StepControls } from "@/components/visualizations/shared/step-controls";

const TRANSPORT_LAYERS = [
  { id: "stdio", label: "stdio", desc: "标准输入/输出 — 本地终端默认", color: "bg-blue-500", port: "stdin/stdout" },
  { id: "sse", label: "SSE", desc: "Server-Sent Events — 单向流式", color: "bg-emerald-500", port: "HTTP :3000" },
  { id: "ws", label: "WebSocket", desc: "双向实时通信 — 远程交互", color: "bg-purple-500", port: "WS :3001" },
  { id: "hybrid", label: "Hybrid", desc: "SSE + WS 混合 — 生产推荐", color: "bg-amber-500", port: "HTTP+WS" },
];

const DETAIL_PER_STEP = [
  "CLI 传输层架构:\n\n  User Terminal\n      ↕ (Transport Layer)\n  Claude Code Engine\n\n  4 种传输协议可选",
  "stdio 传输:\n  process.stdin → 解析 JSON-RPC\n  process.stdout ← 输出 JSON-RPC\n\n  优点: 零配置，本地最快\n  缺点: 无法远程",
  "SSE 传输:\n  GET /events → 建立 SSE 连接\n  POST /message → 发送用户消息\n\n  优点: HTTP 友好，穿透防火墙\n  缺点: 单向流，需要额外 POST",
  "WebSocket 传输:\n  ws://localhost:3001\n  ↕ 双向实时通信\n\n  优点: 低延迟，真双向\n  缺点: 需要保持连接",
  "Hybrid 传输:\n  SSE: 引擎 → 客户端 (流式输出)\n  WS:  客户端 → 引擎 (用户输入)\n\n  结合 SSE 可靠性 + WS 实时性\n  生产环境推荐",
  "结构化 IO (SDK 模式):\n\n  输入: { type: 'user_message', content: '...' }\n  输出: [\n    { type: 'text', content: '...' },\n    { type: 'tool_use', name: '...', input: {} },\n    { type: 'tool_result', content: '...' },\n  ]\n\n  → JSON 格式，机器可解析",
  "React Ink 终端 UI:\n\n  <Box flexDirection='column'>\n    <MessageList messages={msgs} />\n    <ToolStatus active={tool} />\n    <InputBox onSubmit={send} />\n  </Box>\n\n  终端中使用 React 组件渲染!\n  108 个 hooks 管理状态",
];

const STEP_INFO = [
  { title: "CLI 传输层概览", desc: "4 种传输协议支持本地终端到远程会话的所有场景" },
  { title: "stdio — 本地默认", desc: "标准输入/输出，零配置，本地终端最快的方式" },
  { title: "SSE — HTTP 流式", desc: "Server-Sent Events，单向流式输出，HTTP 友好" },
  { title: "WebSocket — 双向实时", desc: "全双工通信，低延迟，适合交互密集场景" },
  { title: "Hybrid — 生产推荐", desc: "SSE + WS 混合模式，兼顾可靠性和实时性" },
  { title: "结构化 IO", desc: "SDK 模式下输出 JSON 格式，便于程序解析和集成" },
  { title: "React Ink", desc: "终端 UI 使用 React 组件渲染，108 个 hooks 管理状态" },
];

export default function TransportVisualization() {
  const viz = useSteppedVisualization({ totalSteps: 7, autoPlayInterval: 3000 });

  return (
    <section className="min-h-[520px] space-y-4">
      <h2 className="text-xl font-semibold text-zinc-100">CLI 传输层</h2>
      <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-4">
        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="w-full lg:w-[40%]">
            <div className="mb-3 font-mono text-xs text-zinc-500">传输协议</div>
            <div className="space-y-2">
              {TRANSPORT_LAYERS.map((t, i) => {
                const isActive = i + 1 === viz.currentStep || (viz.currentStep === 4 && i === 3);
                return (
                  <motion.div
                    key={t.id}
                    animate={{ borderColor: isActive ? "#3b82f6" : "#27272a", scale: isActive ? 1.02 : 1 }}
                    className={`rounded-lg border p-3 ${isActive ? "bg-blue-950/30 border-blue-700" : "bg-zinc-950 border-zinc-800"}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${t.color}`} />
                        <span className={`text-sm font-semibold ${isActive ? "text-white" : "text-zinc-500"}`}>{t.label}</span>
                      </div>
                      <span className="font-mono text-[9px] text-zinc-500">{t.port}</span>
                    </div>
                    <p className={`text-xs ${isActive ? "text-zinc-300" : "text-zinc-600"}`}>{t.desc}</p>
                  </motion.div>
                );
              })}

              {/* 额外模块 */}
              {viz.currentStep >= 5 && (
                <motion.div initial={{opacity:0}} animate={{opacity:1}} className="space-y-2 mt-4">
                  {[
                    { label: "Structured IO", desc: "JSON 格式输入输出", active: viz.currentStep === 5 },
                    { label: "React Ink", desc: "终端 React 渲染", active: viz.currentStep === 6 },
                  ].map((m) => (
                    <motion.div key={m.label}
                      animate={{ borderColor: m.active ? "#f59e0b" : "#27272a" }}
                      className={`rounded-lg border p-3 ${m.active ? "bg-amber-950/30 border-amber-700" : "bg-zinc-950 border-zinc-800"}`}
                    >
                      <span className={`text-sm font-semibold ${m.active ? "text-white" : "text-zinc-500"}`}>{m.label}</span>
                      <p className={`text-xs mt-0.5 ${m.active ? "text-zinc-300" : "text-zinc-600"}`}>{m.desc}</p>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>
          </div>

          <div className="w-full lg:w-[60%]">
            <div className="mb-2 font-mono text-xs text-zinc-500">协议细节</div>
            <div className="min-h-[380px] rounded-md border border-zinc-800 bg-zinc-950 p-3">
              <motion.pre key={viz.currentStep} initial={{opacity:0}} animate={{opacity:1}}
                className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-zinc-300">
                {DETAIL_PER_STEP[viz.currentStep]}
              </motion.pre>
            </div>
          </div>
        </div>
      </div>
      <StepControls currentStep={viz.currentStep} totalSteps={viz.totalSteps}
        onPrev={viz.prev} onNext={viz.next} onReset={viz.reset}
        isPlaying={viz.isPlaying} onToggleAutoPlay={viz.toggleAutoPlay}
        stepTitle={STEP_INFO[viz.currentStep].title}
        stepDescription={STEP_INFO[viz.currentStep].desc} />
    </section>
  );
}
