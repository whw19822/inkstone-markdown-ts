import { marked } from 'marked'
import markedKatex from 'marked-katex-extension'

export interface OutlineHeading {
  id: string
  level: number
  title: string
  line: number
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/<[^>]+>/g, '')
    .replace(/[`*_~[\]()]|&[a-z]+;/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-') || 'section'
}

export function extractHeadings(markdown: string): OutlineHeading[] {
  const counts = new Map<string, number>()
  const headings: OutlineHeading[] = []
  let inFence = false
  markdown.split(/\r?\n/).forEach((line, index) => {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence
      return
    }
    if (inFence) return
    const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line)
    if (!match?.[1] || !match[2]) return
    const title = match[2].replace(/!?(\[)([^\]]+)(\]\([^)]*\))/g, '$2').replace(/[*_`~]/g, '').trim()
    const base = slugify(title)
    const count = counts.get(base) ?? 0
    counts.set(base, count + 1)
    headings.push({ id: count === 0 ? base : `${base}-${count}`, level: match[1].length, title, line: index + 1 })
  })
  return headings
}

export function prepareMarkdown(markdown: string): string {
  let inFence = false
  return markdown.split(/\r?\n/).map((line) => {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence
      return line
    }
    if (inFence || !line.includes('|') || !line.includes('`')) return line
    return line.replace(/(`+)([^`\n]*\|[^`\n]*)\1/g, (_span, ticks: string, content: string) =>
      `${ticks}${content.replaceAll('|', '\\|')}${ticks}`,
    )
  }).join('\n')
}

export function splitFrontMatter(markdown: string): { frontMatter: string | null; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(markdown)
  return match ? { frontMatter: match[1] ?? '', body: markdown.slice(match[0].length) } : { frontMatter: null, body: markdown }
}

marked.use(markedKatex({ throwOnError: false, nonStandard: true }))

export function buildHtmlExport(markdown: string, title: string): string {
  const { frontMatter, body } = splitFrontMatter(markdown)
  const escapedRawHtml = prepareMarkdown(body).replace(/<(?!br\s*\/?\s*>)[^>]+>/gi, (value) => escapeHtml(value))
  const enhanced = escapedRawHtml.replace(/==([^=\n]+)==/g, '<mark>$1</mark>')
  const rendered = marked.parse(enhanced, { gfm: true, breaks: false, async: false }) as string
  const frontMatterHtml = frontMatter === null ? '' : `<pre class="front-matter"><code>${escapeHtml(frontMatter)}</code></pre>`
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title><style>${exportStyles}</style></head>
<body><article>${frontMatterHtml}${rendered}</article></body></html>`
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
}

const exportStyles = `
:root{color-scheme:light dark}*{box-sizing:border-box}body{margin:0;background:#fff;color:#292724;font:16px/1.72 ui-serif,Georgia,serif}article{max-width:780px;margin:0 auto;padding:64px 48px 96px}h1,h2,h3,h4,h5,h6{font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.25;margin:1.8em 0 .65em}h1{font-size:2.2em;border-bottom:1px solid #e8e3dc;padding-bottom:.3em}h2{font-size:1.65em}h3{font-size:1.3em}p{margin:0 0 1.1em}a{color:#9a4f2e}blockquote{margin:1.4em 0;padding:.2em 1.1em;border-left:3px solid #b6643f;color:#6a625b}code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.88em;background:#f3efea;padding:.16em .35em;border-radius:4px}pre{overflow:auto;background:#24211f;color:#f4eee7;padding:1.1em 1.25em;border-radius:10px}pre code{padding:0;background:none;color:inherit}table{width:100%;border-collapse:collapse;margin:1.4em 0}th,td{border:1px solid #ded8d0;padding:.55em .75em;text-align:left}th{background:#f5f1ec}img{max-width:100%;height:auto;border-radius:8px}hr{border:0;border-top:1px solid #ded8d0;margin:2.2em 0}mark{background:#f4d98a;padding:.05em .15em}.front-matter{background:#f7f4f0;color:#756b62;border:1px solid #e5dfd7}.task-list-item{list-style:none}@media print{article{padding:24px 12px}a{color:inherit;text-decoration:none}}`
