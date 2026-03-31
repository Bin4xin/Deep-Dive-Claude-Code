"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useSteppedVisualization } from "@/hooks/useSteppedVisualization";
import { StepControls } from "@/components/visualizations/shared/step-controls";

// 查询引擎流程图节点
const NODES = [
  { id: "user", label: "User Input", x: 240, y: 30, w: 130, h: 36 },
  { id: "budget", label: "Token Budget", x: 240, y: 100, w: 130, h: 36 },
  { id: "api", label: "API Call", x: 240, y: 180, w: 130, h: 36 },
  { id: "check", label: "stop_reason?", x: 240, y: 270, w: 150, h: 45 },
  { id: "exec", label: "Execute Tool", x: 240, y: 370, w: 130, h: 36 },
  { id: "perm", label: "Permission Check", x: 80, y: 370, w: 140, h: 36 },
  { id: "append", label: "Append Result", x: 240, y: 440, w: 130, h: 36 },
  { id: "done", label: "Return to User", x: 440, y: 270, w: 140, h: 36 },
];

const EDGES = [
  { from: "user", to: "budget" },
  { from: "budget", to: "api" },
  { from: "api", to: "check" },
  { from: "check", to: "exec", label: "tool_use" },
  { from: "exec", to: "append" },
  { from: "append", to: "api" },
  { from: "check", to: "done", label: "end_turn" },
];

const ACTIVE_NODES: string[][] = [
  [],
  ["user"],
  ["user", "budget"],
  ["budget", "api"],
  ["api", "check"],
  ["check", "exec", "perm"],
  ["exec", "append"],
  ["append", "api"],
  ["api", "check"],
  ["check", "done"],
];

const ACTIVE_EDGES: string[][] = [
  [],
  [],
  ["user->budget"],
  ["budget->api"],
  ["api->check"],
  ["check->exec"],
  ["exec->append"],
  ["append->api"],
  ["api->check"],
  ["check->done"],
];

interface Msg { role: string; detail: string; color: string; }

const MESSAGES: (Msg | null)[][] = [
  [],
  [{ role: "user", detail: "修复 auth.ts 的登录 bug", color: "bg-blue-500" }],
  [],
  [],
  [{ role: "assistant", detail: "思考中... 需要先看代码", color: "bg-zinc-600" }],
  [{ role: "tool_call", detail: "FileRead → src/auth.ts", color: "bg-amber-600" }],
  [{ role: "tool_result", detail: "auth.ts 文件内容 (48 行)", color: "bg-emerald-600" }],
  [],
  [{ role: "tool_call", detail: "FileEdit → 修复密码比较", color: "bg-amber-600" },
   { role: "tool_result", detail: "✓ 替换了 1 处", color: "bg-emerald-600" }],
  [{ role: "assistant", detail: "已修复! 改为 bcrypt 安全比对", color: "bg-purple-500" }],
];

const STEP_INFO = [
  { title: "QueryEngine 循环", desc: "核心循环: 用户输入 → API 调用 → 工具执行 → 回传结果，直到模型 stop" },
  { title: "用户输入", desc: "用户消息加入 messages[] 数组" },
  { title: "Token 预算", desc: "analyzeContext() 计算可用 Token，裁剪超预算的历史消息" },
  { title: "API 调用", desc: "发送 messages[] 到 Claude API，包含 system prompt + 工具定义" },
  { title: "响应解析", desc: "检查 stop_reason：'tool_use' → 继续循环，'end_turn' → 退出" },
  { title: "工具执行 + 权限检查", desc: "每个工具调用先经过 Permission Engine 验证路径和安全性" },
  { title: "结果追加", desc: "工具执行结果追加到 messages[]，作为下一轮 API 调用的上下文" },
  { title: "循环回 API", desc: "带着新的工具结果回到 API 调用，模型看到完整上下文" },
  { title: "第二轮工具调用", desc: "模型决定编辑文件，FileEdit 工具执行并返回结果" },
  { title: "循环退出", desc: "stop_reason = 'end_turn'，模型完成任务，响应返回用户" },
];

function getNode(id: string) { return NODES.find((n) => n.id === id)!; }

function edgePath(fromId: string, toId: string) {
  const f = getNode(fromId), t = getNode(toId);
  // loop-back: append -> api
  if (fromId === "append" && toId === "api") {
    return `M ${f.x - f.w/2} ${f.y} L ${f.x - f.w/2 - 50} ${f.y} L ${t.x - t.w/2 - 50} ${t.y} L ${t.x - t.w/2} ${t.y}`;
  }
  // horizontal: check -> done
  if (fromId === "check" && toId === "done") {
    return `M ${f.x + f.w/2} ${f.y} L ${t.x - t.w/2} ${t.y}`;
  }
  return `M ${f.x} ${f.y + f.h/2} L ${t.x} ${t.y - t.h/2}`;
}

