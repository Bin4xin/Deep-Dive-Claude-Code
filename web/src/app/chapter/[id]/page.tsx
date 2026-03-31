import Link from "next/link";
import { CHAPTER_ORDER, CHAPTER_META, LAYER_COLORS } from "@/lib/constants";
import { ChapterDetailClient } from "./client";

export function generateStaticParams() {
  return CHAPTER_ORDER.map((id) => ({ id }));
}

export default async function ChapterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ch = CHAPTER_META[id];
  const idx = CHAPTER_ORDER.indexOf(id as typeof CHAPTER_ORDER[number]);

  if (!ch) return <div className="p-8">Chapter not found</div>;

  const prevId = idx > 0 ? CHAPTER_ORDER[idx - 1] : null;
  const nextId = idx < CHAPTER_ORDER.length - 1 ? CHAPTER_ORDER[idx + 1] : null;
  const layerColor = LAYER_COLORS[ch.layer];

  return (
    <div>
      {/* 章节头 */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{ backgroundColor: layerColor }}
          />
          <span className="text-sm text-zinc-500">Chapter {idx + 1}</span>
          <span className="text-xs text-zinc-600">{ch.needsApiKey ? "🔑" : "▶"}</span>
        </div>
        <h1 className="text-3xl font-bold">{ch.title}</h1>
        <p className="mt-1 text-lg text-zinc-400">{ch.subtitle}</p>
        <blockquote className="mt-3 border-l-2 border-zinc-700 pl-4 text-sm italic text-zinc-500">
          &ldquo;{ch.motto}&rdquo;
        </blockquote>
      </div>

      {/* 交互式内容 */}
      <ChapterDetailClient chapterId={id} />

      {/* 前后导航 */}
      <div className="mt-12 flex justify-between border-t border-zinc-800 pt-6">
        {prevId ? (
          <Link href={`/chapter/${prevId}`} className="card max-w-xs hover:border-zinc-600 no-underline">
            <div className="text-xs text-zinc-500">← 上一章</div>
            <div className="mt-1 font-medium text-zinc-200">{CHAPTER_META[prevId].title}</div>
          </Link>
        ) : <div />}
        {nextId ? (
          <Link href={`/chapter/${nextId}`} className="card max-w-xs text-right hover:border-zinc-600 no-underline">
            <div className="text-xs text-zinc-500">下一章 →</div>
            <div className="mt-1 font-medium text-zinc-200">{CHAPTER_META[nextId].title}</div>
          </Link>
        ) : <div />}
      </div>
    </div>
  );
}
