import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Root as HtmlRoot } from 'hast'
import type { Components } from 'react-markdown'
import ReactMarkdown from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'
import {
  collectHtmlHeadings,
  htmlSanitizeSchema,
  rehypeHeadingIds,
  rehypeNormalizeHtml,
  remarkHighlight,
  safeUrlTransform,
} from './html-rendering'

export { slugify } from './html-rendering'

export interface OutlineHeading {
  id: string
  level: number
  title: string
  line: number
}

const outlineProcessor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkMath)
  .use(remarkHighlight)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeNormalizeHtml)
  .use(rehypeHeadingIds)

export function extractHeadings(markdown: string): OutlineHeading[] {
  const { frontMatter, body } = splitFrontMatter(markdown)
  const lineOffset = frontMatter === null
    ? 0
    : markdown.slice(0, markdown.length - body.length).split(/\r?\n/).length - 1
  const parsed = outlineProcessor.parse(prepareMarkdown(body))
  const tree = outlineProcessor.runSync(parsed) as HtmlRoot
  return collectHtmlHeadings(tree).map((heading) => ({ ...heading, line: heading.line + lineOffset }))
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

const exportComponents: Components = {
  img: ({ node: _node, ...props }) => createElement('img', { ...props, loading: 'lazy' }),
  input: ({ node: _node, ...props }) => createElement('input', { ...props, readOnly: true, disabled: true }),
  table: ({ children, node: _node, ...props }) => createElement(
    'div',
    { className: 'table-wrap' },
    createElement('table', props, children),
  ),
}

export function buildHtmlExport(markdown: string, title: string): string {
  const { frontMatter, body } = splitFrontMatter(markdown)
  const rendered = renderToStaticMarkup(createElement(ReactMarkdown, {
    remarkPlugins: [remarkGfm, remarkMath, remarkHighlight],
    rehypePlugins: [rehypeRaw, rehypeNormalizeHtml, rehypeHeadingIds, [rehypeSanitize, htmlSanitizeSchema], rehypeKatex],
    components: exportComponents,
    urlTransform: safeUrlTransform,
  }, prepareMarkdown(body)))
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
:root{color-scheme:light dark}*{box-sizing:border-box}body{margin:0;background:#fff;color:#292724;font:16px/1.72 ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}article{max-width:780px;margin:0 auto;padding:64px 48px 96px;overflow-wrap:anywhere}h1,h2,h3,h4,h5,h6{line-height:1.25;margin:1.8em 0 .65em}h1{font-size:2.2em;border-bottom:1px solid #e8e3dc;padding-bottom:.3em}h2{font-size:1.65em}h3{font-size:1.3em}p{margin:0 0 1.1em}a{color:#9a4f2e}blockquote{margin:1.4em 0;padding:.2em 1.1em;border-left:3px solid #b6643f;color:#6a625b}code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.88em;background:#f3efea;padding:.16em .35em;border-radius:4px}pre{overflow:auto;background:#24211f;color:#f4eee7;padding:1.1em 1.25em;border-radius:10px}pre code{padding:0;background:none;color:inherit}.table-wrap{max-width:100%;overflow:auto;margin:1.4em 0;border:1px solid #ded8d0;border-radius:9px}.table-wrap table{width:100%;min-width:max-content;border-collapse:collapse}.table-wrap th,.table-wrap td{border-right:1px solid #ded8d0;border-bottom:1px solid #ded8d0;padding:.55em .75em;text-align:left}.table-wrap th{background:#f5f1ec}img,video{display:block;max-width:100%;height:auto;margin:1.5em auto;border-radius:8px}audio{width:100%;margin:1.25em 0}figure{margin:1.5em 0}figure>img,figure>video{margin-bottom:.55em}figcaption{color:#756b62;font-size:.9em;text-align:center}details{margin:1.25em 0;border:1px solid #ded8d0;border-radius:8px;padding:.75em 1em}summary{cursor:pointer;font-weight:650}dl{margin:1.2em 0}dt{font-weight:700}dd{margin:0 0 .8em 1.5em}hr{border:0;border-top:1px solid #ded8d0;margin:2.2em 0}mark{background:#f4d98a;padding:.05em .15em}.front-matter{background:#f7f4f0;color:#756b62;border:1px solid #e5dfd7}.task-list-item{list-style:none}[align="left"]>img{margin-left:0;margin-right:auto}[align="right"]>img{margin-left:auto;margin-right:0}@media(max-width:640px){article{padding:36px 22px 72px}}@media print{article{padding:24px 12px}a{color:inherit;text-decoration:none}details{break-inside:avoid}}`
