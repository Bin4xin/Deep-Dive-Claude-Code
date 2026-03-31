"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import sourcesData from "@/data/generated/sources.json";

interface SourceFile {
  id: string;
  path: string;
  content: string;
  lines: number;
  sizeKB: number;
}

function highlightLine(line: string): React.ReactNode[] {
  const trimmed = line.trimStart();
  if (trimmed.startsWith("//")) {
    return [<span key={0} className="text-zinc-500 italic">{line}</span>];
  }
  if (trimmed.startsWith("/*") || trimmed.startsWith("*")) {
    return [<span key={0} className="text-zinc-500 italic">{line}</span>];
  }
  if (trimmed.startsWith("import ") || trimmed.startsWith("export ")) {
    return [<span key={0} className="text-blue-400/70">{line}</span>];
  }

  const parts = line.split(
    /(\b(?:import|from|export|default|const|let|var|function|class|return|if|else|while|for|of|in|new|this|async|await|type|interface|extends|throw|try|catch|finally|switch|case|break|continue|yield|typeof|instanceof|void|null|undefined|true|false|private|public|protected|readonly|static|abstract|enum)\b|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\/\/.*$|\b\d+(?:\.\d+)?\b)/
  );

  const keywords = new Set([
    "import","from","export","default","const","let","var","function","class","return",
    "if","else","while","for","of","in","new","this","async","await","type","interface",
    "extends","throw","try","catch","finally","switch","case","break","continue","yield",
    "typeof","instanceof","void","null","undefined","true","false","private","public",
    "protected","readonly","static","abstract","enum",
  ]);

  return parts.map((part, idx) => {
    if (!part) return null;
    if (keywords.has(part)) return <span key={idx} className="text-blue-400 font-medium">{part}</span>;
    if (part.startsWith("//")) return <span key={idx} className="text-zinc-500 italic">{part}</span>;
    if ((part.startsWith('"') && part.endsWith('"')) || (part.startsWith("'") && part.endsWith("'")))
      return <span key={idx} className="text-emerald-400">{part}</span>;
    if (/^\d+(?:\.\d+)?$/.test(part)) return <span key={idx} className="text-orange-400">{part}</span>;
    return <span key={idx}>{part}</span>;
  });
}

export default function SourcePage({ params }: { params: Promise<{ file: string }> }) {
  const { file: fileId } = use(params);
  const [searchTerm, setSearchTerm] = useState("");

  const source = useMemo(() => {
    return (sourcesData as SourceFile[]).find((s) => s.id === fileId);
  }, [fileId]);

  if (!source) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <p className="text-zinc-500">源码文件未找到: {fileId}</p>
        <Link href="/" className="text-blue-400">← 返回首页</Link>
      </div>
    );
  }

  const lines = source.content.split("\n");
  const filteredLines = searchTerm
    ? lines.map((line, i) => ({ line, num: i + 1, match: line.toLowerCase().includes(searchTerm.toLowerCase()) }))
    : lines.map((line, i) => ({ line, num: i + 1, match: true }));

  const matchCount = searchTerm ? filteredLines.filter((l) => l.match).length : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* 导航 */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-zinc-500">
        <Link href="/" className="hover:text-white">首页</Link>
        <span>/</span>
        <span className="text-white">源码</span>
        <span>/</span>
        <span className="font-mono text-blue-400">{source.path}</span>
      </nav>

      {/* 文件信息 */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono">{source.path}</h1>
          <div className="mt-1 flex items-center gap-4 text-sm text-zinc-500">
            <span>{source.sizeKB} KB</span>
            <span>{source.lines} 行</span>
          </div>
        </div>
        {/* 搜索 */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜索代码..."
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-blue-500"
          />
          {searchTerm && (
            <span className="text-xs text-zinc-500">{matchCount} 匹配</span>
          )}
        </div>
      </div>

      {/* 源码 */}
      <div className="rounded-xl border border-zinc-700 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-zinc-700 bg-zinc-900 px-4 py-2">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-red-400" />
            <span className="h-3 w-3 rounded-full bg-yellow-400" />
            <span className="h-3 w-3 rounded-full bg-green-400" />
          </div>
          <span className="font-mono text-xs text-zinc-400">src/{source.path}</span>
        </div>
        <div className="max-h-[75vh] overflow-auto bg-zinc-950">
          <pre className="p-4 text-xs leading-5">
            <code>
              {filteredLines.map(({ line, num, match }) => (
                <div
                  key={num}
                  className={`flex ${
                    searchTerm
                      ? match
                        ? "bg-amber-500/10"
                        : "opacity-30"
                      : ""
                  }`}
                >
                  <span className="mr-4 inline-block w-12 shrink-0 select-none text-right text-zinc-600 border-r border-zinc-800 pr-3 mr-3">
                    {num}
                  </span>
                  <span className="text-zinc-200 whitespace-pre">
                    {highlightLine(line)}
                  </span>
                </div>
              ))}
            </code>
          </pre>
        </div>
      </div>
    </div>
  );
}
