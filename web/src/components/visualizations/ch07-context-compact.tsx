"use client";

import { motion } from "framer-motion";
import { useSteppedVisualization } from "@/hooks/useSteppedVisualization";
import { StepControls } from "@/components/visualizations/shared/step-controls";

// Token 使用可视化
interface ContextState {
  used: number;
  limit: number;
  segments: { label: string; tokens: number; color: string; trimmed?: boolean }[];
}

const STATES: ContextState[] = [
  { used: 30, limit: 200, segments: [
    { label: "System Prompt", tokens: 30, color: "bg-blue-500" },
  ]},
  { used: 80, limit: 200, segments: [
    { label: "System Prompt", tokens: 30, color: "bg-blue-500" },
    { label: "对话历史", tokens: 35, color: "bg-emerald-500" },
    { label: "工具结果", tokens: 15, color: "bg-amber-500" },
  ]},
  { used: 150, limit: 200, segments: [
    { label: "System Prompt", tokens: 30, color: "bg-blue-500" },
    { label: "对话历史", tokens: 60, color: "bg-emerald-500" },
    { label: "工具结果", tokens: 40, color: "bg-amber-500" },
    { label: "文件内容", tokens: 20, color: "bg-purple-500" },
  ]},
  { used: 185, limit: 200, segments: [
    { label: "System Prompt", tokens: 30, color: "bg-blue-500" },
    { label: "对话历史", tokens: 70, color: "bg-emerald-500" },
    { label: "工具结果", tokens: 50, color: "bg-amber-500" },
    { label: "文件内容", tokens: 35, color: "bg-purple-500" },
  ]},
  // 微压缩后
  { used: 145, limit: 200, segments: [
    { label: "System Prompt", tokens: 30, color: "bg-blue-500" },
    { label: "对话历史", tokens: 70, color: "bg-emerald-500" },
    { label: "工具结果 (微压缩)", tokens: 25, color: "bg-amber-500", trimmed: true },
    { label: "文件内容 (截断)", tokens: 20, color: "bg-purple-500", trimmed: true },
  ]},
  // 自动压缩后
  { used: 80, limit: 200, segments: [
    { label: "System Prompt", tokens: 30, color: "bg-blue-500" },
    { label: "压缩摘要", tokens: 25, color: "bg-cyan-500" },
    { label: "最近对话", tokens: 20, color: "bg-emerald-500" },
    { label: "记忆提取", tokens: 5, color: "bg-pink-500" },
  ]},
  // 做梦整合
  { used: 75, limit: 200, segments: [
    { label: "System Prompt", tokens: 30, color: "bg-blue-500" },
    { label: "压缩摘要", tokens: 20, color: "bg-cyan-500" },
    { label: "Dream 记忆", tokens: 10, color: "bg-indigo-500" },
    { label: "最近对话", tokens: 15, color: "bg-emerald-500" },
  ]},
];

const COMPRESSION_LAYERS = [
  { id: "micro", label: "微压缩", desc: "截断大型工具结果 (>3000 字符)", active: false },
  { id: "auto", label: "自动压缩", desc: "达到 80% 阈值 → 模型总结历史", active: false },
  { id: "dream", label: "做梦整合", desc: "后台异步提取关键记忆片段", active: false },
];

const STEP_INFO = [
  { title: "上下文管理概览", desc: "200K token 上下文窗口，通过三层压缩策略实现无限会话" },
  { title: "对话增长", desc: "随着对话进行，token 使用量稳步增长" },
  { title: "快速增长", desc: "工具结果和文件内容大量消耗 token" },
  { title: "接近上限!", desc: "达到 92% — 即将触发压缩阈值 (80%)" },
  { title: "L1: 微压缩", desc: "截断超长工具结果，保留关键信息头尾，释放 40K" },
  { title: "L2: 自动压缩", desc: "调用模型总结历史对话，保留最近交互，释放 65K" },
  { title: "L3: 做梦整合", desc: "后台异步提取关键记忆片段，进一步优化上下文质量" },
];

