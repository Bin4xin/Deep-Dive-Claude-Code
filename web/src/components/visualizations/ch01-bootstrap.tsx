"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useSteppedVisualization } from "@/hooks/useSteppedVisualization";
import { StepControls } from "@/components/visualizations/shared/step-controls";

// 启动阶段节点
interface BootNode {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

const NODES: BootNode[] = [
  { id: "entry", label: "dev-entry.ts", x: 250, y: 30, w: 140, h: 36 },
  { id: "scan", label: "扫描缺失导入", x: 250, y: 90, w: 140, h: 36 },
  { id: "cli", label: "cli.tsx", x: 250, y: 160, w: 140, h: 36 },
  { id: "fast", label: "--version", x: 80, y: 230, w: 120, h: 36 },
  { id: "main", label: "main.tsx (785KB)", x: 400, y: 230, w: 160, h: 36 },
  { id: "parallel", label: "并行预取 ×4", x: 400, y: 310, w: 160, h: 36 },
  { id: "feature", label: "feature() 消除", x: 400, y: 380, w: 160, h: 36 },
  { id: "repl", label: "REPL >", x: 400, y: 450, w: 140, h: 36 },
  { id: "output", label: "输出 → 退出", x: 80, y: 310, w: 120, h: 36 },
];

const EDGES: { from: string; to: string; label?: string }[] = [
  { from: "entry", to: "scan" },
  { from: "scan", to: "cli" },
  { from: "cli", to: "fast", label: "快速路径" },
  { from: "cli", to: "main", label: "完整路径" },
  { from: "fast", to: "output" },
  { from: "main", to: "parallel" },
  { from: "parallel", to: "feature" },
  { from: "feature", to: "repl" },
];

const ACTIVE_PER_STEP: string[][] = [
  [],
  ["entry"],
  ["entry", "scan"],
  ["scan", "cli"],
  ["cli", "fast"],
  ["fast", "output"],
  ["cli", "main"],
  ["main", "parallel"],
  ["parallel", "feature"],
  ["feature", "repl"],
];

const ACTIVE_EDGES_PER_STEP: string[][] = [
  [],
  [],
  ["entry->scan"],
  ["scan->cli"],
  ["cli->fast"],
  ["fast->output"],
  ["cli->main"],
  ["main->parallel"],
  ["parallel->feature"],
  ["feature->repl"],
];

// 右侧信息面板
interface InfoBlock {
  title: string;
  content: string;
  color: string;
}

const INFO_PER_STEP: InfoBlock[][] = [
  [],
  [{ title: "入口文件", content: "dev-entry.ts — 开发模式入口点", color: "bg-blue-600" }],
  [{ title: "依赖检查", content: "扫描所有 import，确保 source map 还原完整", color: "bg-cyan-600" }],
  [{ title: "CLI 入口", content: "cli.tsx — 快速路径分发器\n检查 argv 是否匹配快速路径", color: "bg-indigo-600" }],
  [{ title: "快速路径 #1", content: "--version → 零模块加载\n不导入 main.tsx", color: "bg-emerald-600" }],
  [{ title: "立即退出", content: "输出 '1.0.33' → process.exit(0)\n总耗时 < 50ms", color: "bg-emerald-500" }],
  [{ title: "完整启动", content: "无快速路径匹配\n→ dynamic import('./main.tsx')\n→ 加载 785KB 核心", color: "bg-amber-600" }],
  [
    { title: "并行预取", content: "MDM 配置", color: "bg-purple-600" },
    { title: "并行预取", content: "Keychain 凭证", color: "bg-purple-500" },
    { title: "并行预取", content: "GrowthBook A/B", color: "bg-purple-700" },
    { title: "并行预取", content: "Analytics 初始化", color: "bg-purple-800" },
  ],
  [{ title: "编译时消除", content: "feature('internal') → 已移除\nfeature('beta') → 保留\n零运行时开销", color: "bg-orange-600" }],
  [{ title: "REPL 就绪", content: "> 提示符显示\n从按下回车到这里 ≈ 200ms\n启动完成!", color: "bg-green-600" }],
];

const STEP_INFO = [
  { title: "启动流程概览", desc: "Claude Code 从 dev-entry.ts 出发，经过快速路径分发、并行预取到 REPL 就绪" },
  { title: "开发入口", desc: "dev-entry.ts 是还原版的入口，负责检查 source map 还原是否完整" },
  { title: "缺失导入扫描", desc: "遍历所有文件的 import 语句，统计无法解析的依赖数量" },
  { title: "CLI 分发器", desc: "cli.tsx 检查 argv，--version / --dump-system-prompt 等走快速路径" },
  { title: "快速路径: --version", desc: "匹配到 --version，不加载 main.tsx，零模块加载实现毫秒响应" },
  { title: "零加载输出", desc: "直接输出版本号退出，避免了 785KB main.tsx 的解析和执行" },
  { title: "完整启动路径", desc: "无快速路径匹配时，动态 import main.tsx，加载 Commander.js 参数解析" },
  { title: "并行预取优化", desc: "4 个异步操作用 Promise.all 并行执行，不串行等待" },
  { title: "编译时功能消除", desc: "feature() 宏在构建时决定功能开关，内部功能不进入外部构建" },
  { title: "REPL 就绪", desc: "所有初始化完成，用户看到 > 提示符，可以开始交互" },
];

function getNode(id: string) {
  return NODES.find((n) => n.id === id)!;
}

function edgePath(fromId: string, toId: string) {
  const from = getNode(fromId);
  const to = getNode(toId);
  const startX = from.x;
  const startY = from.y + from.h / 2;
  const endX = to.x;
  const endY = to.y - to.h / 2;

  if (Math.abs(startX - endX) < 10) {
    return `M ${startX} ${startY} L ${endX} ${endY}`;
  }
  const midY = (startY + endY) / 2;
  return `M ${startX} ${startY} L ${startX} ${midY} L ${endX} ${midY} L ${endX} ${endY}`;
}

export default function BootstrapVisualization() {
  const viz = useSteppedVisualization({ totalSteps: 10, autoPlayInterval: 2500 });
  const activeNodes = ACTIVE_PER_STEP[viz.currentStep];
  const activeEdges = ACTIVE_EDGES_PER_STEP[viz.currentStep];
  const infoBlocks = INFO_PER_STEP[viz.currentStep];

  return (
    <section className="min-h-[520px] space-y-4">
      <h2 className="text-xl font-semibold text-zinc-100">
        启动流程可视化
      </h2>

      <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-4">
        <div className="flex flex-col gap-4 lg:flex-row">
          {/* SVG 流程图 */}
          <div className="w-full lg:w-[60%]">
            <div className="mb-2 font-mono text-xs text-zinc-500">
              dev-entry.ts → cli.tsx → main.tsx → REPL
            </div>
            <svg
              viewBox="0 0 580 500"
              className="w-full rounded-md border border-zinc-800 bg-zinc-950"
              style={{ minHeight: 320 }}
            >
              <defs>
                <filter id="glow-b">
                  <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#3b82f6" floodOpacity="0.7" />
                </filter>
                <filter id="glow-g">
                  <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#10b981" floodOpacity="0.7" />
                </filter>
                <marker id="arr" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill="#52525b" />
                </marker>
                <marker id="arr-a" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill="#3b82f6" />
                </marker>
              </defs>

              {EDGES.map((edge) => {
                const key = `${edge.from}->${edge.to}`;
                const isActive = activeEdges.includes(key);
                const d = edgePath(edge.from, edge.to);
                return (
                  <g key={key}>
                    <motion.path
                      d={d}
                      fill="none"
                      stroke={isActive ? "#3b82f6" : "#3f3f46"}
                      strokeWidth={isActive ? 2.5 : 1.5}
                      markerEnd={isActive ? "url(#arr-a)" : "url(#arr)"}
                      animate={{ stroke: isActive ? "#3b82f6" : "#3f3f46", strokeWidth: isActive ? 2.5 : 1.5 }}
                      transition={{ duration: 0.4 }}
                    />
                    {edge.label && (
                      <text
                        x={(getNode(edge.from).x + getNode(edge.to).x) / 2}
                        y={(getNode(edge.from).y + getNode(edge.to).y) / 2 + 10}
                        textAnchor="middle"
                        className="fill-zinc-500 text-[9px]"
                      >
                        {edge.label}
                      </text>
                    )}
                  </g>
                );
              })}

              {NODES.map((node) => {
                const isActive = activeNodes.includes(node.id);
                const isGreen = node.id === "repl" || node.id === "output";
                return (
                  <g key={node.id}>
                    <motion.rect
                      x={node.x - node.w / 2}
                      y={node.y - node.h / 2}
                      width={node.w}
                      height={node.h}
                      rx={8}
                      fill={isActive ? (isGreen ? "#065f46" : "#1e3a5f") : "#18181b"}
                      stroke={isActive ? (isGreen ? "#10b981" : "#3b82f6") : "#3f3f46"}
                      strokeWidth={1.5}
                      filter={isActive ? (isGreen ? "url(#glow-g)" : "url(#glow-b)") : "none"}
                      animate={{
                        fill: isActive ? (isGreen ? "#065f46" : "#1e3a5f") : "#18181b",
                        stroke: isActive ? (isGreen ? "#10b981" : "#3b82f6") : "#3f3f46",
                      }}
                      transition={{ duration: 0.4 }}
                    />
                    <motion.text
                      x={node.x}
                      y={node.y + 4}
                      textAnchor="middle"
                      fontSize={11}
                      fontWeight={600}
                      fontFamily="monospace"
                      animate={{ fill: isActive ? "#ffffff" : "#a1a1aa" }}
                      transition={{ duration: 0.4 }}
                    >
                      {node.label}
                    </motion.text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* 右侧信息面板 */}
          <div className="w-full lg:w-[40%]">
            <div className="mb-2 font-mono text-xs text-zinc-500">
              执行细节
            </div>
            <div className="min-h-[320px] space-y-2 rounded-md border border-zinc-800 bg-zinc-950 p-3">
              <AnimatePresence mode="popLayout">
                {infoBlocks.length === 0 && (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="py-12 text-center text-xs text-zinc-600"
                  >
                    点击播放查看启动流程
                  </motion.div>
                )}
                {infoBlocks.map((block, i) => (
                  <motion.div
                    key={`${viz.currentStep}-${i}`}
                    initial={{ opacity: 0, y: 12, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.35, type: "spring", bounce: 0.3, delay: i * 0.1 }}
                    className={`rounded-md px-3 py-2.5 ${block.color}`}
                  >
                    <div className="font-mono text-[11px] font-semibold text-white">
                      {block.title}
                    </div>
                    <div className="mt-1 whitespace-pre-line text-[10px] text-white/80">
                      {block.content}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      <StepControls
        currentStep={viz.currentStep}
        totalSteps={viz.totalSteps}
        onPrev={viz.prev}
        onNext={viz.next}
        onReset={viz.reset}
        isPlaying={viz.isPlaying}
        onToggleAutoPlay={viz.toggleAutoPlay}
        stepTitle={STEP_INFO[viz.currentStep].title}
        stepDescription={STEP_INFO[viz.currentStep].desc}
      />
    </section>
  );
}
