// 构建时将核心源码编译为 JSON
// 运行: node scripts/build-sources.mjs

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = join(__dirname, '../../source-code');
const outDir = join(__dirname, '../src/data/generated');

mkdirSync(outDir, { recursive: true });

const SOURCE_FILES = [
  { id: "QueryEngine", path: "QueryEngine.ts" },
  { id: "query", path: "query.ts" },
  { id: "Tool", path: "Tool.ts" },
  { id: "tools", path: "tools.ts" },
  { id: "prompts", path: "constants/prompts.ts" },
  { id: "bashSecurity", path: "tools/BashTool/bashSecurity.ts" },
  { id: "bashPermissions", path: "tools/BashTool/bashPermissions.ts" },
  { id: "AgentTool", path: "tools/AgentTool/AgentTool.tsx" },
  { id: "permissions", path: "utils/permissions/permissions.ts" },
  { id: "filesystem", path: "utils/permissions/filesystem.ts" },
  { id: "mcp-client", path: "services/mcp/client.ts" },
  { id: "mcp-auth", path: "services/mcp/auth.ts" },
  { id: "mcp-config", path: "services/mcp/config.ts" },
  { id: "compact", path: "services/compact/compact.ts" },
  { id: "microCompact", path: "services/compact/microCompact.ts" },
  { id: "autoCompact", path: "services/compact/autoCompact.ts" },
  { id: "main", path: "main.tsx" },
  { id: "dev-entry", path: "dev-entry.ts" },
  { id: "cli", path: "cli.tsx" },
];

const sources = [];

for (const file of SOURCE_FILES) {
  try {
    const content = readFileSync(join(srcDir, file.path), 'utf-8');
    const lines = content.split('\n').length;
    const sizeKB = Math.round(Buffer.byteLength(content, 'utf-8') / 1024);
    sources.push({ id: file.id, path: file.path, content, lines, sizeKB });
  } catch (e) {
    console.warn(`Warning: source-code/${file.path} not found`);
  }
}

writeFileSync(join(outDir, 'sources.json'), JSON.stringify(sources));
console.log(`Built ${sources.length} source files → src/data/generated/sources.json`);
