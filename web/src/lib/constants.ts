export const CHAPTER_ORDER = [
  "ch01","ch02","ch03","ch04","ch05","ch06",
  "ch07","ch08","ch09","ch10","ch11","ch12","ch13",
] as const;

export type ChapterId = typeof CHAPTER_ORDER[number];

export const CHAPTER_META: Record<string, {
  title: string;
  subtitle: string;
  motto: string;
  layer: "engine" | "tools" | "context" | "ecosystem" | "hidden";
  sourceFiles: string[];
  sourceSize: string;
  demoFile: string;
  needsApiKey: boolean;
  prev: string | null;
}> = {
  ch01: {
    title: "Agent Loop", subtitle: "Heart of the conversation loop", motto: "Every Agent is essentially a loop: call model \u2192 execute tool \u2192 return result",
    layer: "engine", sourceFiles: ["QueryEngine.ts","query.ts","query/stopHooks.ts"], sourceSize: "113KB",
    demoFile: "s01_query_engine.ts", needsApiKey: true, prev: null,
  },
  ch02: {
    title: "Tool System", subtitle: "Registry & dispatch of 50+ tools", motto: "Register a handler, gain a capability \u2014 the loop never changes",
    layer: "engine", sourceFiles: ["Tool.ts","tools.ts","tools/"], sourceSize: "46KB+",
    demoFile: "s02_tool_system.ts", needsApiKey: false, prev: "ch01",
  },
  ch03: {
    title: "Prompt Engineering", subtitle: "Dynamic assembly pipeline", motto: "System Prompt is not a string \u2014 it\u2019s a dynamically assembled pipeline",
    layer: "engine", sourceFiles: ["constants/prompts.ts","utils/claudemd.ts","utils/messages.ts"], sourceSize: "287KB",
    demoFile: "s03_prompt_pipeline.ts", needsApiKey: false, prev: "ch02",
  },
  ch04: {
    title: "Shell Security", subtitle: "300KB+ security validation", motto: "The most powerful tool needs the tightest security",
    layer: "tools", sourceFiles: ["BashTool/bashSecurity.ts","BashTool/bashPermissions.ts","bash/bashParser.ts"], sourceSize: "535KB",
    demoFile: "s04_bash_security.ts", needsApiKey: false, prev: "ch03",
  },
  ch05: {
    title: "Permission Engine", subtitle: "Every operation is checked", motto: "Permissions are not an afterthought \u2014 they are the skeleton of the architecture",
    layer: "tools", sourceFiles: ["permissions/permissions.ts","permissions/filesystem.ts","fsOperations.ts"], sourceSize: "136KB",
    demoFile: "s05_permissions.ts", needsApiKey: false, prev: "ch04",
  },
  ch06: {
    title: "Context Management", subtitle: "Infinite work in a finite window", motto: "Context always fills up \u2014 the key is how to compress",
    layer: "context", sourceFiles: ["compact/compact.ts","compact/microCompact.ts","SessionMemory/","autoDream/"], sourceSize: "130KB+",
    demoFile: "s06_context_compact.ts", needsApiKey: true, prev: "ch05",
  },
  ch07: {
    title: "MCP Protocol", subtitle: "Unified tool calling standard", motto: "MCP lets any service become an AI tool",
    layer: "ecosystem", sourceFiles: ["mcp/client.ts","mcp/auth.ts","mcp/config.ts"], sourceSize: "253KB",
    demoFile: "s07_mcp_protocol.ts", needsApiKey: false, prev: "ch06",
  },
  ch08: {
    title: "Plugin Ecosystem", subtitle: "Extensible capability boundary", motto: "Plugins are capability multipliers",
    layer: "ecosystem", sourceFiles: ["plugins/pluginLoader.ts","plugins/marketplaceManager.ts"], sourceSize: "199KB",
    demoFile: "s08_plugin_loader.ts", needsApiKey: false, prev: "ch07",
  },
  ch09: {
    title: "Multi-Agent", subtitle: "Agent/Team/Swarm", motto: "Scale comes from division of labor, not larger context",
    layer: "ecosystem", sourceFiles: ["AgentTool/AgentTool.tsx","shared/spawnMultiAgent.ts","swarm/"], sourceSize: "300KB+",
    demoFile: "s09_multi_agent.ts", needsApiKey: false, prev: "ch08",
  },
  ch10: {
    title: "CLI Transport", subtitle: "Bridge from terminal to remote", motto: "The transport layer determines where an Agent can run",
    layer: "ecosystem", sourceFiles: ["cli/transports/","ink.ts","hooks/"], sourceSize: "100KB+",
    demoFile: "s10_transport.ts", needsApiKey: false, prev: "ch09",
  },
  ch11: {
    title: "Bootstrap", subtitle: "From Enter to prompt", motto: "Fast path determines experience, full path determines capability",
    layer: "engine", sourceFiles: ["dev-entry.ts","entrypoints/cli.tsx","main.tsx"], sourceSize: "785KB",
    demoFile: "s11_bootstrap.ts", needsApiKey: false, prev: "ch10",
  },
  ch12: {
    title: "Production Patterns", subtitle: "Demo \u2192 Production", motto: "Making an Agent reliable requires 10x engineering effort",
    layer: "engine", sourceFiles: ["sessionStorage.ts","gracefulShutdown.ts","analytics/","api/errors.ts"], sourceSize: "300KB+",
    demoFile: "s12_production.ts", needsApiKey: false, prev: "ch11",
  },
  ch13: {
    title: "Hidden Features", subtitle: "Feature flag-gated hidden modules", motto: "Behind every feature('FLAG') lies an unreleased product decision",
    layer: "hidden", sourceFiles: ["buddy/","commands/ultraplan.tsx","utils/undercover.ts","entrypoints/cli.tsx"], sourceSize: "500KB+",
    demoFile: "s13_hidden_features.ts", needsApiKey: false, prev: "ch12",
  },
};

export const LAYERS = [
  { id: "engine" as const, label: "Engine Core", color: "#3B82F6", chapters: ["ch01","ch02","ch03","ch11","ch12"] },
  { id: "tools" as const, label: "Tools & Security", color: "#10B981", chapters: ["ch04","ch05"] },
  { id: "context" as const, label: "Context Management", color: "#8B5CF6", chapters: ["ch06"] },
  { id: "ecosystem" as const, label: "Protocols & Collaboration", color: "#EF4444", chapters: ["ch07","ch08","ch09","ch10"] },
  { id: "hidden" as const, label: "Hidden Features", color: "#F59E0B", chapters: ["ch13"] },
] as const;

export const LAYER_COLORS: Record<string, string> = {
  engine: "#3B82F6",
  tools: "#10B981",
  context: "#8B5CF6",
  ecosystem: "#EF4444",
  hidden: "#F59E0B",
};
