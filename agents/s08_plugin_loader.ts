/**
 * s09_plugin_loader.ts — 插件加载演示
 * 对应 Ch09: 插件生态
 * 演示插件发现 → 验证 → 加载 → 能力注入的完整流程
 * 运行: npx tsx agents/s09_plugin_loader.ts
 */

interface PluginManifest {
  name: string; version: string; description: string
  capabilities: ('tools' | 'commands' | 'hooks' | 'agents' | 'output_styles')[]
  mcp?: { command: string }
  commands?: { name: string; description: string }[]
}

const MOCK_PLUGINS: PluginManifest[] = [
  { name: '@plugin/docker-tools', version: '1.2.0', description: 'Docker 管理工具', capabilities: ['tools'], mcp: { command: 'npx @mcp/docker-server' } },
  { name: '@plugin/git-guardian', version: '0.9.0', description: 'Git 安全规则', capabilities: ['hooks'], commands: [{ name: '/git-check', description: '检查 git 安全规则' }] },
  { name: '@plugin/react-expert', version: '2.0.0', description: 'React 专家 Agent', capabilities: ['agents', 'commands'], commands: [{ name: '/react', description: '启动 React 专家' }] },
  { name: '@plugin/dark-theme', version: '1.0.0', description: '暗色输出主题', capabilities: ['output_styles'] },
]

function validatePlugin(p: PluginManifest): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  if (!p.name) errors.push('Missing name')
  if (!p.version?.match(/^\d+\.\d+\.\d+$/)) errors.push(`Invalid version: ${p.version}`)
  if (!p.capabilities?.length) errors.push('No capabilities declared')
  return { valid: errors.length === 0, errors }
}

function main() {
  console.log('╔══════════════════════════════════════════════════════╗')
  console.log('║  s09: Claude Code 插件加载演示                       ║')
  console.log('║  发现 → 验证 → 加载 → 能力注入                     ║')
  console.log('╚══════════════════════════════════════════════════════╝\n')

  console.log('━━━ 1. 插件发现 & 验证 ━━━\n')
  for (const p of MOCK_PLUGINS) {
    const { valid, errors } = validatePlugin(p)
    console.log(`  ${valid ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${p.name}@${p.version}`)
    console.log(`    ${p.description}`)
    console.log(`    能力: [${p.capabilities.join(', ')}]`)
    if (errors.length) console.log(`    \x1b[31m错误: ${errors.join(', ')}\x1b[0m`)
  }

  console.log('\n━━━ 2. 能力注入统计 ━━━\n')
  const capCount: Record<string, number> = {}
  for (const p of MOCK_PLUGINS) {
    for (const c of p.capabilities) { capCount[c] = (capCount[c] || 0) + 1 }
  }
  for (const [cap, count] of Object.entries(capCount)) {
    console.log(`  ${cap.padEnd(15)} ${count} 个插件提供`)
  }

  const allCommands = MOCK_PLUGINS.flatMap(p => (p.commands || []).map(c => ({ ...c, plugin: p.name })))
  if (allCommands.length) {
    console.log('\n━━━ 3. 注入的斜杠命令 ━━━\n')
    for (const c of allCommands) {
      console.log(`  ${c.name.padEnd(15)} ${c.description} \x1b[90m← ${c.plugin}\x1b[0m`)
    }
  }

  console.log('\n━━━ 关键洞察 ━━━')
  console.log('  真实源码: pluginLoader.ts (108KB), marketplaceManager.ts (91KB)')
  console.log('  1. 插件不只是工具 — 还有命令/Hook/Agent/输出样式')
  console.log('  2. 严格验证 — Schema + 权限 + 版本兼容')
  console.log('  3. 来源多样 — 官方市场 / Git / 本地目录 / DXT 打包')
}
main()