export default function QueryEngineVisualization() {
  const viz = useSteppedVisualization({ totalSteps: 10, autoPlayInterval: 2500 });
  const an = ACTIVE_NODES[viz.currentStep];
  const ae = ACTIVE_EDGES[viz.currentStep];

  const visibleMessages: Msg[] = [];
  for (let s = 0; s <= viz.currentStep; s++) {
    for (const m of MESSAGES[s]) { if (m) visibleMessages.push(m); }
  }

  return (
    <section className="min-h-[520px] space-y-4">
      <h2 className="text-xl font-semibold text-zinc-100">
        查询引擎循环
      </h2>

      <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-4">
        <div className="flex flex-col gap-4 lg:flex-row">
          {/* 流程图 */}
          <div className="w-full lg:w-[60%]">
            <div className="mb-2 font-mono text-xs text-zinc-500">
              while (stop_reason === &quot;tool_use&quot;)
            </div>
            <svg viewBox="0 0 580 490" className="w-full rounded-md border border-zinc-800 bg-zinc-950" style={{ minHeight: 300 }}>
              <defs>
                <filter id="gl-b2"><feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#3b82f6" floodOpacity="0.7" /></filter>
                <filter id="gl-p2"><feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#a855f7" floodOpacity="0.7" /></filter>
                <marker id="a2" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#52525b" /></marker>
                <marker id="a2a" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#3b82f6" /></marker>
              </defs>

              {EDGES.map((e) => {
                const key = `${e.from}->${e.to}`;
                const active = ae.includes(key);
                return (
                  <g key={key}>
                    <motion.path d={edgePath(e.from, e.to)} fill="none"
                      stroke={active ? "#3b82f6" : "#3f3f46"} strokeWidth={active ? 2.5 : 1.5}
                      markerEnd={active ? "url(#a2a)" : "url(#a2)"}
                      animate={{ stroke: active ? "#3b82f6" : "#3f3f46" }} transition={{ duration: 0.4 }} />
                    {e.label && (
                      <text x={(getNode(e.from).x + getNode(e.to).x)/2 + (e.to === "done" ? 0 : 80)}
                        y={(getNode(e.from).y + getNode(e.to).y)/2 + (e.to === "done" ? -10 : 0)}
                        textAnchor="middle" className="fill-zinc-500 text-[10px]">{e.label}</text>
                    )}
                  </g>
                );
              })}

              {/* Permission Check 虚线连接 */}
              {an.includes("perm") && (
                <motion.line x1={getNode("exec").x - getNode("exec").w/2} y1={getNode("exec").y}
                  x2={getNode("perm").x + getNode("perm").w/2} y2={getNode("perm").y}
                  stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
              )}

              {NODES.map((n) => {
                const active = an.includes(n.id);
                const isDone = n.id === "done";
                const isPerm = n.id === "perm";
                const fillActive = isDone ? "#581c87" : isPerm ? "#78350f" : "#1e3a5f";
                const strokeActive = isDone ? "#a855f7" : isPerm ? "#f59e0b" : "#3b82f6";
                const filterStr = active ? (isDone ? "url(#gl-p2)" : "url(#gl-b2)") : "none";

                // diamond for check
                if (n.id === "check") {
                  const cx = n.x, cy = n.y, hw = n.w/2, hh = n.h/2;
                  return (
                    <g key={n.id}>
                      <motion.polygon points={`${cx},${cy-hh} ${cx+hw},${cy} ${cx},${cy+hh} ${cx-hw},${cy}`}
                        fill={active ? fillActive : "#18181b"} stroke={active ? strokeActive : "#3f3f46"}
                        strokeWidth={1.5} filter={filterStr}
                        animate={{ fill: active ? fillActive : "#18181b", stroke: active ? strokeActive : "#3f3f46" }}
                        transition={{ duration: 0.4 }} />
                      <motion.text x={cx} y={cy+4} textAnchor="middle" fontSize={10} fontWeight={600} fontFamily="monospace"
                        animate={{ fill: active ? "#fff" : "#a1a1aa" }} transition={{ duration: 0.4 }}>{n.label}</motion.text>
                    </g>
                  );
                }

                return (
                  <g key={n.id}>
                    <motion.rect x={n.x-n.w/2} y={n.y-n.h/2} width={n.w} height={n.h} rx={8}
                      fill={active ? fillActive : "#18181b"} stroke={active ? strokeActive : "#3f3f46"}
                      strokeWidth={1.5} filter={filterStr}
                      animate={{ fill: active ? fillActive : "#18181b", stroke: active ? strokeActive : "#3f3f46" }}
                      transition={{ duration: 0.4 }} />
                    <motion.text x={n.x} y={n.y+4} textAnchor="middle" fontSize={11} fontWeight={600} fontFamily="monospace"
                      animate={{ fill: active ? "#fff" : "#a1a1aa" }} transition={{ duration: 0.4 }}>{n.label}</motion.text>
                  </g>
                );
              })}

              {viz.currentStep >= 7 && (
                <motion.text x={55} y={240} textAnchor="middle" fontSize={10} fontFamily="monospace" fill="#3b82f6"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}>iter #2</motion.text>
              )}
            </svg>
          </div>

          {/* messages[] */}
          <div className="w-full lg:w-[40%]">
            <div className="mb-2 font-mono text-xs text-zinc-500">messages[]</div>
            <div className="min-h-[300px] space-y-2 rounded-md border border-zinc-800 bg-zinc-950 p-3">
              <AnimatePresence mode="popLayout">
                {visibleMessages.length === 0 && (
                  <motion.div key="e" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                    className="py-8 text-center text-xs text-zinc-600">[ empty ]</motion.div>
                )}
                {visibleMessages.map((m, i) => (
                  <motion.div key={`${m.role}-${i}`}
                    initial={{ opacity: 0, y: 12, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.35, type: "spring", bounce: 0.3 }}
                    className={`rounded-md px-3 py-2 ${m.color}`}>
                    <div className="font-mono text-[11px] font-semibold text-white">{m.role}</div>
                    <div className="mt-0.5 text-[10px] text-white/80">{m.detail}</div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {visibleMessages.length > 0 && (
                <div className="mt-3 border-t border-zinc-700 pt-2">
                  <span className="font-mono text-[10px] text-zinc-500">length: {visibleMessages.length}</span>
                </div>
              )}
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