export default function ContextCompactVisualization() {
  const viz = useSteppedVisualization({ totalSteps: 7, autoPlayInterval: 3000 });
  const state = STATES[viz.currentStep];
  const pct = (state.used / state.limit) * 100;
  const isWarning = pct > 80;
  const isDanger = pct > 90;

  return (
    <section className="min-h-[520px] space-y-4">
      <h2 className="text-xl font-semibold text-zinc-100">上下文压缩引擎</h2>

      <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-4">
        <div className="flex flex-col gap-4 lg:flex-row">
          {/* 左侧：Token 用量条 + 段 */}
          <div className="w-full lg:w-[55%]">
            {/* 总量条 */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-zinc-400">Token 使用量</span>
                <span className={`font-mono font-bold ${isDanger ? "text-red-400" : isWarning ? "text-amber-400" : "text-zinc-300"}`}>
                  {state.used}K / {state.limit}K ({Math.round(pct)}%)
                </span>
              </div>
              <div className="relative h-6 w-full overflow-hidden rounded-full bg-zinc-800">
                <motion.div
                  className={`absolute inset-y-0 left-0 rounded-full ${isDanger ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-blue-500"}`}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6 }}
                />
                {/* 80% 阈值线 */}
                <div className="absolute inset-y-0 left-[80%] w-px bg-white/30" />
                <span className="absolute left-[80%] -top-5 -translate-x-1/2 text-[9px] text-zinc-500">80%</span>
              </div>
            </div>

            {/* 段明细 */}
            <div className="mb-3 font-mono text-xs text-zinc-500">上下文段</div>
            <div className="space-y-2">
              {state.segments.map((seg, i) => (
                <motion.div
                  key={`${viz.currentStep}-${seg.label}`}
                  initial={{ opacity: 0, scaleX: 0 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  transition={{ delay: i * 0.1 }}
                  style={{ originX: 0 }}
                  className={`rounded border p-2 ${seg.trimmed ? "border-amber-800 bg-amber-950/20" : "border-zinc-800 bg-zinc-950"}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${seg.color}`} />
                      <span className="text-xs text-zinc-300">{seg.label}</span>
                      {seg.trimmed && <span className="text-[9px] text-amber-400">已压缩</span>}
                    </div>
                    <span className="font-mono text-[10px] text-zinc-500">{seg.tokens}K</span>
                  </div>
                  {/* 比例条 */}
                  <div className="mt-1 h-1.5 w-full rounded-full bg-zinc-800">
                    <motion.div
                      className={`h-full rounded-full ${seg.color}`}
                      animate={{ width: `${(seg.tokens / state.limit) * 100}%` }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* 右侧：三层压缩策略 */}
          <div className="w-full lg:w-[45%]">
            <div className="mb-2 font-mono text-xs text-zinc-500">三层压缩策略</div>
            <div className="space-y-3">
              {COMPRESSION_LAYERS.map((layer, i) => {
                const isActive = (i === 0 && viz.currentStep === 4) ||
                                 (i === 1 && viz.currentStep === 5) ||
                                 (i === 2 && viz.currentStep === 6);
                const isDone = (i === 0 && viz.currentStep >= 5) ||
                               (i === 1 && viz.currentStep >= 6) ||
                               (i === 2 && viz.currentStep >= 7);
                return (
                  <motion.div
                    key={layer.id}
                    animate={{
                      borderColor: isActive ? "#3b82f6" : isDone ? "#047857" : "#27272a",
                    }}
                    className={`rounded-lg border p-4 ${
                      isActive ? "bg-blue-950/30 border-blue-700" :
                      isDone ? "bg-emerald-950/20 border-emerald-800" :
                      "bg-zinc-950 border-zinc-800"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-semibold ${isActive || isDone ? "text-zinc-100" : "text-zinc-600"}`}>
                        {layer.label}
                      </span>
                      {isDone && <span className="text-emerald-400 text-xs">✓ 完成</span>}
                      {isActive && (
                        <motion.span
                          animate={{ opacity: [1, 0.3, 1] }}
                          transition={{ repeat: Infinity, duration: 1 }}
                          className="text-blue-400 text-xs"
                        >
                          执行中...
                        </motion.span>
                      )}
                    </div>
                    <p className={`text-xs ${isActive || isDone ? "text-zinc-400" : "text-zinc-700"}`}>
                      {layer.desc}
                    </p>
                  </motion.div>
                );
              })}

              {/* 整体效果 */}
              {viz.currentStep >= 5 && (
                <motion.div
                  initial={{opacity:0}}
                  animate={{opacity:1}}
                  className="rounded border border-zinc-700 bg-zinc-950 p-3 text-center"
                >
                  <div className="text-xs text-zinc-400">压缩效果</div>
                  <div className="font-mono text-lg font-bold text-emerald-400">
                    {STATES[3].used}K → {state.used}K
                  </div>
                  <div className="text-[10px] text-zinc-500">
                    释放 {STATES[3].used - state.used}K tokens ({Math.round(((STATES[3].used - state.used) / STATES[3].used) * 100)}%)
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>

      <StepControls
        currentStep={viz.currentStep} totalSteps={viz.totalSteps}
        onPrev={viz.prev} onNext={viz.next} onReset={viz.reset}
        isPlaying={viz.isPlaying} onToggleAutoPlay={viz.toggleAutoPlay}
        stepTitle={STEP_INFO[viz.currentStep].title}
        stepDescription={STEP_INFO[viz.currentStep].desc}
      />
    </section>
  );
}
