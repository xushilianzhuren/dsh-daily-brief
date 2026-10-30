/**
 * dsh-daily-brief · 晨报台（Host插件·零依赖·无构建）
 * 开工一屏简报：最近改动的文件/待办标记/台账末行/会话交接档。工具 daily_brief 一键生成。
 */
export const name = 'daily-brief'
export const inject = ['systemPrompt', 'tools']
const SECTION = 'daily-brief:rules'
const DEFAULTS = { order: 97, enabled: true, tool: true }

function norm(c) {
  const r = c ?? {}
  return { order: typeof r.order === 'number' ? r.order : DEFAULTS.order, enabled: r.enabled !== false, tool: r.tool !== false }
}

function renderSection() {
  return [
    '## 晨报台 · 开工简报纪律',
    '',
    '每个工作日第一次接任务时，先跑 daily_brief 生成一屏简报再看任务：①过去24h工作区改动（哪些文件动了=别人/别的会话干过什么）②待办标记（TODO/FIXME 扫描）③台账末行（近期记了什么）④交接档（HANDOFF.md 在不在）。',
    '简报的意义=冷启动不再瞎猜：知道地上有什么、谁动过、欠着什么，再动手。',
  ].join('\n')
}

export default function plugin(ctx) {
  const cfg = norm(ctx.config?.[SECTION])
  if (!cfg.enabled) { ctx.logger?.info?.('dsh-daily-brief: disabled'); return }
  ctx.registerSection?.({ name: SECTION, order: cfg.order, render: () => renderSection() })

  if (cfg.tool) {
    ctx.registerTool?.({
      name: 'daily_brief',
      description: '生成开工一屏简报：24h内改动文件/TODO待办/台账末行/交接档。只读，不写任何文件。',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
      output: { schema: { type: 'object', properties: { report: { type: 'string' } }, required: ['report'], additionalProperties: false } },
      execute: async () => {
        try {
          const fs = await import('node:fs/promises')
          const path = await import('node:path')
          let root = process.cwd()
          for (let i = 0; i < 24; i++) {
            try { await fs.access(path.join(root, 'package.json')); break } catch {}
            const parent = path.join(root, '..')
            if (parent === root) break
            root = parent
          }
          const now = Date.now()
          const lines = ['【开工简报】' + new Date().toLocaleString('zh-CN'), '根目录: ' + root, '']
          // ① 24h改动
          const changed = []
          async function walk(dir, depth) {
            if (depth > 3 || changed.length > 40) return
            let ents = []
            try { ents = await fs.readdir(dir, { withFileTypes: true }) } catch { return }
            for (const e of ents) {
              if (e.name.startsWith('.') || e.name === 'node_modules') continue
              const p = path.join(dir, e.name)
              if (e.isDirectory()) await walk(p, depth + 1)
              else {
                try { const st = await fs.stat(p); if (now - st.mtimeMs < 86400000) changed.push(`${st.mtime.toISOString().slice(5, 16).replace('T', ' ')}  ${path.relative(root, p)}`) } catch {}
              }
            }
          }
          await walk(root, 0)
          lines.push('① 过去24h改动 ' + changed.length + ' 处' + (changed.length ? '：' : ''))
          changed.sort().slice(0, 15).forEach(c => lines.push('  ' + c))
          // ② TODO扫描
          const todos = []
          async function scanTodo(dir, depth) {
            if (depth > 2 || todos.length > 12) return
            let ents = []
            try { ents = await fs.readdir(dir, { withFileTypes: true }) } catch { return }
            for (const e of ents) {
              if (e.name.startsWith('.') || e.name === 'node_modules') continue
              const p = path.join(dir, e.name)
              if (e.isDirectory()) await scanTodo(p, depth + 1)
              else if (/\.(md|js|ts|py|txt)$/.test(e.name)) {
                try {
                  const txt = await fs.readFile(p, 'utf8')
                  txt.split('\n').forEach((l, i) => {
                    if (/TODO|FIXME/i.test(l) && todos.length < 12) todos.push(`  ${path.relative(root, p)}:${i + 1}  ${l.trim().slice(0, 70)}`)
                  })
                } catch {}
              }
            }
          }
          await scanTodo(root, 0)
          lines.push('', '② 待办标记 ' + todos.length + ' 处：'); todos.forEach(t => lines.push(t))
          // ③ 台账末行
          try {
            const names = (await fs.readdir(path.join(root, 'scripts'))).filter(n => n.endsWith('.jsonl')).slice(0, 64)
            lines.push('', '③ 台账末行：')
            for (const n of names.slice(0, 6)) {
              try {
                const txt = (await fs.readFile(path.join(root, 'scripts', n), 'utf8')).trim()
                const last = txt.split('\n').filter(l => l.trim()).pop() ?? ''
                lines.push(`  ${n} ← ${last.slice(0, 90)}`)
              } catch {}
            }
          } catch {}
          // ④ 交接档
          try { await fs.access(path.join(root, 'HANDOFF.md')); lines.push('', '④ 交接档: HANDOFF.md 在——开工先读') }
          catch { lines.push('', '④ 交接档: 无') }
          return { report: lines.join('\n') }
        } catch (error) {
          return { report: 'daily-brief 内部错：' + String(error?.message ?? error).slice(0, 200) }
        }
      },
    })
  }
  ctx.logger?.info?.('dsh-daily-brief: section %s registered (order=%d)', SECTION, cfg.order)
}
