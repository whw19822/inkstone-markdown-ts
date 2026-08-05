import { createElement, forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import type { Components, ExtraProps } from 'react-markdown'
import ReactMarkdown from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import {
  htmlSanitizeSchema,
  rehypeHeadingIds,
  rehypeNormalizeHtml,
  remarkHighlight,
  safeUrlTransform,
  sanitizeSrcSet,
} from '@/lib/html-rendering'
import { prepareMarkdown, splitFrontMatter } from '@/lib/markdown'
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
    const resolveAsset = (source: string): string => {
      if (/^(?:data:|https?:)/i.test(source) || typeof window === 'undefined' || !window.inkstone) return source
      return window.inkstone.resolveAsset(documentPath, source)
    }
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
      img: ({ src, srcSet, alt, node: _node, ...props }) => (
        <img src={src || undefined} srcSet={srcSet ? sanitizeSrcSet(srcSet, resolveAsset) : undefined} alt={alt ?? ''} loading="lazy" {...props} />
      ),
      source: ({ srcSet, node: _node, ...props }) => (
        <source srcSet={srcSet ? sanitizeSrcSet(srcSet, resolveAsset) : undefined} {...props} />
      ),
      input: ({ node: _node, ...props }) => <input {...props} readOnly disabled />,
    }
  }, [documentPath, onOpenRelative])

  return (
    <div
      ref={scrollRef}
      className="markdown-preview h-full min-h-0 min-w-0 overflow-auto overscroll-contain bg-preview"
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
          remarkPlugins={[remarkGfm, remarkMath, remarkHighlight]}
          rehypePlugins={[rehypeRaw, rehypeNormalizeHtml, rehypeHeadingIds, [rehypeSanitize, htmlSanitizeSchema], rehypeKatex]}
          components={components}
          urlTransform={(url, key, node) => {
            const safeUrl = safeUrlTransform(url, key, node)
            if (!safeUrl || (key !== 'src' && key !== 'poster') || /^(?:data:|https?:)/i.test(safeUrl)) return safeUrl
            if (typeof window === 'undefined' || !window.inkstone) return safeUrl
            return window.inkstone.resolveAsset(documentPath, safeUrl)
          }}
        >
          {preparedBody}
        </ReactMarkdown>
      </article>
    </div>
  )
})
