import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { MarkdownPreview } from './MarkdownPreview'

function render(markdown: string): string {
  return renderToStaticMarkup(<MarkdownPreview markdown={markdown} documentPath={null} />)
}

describe('MarkdownPreview', () => {
  it('renders front matter as collapsible metadata and wraps wide tables', () => {
    const html = render('---\ntitle: Test\n---\n\n| Name | Value |\n| --- | --- |\n| Inkstone | Editor |')

    expect(html).toContain('<details class="front-matter"><summary>Document metadata</summary>')
    expect(html).toContain('<div class="table-wrap"><table>')
  })

  it('keeps repeated heading anchors deterministic', () => {
    const markdown = '# Repeated heading\n\n## Repeated heading'

    expect(render(markdown)).toContain('<h1 id="repeated-heading">')
    expect(render(markdown)).toContain('<h2 id="repeated-heading-1">')
  })

  it('restores bullet and numbered list markers after the Tailwind reset', () => {
    const html = render('- Bullet\n  - Nested bullet\n\n3. Third\n4. Fourth')

    expect(html.match(/<ul class="markdown-bullet-list">/g)).toHaveLength(2)
    expect(html).toContain('<ol class="markdown-numbered-list" start="3">')
    expect(html).toContain('<li>Third</li>')
    expect(html).toContain('<li>Fourth</li>')
  })

  it('keeps pipes inside table code spans in a single cell', () => {
    const html = render('| Label | Value |\n| --- | --- |\n| Code | `a | b` |')

    expect(html).toContain('<tbody><tr><td>Code</td><td><code>a | b</code></td></tr></tbody>')
  })

  it('shows raw HTML as text instead of executing or dropping it', () => {
    const html = render('Raw HTML: <script>alert("no")</script>')

    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;alert(&quot;no&quot;)&lt;/script&gt;')
  })
})
