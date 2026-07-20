import { createElement, forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import type { Components, ExtraProps } from 'react-markdown'
import type { Heading, Parent, Root, Text } from 'mdast'
import ReactMarkdown from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import { prepareMarkdown, slugify, splitFrontMatter } from '@/lib/markdown'
import { cn } from '@/lib/utils'

export interface PreviewHandle {
  scrollToHeading(id: string): void
}

interface MarkdownPreviewProps {
  markdown: string
  documentPath: string | null
  onOpenRelative?(source: string): void
  syncedScroll?: { source: 'editor' | 'preview'; ratio: number; sequence: number }
  onScrollRatio?(ratio: number): void
}

const sanitizeSchema = {
  ...defaultSchema,
  clobberPrefix: '',
  tagNames: [...(defaultSchema.tagNames ?? []), 'mark'],
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code ?? []), ['className']],
    input: ['type', 'checked', 'disabled'],
  },
}

export const MarkdownPreview = forwardRef<PreviewHandle, MarkdownPreviewProps>(function MarkdownPreview(
  { markdown, documentPath, syncedScroll, onScrollRatio, onOpenRelative },
  ref,
) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const programmaticScroll = useRef(false)
  const { frontMatter, body } = useMemo(() => splitFrontMatter(markdown), [markdown])
  const preparedBody = useMemo(() => prepareMarkdown(body), [body])

  useImperativeHandle(ref, () => ({
    scrollToHeading: (id) => {
      const element = scrollRef.current?.querySelector<HTMLElement>(`#${CSS.escape(id)}`)
      element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },
  }), [])

  useEffect(() => {
    if (!syncedScroll || syncedScroll.source !== 'editor') return
    const element = scrollRef.current
    if (!element) return
    const maximum = Math.max(0, element.scrollHeight - element.clientHeight)
    programmaticScroll.current = true
    element.scrollTop = maximum * syncedScroll.ratio
    window.setTimeout(() => { programmaticScroll.current = false }, 90)
  }, [syncedScroll])

  const components = useMemo<Components>(() => {
    const heading = (level: number) => ({ children, node: _node, ...props }: React.HTMLAttributes<HTMLHeadingElement> & ExtraProps) => {
      const tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
      return createElement(tag, props, children)
    }
    return {
      h1: heading(1), h2: heading(2), h3: heading(3), h4: heading(4), h5: heading(5), h6: heading(6),
      ul: ({ children, className, node: _node, ...props }) => (
        <ul className={cn('markdown-bullet-list', className)} {...props}>{children}</ul>
      ),
      ol: ({ children, className, node: _node, ...props }) => (
        <ol className={cn('markdown-numbered-list', className)} {...props}>{children}</ol>
      ),
      table: ({ children, node: _node, ...props }) => <div className="table-wrap"><table {...props}>{children}</table></div>,
      a: ({ href, children, node: _node, ...props }) => (
        <a
          href={href}
          {...props}
          onClick={(event) => {
            if (!href || href.startsWith('#')) return
            if (/^(https?:|mailto:)/i.test(href)) { event.preventDefault(); void window.inkstone.openExternal(href); return }
            event.preventDefault()
            onOpenRelative?.(href)
          }}
        >{children}</a>
      ),
      img: ({ src, alt, node: _node, ...props }) => <img src={src} alt={alt ?? ''} loading="lazy" {...props} />,
      input: ({ node: _node, ...props }) => <input {...props} readOnly disabled />,
    }
  }, [onOpenRelative])

  return (
    <div
      ref={scrollRef}
      className="markdown-preview h-full min-h-0 overflow-auto overscroll-contain bg-preview"
      onScroll={(event) => {
        if (programmaticScroll.current) return
        const element = event.currentTarget
        const maximum = Math.max(1, element.scrollHeight - element.clientHeight)
        onScrollRatio?.(Math.min(1, Math.max(0, element.scrollTop / maximum)))
      }}
    >
      <article>
        {frontMatter !== null && (
          <details className="front-matter">
            <summary>Document metadata</summary>
            <pre><code>{frontMatter}</code></pre>
          </details>
        )}
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath, remarkSafeHtml, remarkHeadingIds, remarkHighlight]}
          rehypePlugins={[[rehypeSanitize, sanitizeSchema], rehypeKatex]}
          components={components}
          urlTransform={(url, key) => key === 'src' ? window.inkstone.resolveAsset(documentPath, url) : url}
        >
          {preparedBody}
        </ReactMarkdown>
      </article>
    </div>
  )
})

function remarkHeadingIds(): (tree: Root) => void {
  return (tree) => {
    const counts = new Map<string, number>()
    walkMarkdown(tree, (heading) => {
      const base = slugify(textFromMarkdown(heading))
      const count = counts.get(base) ?? 0
      counts.set(base, count + 1)
      heading.data = {
        ...heading.data,
        hProperties: {
          ...(heading.data?.hProperties ?? {}),
          id: count === 0 ? base : `${base}-${count}`,
        },
      }
    })
  }
}

function walkMarkdown(node: Root | Parent, visit: (heading: Heading) => void): void {
  for (const child of node.children) {
    if (child.type === 'heading') visit(child)
    if ('children' in child && Array.isArray(child.children)) walkMarkdown(child as Parent, visit)
  }
}

function textFromMarkdown(node: Heading | Parent): string {
  return node.children.map((child) => {
    if (child.type === 'text' || child.type === 'inlineCode') return child.value
    return 'children' in child && Array.isArray(child.children) ? textFromMarkdown(child as Parent) : ''
  }).join('')
}

function remarkSafeHtml(): (tree: Root) => void {
  return (tree) => transformRawHtml(tree)
}

function transformRawHtml(parent: Parent): void {
  parent.children = parent.children.flatMap((node) => {
    if (node.type === 'html') {
      if (/^<br\s*\/?>$/i.test(node.value.trim())) return [{ type: 'break' }]
      return [{ type: 'text', value: node.value }]
    }
    if ('children' in node && Array.isArray(node.children)) transformRawHtml(node as Parent)
    return [node]
  }) as Parent['children']
}

function remarkHighlight(): (tree: Root) => void {
  return (tree) => transformHighlights(tree)
}

function transformHighlights(parent: Parent): void {
  parent.children = parent.children.flatMap((node) => {
    if ('children' in node && Array.isArray(node.children)) transformHighlights(node as Parent)
    if (node.type !== 'text' || !node.value.includes('==')) return [node]
    const parts: Array<Text | { type: 'emphasis'; data: { hName: 'mark' }; children: Text[] }> = []
    const expression = /==([^=\n]+)==/g
    let cursor = 0
    for (const match of node.value.matchAll(expression)) {
      const index = match.index ?? 0
      if (index > cursor) parts.push({ type: 'text', value: node.value.slice(cursor, index) })
      parts.push({ type: 'emphasis', data: { hName: 'mark' }, children: [{ type: 'text', value: match[1] ?? '' }] })
      cursor = index + match[0].length
    }
    if (cursor === 0) return [node]
    if (cursor < node.value.length) parts.push({ type: 'text', value: node.value.slice(cursor) })
    return parts
  }) as Parent['children']
}
