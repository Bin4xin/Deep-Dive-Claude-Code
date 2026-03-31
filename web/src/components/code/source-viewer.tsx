"use client";

import { useMemo } from "react";

interface SourceViewerProps {
  source: string;
  filename: string;
}

function highlightLine(line: string): React.ReactNode[] {
  const trimmed = line.trimStart();
  if (trimmed.startsWith("//")) {
    return [<span key={0} className="text-zinc-500 italic">{line}</span>];
  }

  const keywordSet = new Set([
    "import", "from", "export", "default", "const", "let", "var",
    "function", "class", "return", "if", "else", "while", "for",
    "of", "in", "new", "this", "async", "await", "type", "interface",
    "extends", "implements", "throw", "try", "catch", "finally",
    "switch", "case", "break", "continue", "yield", "typeof",
    "instanceof", "void", "null", "undefined", "true", "false",
  ]);

  const parts = line.split(
    /(\b(?:import|from|export|default|const|let|var|function|class|return|if|else|while|for|of|in|new|this|async|await|type|interface|extends|implements|throw|try|catch|finally|switch|case|break|continue|yield|typeof|instanceof|void|null|undefined|true|false)\b|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\/\/.*$|\b\d+(?:\.\d+)?\b)/
  );

  return parts.map((part, idx) => {
    if (!part) return null;
    if (keywordSet.has(part)) {
      return <span key={idx} className="text-blue-400 font-medium">{part}</span>;
    }
    if (part.startsWith("//")) {
      return <span key={idx} className="text-zinc-500 italic">{part}</span>;
    }
    if (
      (part.startsWith('"') && part.endsWith('"')) ||
      (part.startsWith("'") && part.endsWith("'")) ||
      (part.startsWith("`") && part.endsWith("`"))
    ) {
      return <span key={idx} className="text-emerald-400">{part}</span>;
    }
    if (/^\d+(?:\.\d+)?$/.test(part)) {
      return <span key={idx} className="text-orange-400">{part}</span>;
    }
    return <span key={idx}>{part}</span>;
  });
}

export function SourceViewer({ source, filename }: SourceViewerProps) {
  const lines = useMemo(() => source.split("\n"), [source]);

  return (
    <div className="rounded-lg border border-zinc-700">
      <div className="flex items-center gap-2 border-b border-zinc-700 px-4 py-2">
        <div className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-red-400" />
          <span className="h-3 w-3 rounded-full bg-yellow-400" />
          <span className="h-3 w-3 rounded-full bg-green-400" />
        </div>
        <span className="font-mono text-xs text-zinc-400">{filename}</span>
      </div>
      <div className="overflow-x-auto bg-zinc-950">
        <pre className="p-4 text-xs leading-5">
          <code>
            {lines.map((line, i) => (
              <div key={i} className="flex">
                <span className="mr-4 inline-block w-8 shrink-0 select-none text-right text-zinc-600">
                  {i + 1}
                </span>
                <span className="text-zinc-200">
                  {highlightLine(line)}
                </span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}
