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

  it('drops executable HTML instead of rendering or preserving it', () => {
    const html = render('Raw HTML: <script>alert("no")</script>')

    expect(html).not.toContain('<script>')
    expect(html).not.toContain('alert(&quot;no&quot;)')
    expect(html).toContain('<p>Raw HTML: </p>')
  })

  it('renders nested HTML and preserves safe image presentation', () => {
    const source = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
    const html = render(`<div align="left">
  <img src="${source}" alt="Product card" style="zoom:80%;" />
</div>`)

    expect(html).toContain('<div align="left">')
    expect(html).toContain(`<img src="${source}" alt="Product card"`)
    expect(html).toContain('style="width:80%"')
    expect(html).not.toContain('&lt;div')
  })

  it('supports semantic HTML, disclosure widgets, figures, and definition lists', () => {
    const html = render(`<section class="release-note" data-kind="update">
<details open><summary>Release notes</summary><p>Now supports <mark>safe HTML</mark>.</p></details>
<figure><div role="img" aria-label="Preview placeholder">Preview</div><figcaption>Figure 1</figcaption></figure>
<dl><dt>Parser</dt><dd>HTML AST</dd></dl>
</section>`)

    expect(html).toContain('<section class="release-note" data-kind="update">')
    expect(html).toContain('<details open=""><summary>Release notes</summary>')
    expect(html).toContain('<mark>safe HTML</mark>')
    expect(html).toContain('<figure><div role="img" aria-label="Preview placeholder">Preview</div><figcaption>Figure 1</figcaption></figure>')
    expect(html).toContain('<dl><dt>Parser</dt><dd>HTML AST</dd></dl>')
  })

  it('parses raw HTML tables through the same responsive table component', () => {
    const html = render(`<table aria-label="Compatibility">
<caption>Support matrix</caption>
<thead><tr><th scope="col">Feature</th><th scope="col">Status</th></tr></thead>
<tbody><tr><td rowspan="2">HTML</td><td>Ready</td></tr><tr><td>Sanitized</td></tr></tbody>
</table>`)

    expect(html).toContain('<div class="table-wrap"><table aria-label="Compatibility">')
    expect(html).toContain('<caption>Support matrix</caption>')
    expect(html).toContain('<td rowSpan="2">HTML</td>')
  })

  it('keeps safe presentation styles while removing active or layout-breaking CSS', () => {
    const html = render('<p class="callout" style="color:#A55331; text-align:center; position:fixed; background-image:url(javascript:alert(1))" onclick="alert(2)">Styled safely</p>')

    expect(html).toContain('<p class="callout" style="color:#a55331;text-align:center">Styled safely</p>')
    expect(html).not.toContain('position')
    expect(html).not.toContain('background-image')
    expect(html).not.toContain('onclick')
    expect(html).not.toContain('javascript:')
  })

  it('normalizes new-window links and strips unsafe URLs and event handlers', () => {
    const html = render('<a href="https://example.com" target="_blank" onclick="steal()">Safe link</a> <a href="javascript:steal()">Unsafe link</a>')

    expect(html).toContain('href="https://example.com" target="_blank" rel="noopener noreferrer"')
    expect(html).toContain('<a>Unsafe link</a>')
    expect(html).not.toContain('onclick')
    expect(html).not.toContain('javascript:')
  })

  it('assigns deterministic anchors across Markdown and raw HTML headings', () => {
    const html = render('<div id="introduction"></div>\n\n# Introduction\n\n<h2>Introduction</h2>\n\n<h3 id="custom-anchor">Custom</h3>')

    expect(html).toContain('<h1 id="introduction-1">')
    expect(html).toContain('<h2 id="introduction-2">')
    expect(html).toContain('<h3 id="custom-anchor">')
  })

  it('supports safe media but disables autoplay and unsupported embeds', () => {
    const html = render('<video src="movie.mp4" autoplay poster="cover.jpg"></video><iframe src="https://example.com">Fallback</iframe>')

    expect(html).toContain('<video src="movie.mp4" poster="cover.jpg" controls=""></video>')
    expect(html).not.toContain('autoplay')
    expect(html).not.toContain('<iframe')
    expect(html).toContain('Fallback')
  })

  it('sanitizes responsive image candidates without dropping picture markup', () => {
    const html = render('<picture><source srcset="small.png 1x, javascript:steal() 2x, large.png 960w"><img src="fallback.png" srcset="fallback.png 1x, data:text/html;base64,AAAA 2x" alt="Responsive"></picture>')

    expect(html).toContain('<picture><source srcSet="small.png 1x, large.png 960w"/>')
    expect(html).toContain('srcSet="fallback.png 1x"')
    expect(html).not.toContain('javascript:')
    expect(html).not.toContain('data:text/html')
  })

  it('rejects non-image data URLs in HTML image markup', () => {
    const html = render('<img src="data:text/html;base64,PHNjcmlwdD4=" alt="Unsafe" />')

    expect(html).toContain('<img alt="Unsafe"')
    expect(html).not.toContain('src=')
    expect(html).not.toContain('data:text/html')
  })
})
