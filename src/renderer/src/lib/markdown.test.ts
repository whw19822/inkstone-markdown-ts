import { describe, expect, it } from 'vitest'
import { buildHtmlExport, extractHeadings, prepareMarkdown } from './markdown'

describe('extractHeadings', () => {
  it('ignores fenced code and disambiguates duplicate slugs', () => {
    expect(extractHeadings('# Intro\n```md\n# Hidden\n```\n## Intro')).toEqual([
      { id: 'intro', level: 1, title: 'Intro', line: 1 },
      { id: 'intro-1', level: 2, title: 'Intro', line: 5 },
    ])
  })

  it('extracts Markdown and multiline HTML headings through the same anchor pipeline', () => {
    const markdown = `---
title: Mixed headings
---
# Introduction

<h2>
Introduction
</h2>

## Introduction`

    expect(extractHeadings(markdown)).toEqual([
      { id: 'introduction', level: 1, title: 'Introduction', line: 4 },
      { id: 'introduction-1', level: 2, title: 'Introduction', line: 6 },
      { id: 'introduction-2', level: 2, title: 'Introduction', line: 10 },
    ])
  })

  it('protects pipes inside table code spans', () => {
    expect(prepareMarkdown('| Value |\n| --- |\n| `a | b` |')).toContain('`a \\| b`')
  })

  it('uses the safe HTML pipeline for standalone HTML exports', () => {
    const html = buildHtmlExport(`# Export heading

<details open><summary>More</summary><p style="color:#A55331; position:fixed">Safe content</p></details>

<script>alert('unsafe')</script>

| Name | Value |
| --- | --- |
| HTML | parsed |`, 'HTML export')

    expect(html).toContain('<title>HTML export</title>')
    expect(html).toContain('<h1 id="export-heading">Export heading</h1>')
    expect(html).toContain('<details open=""><summary>More</summary><p style="color:#a55331">Safe content</p></details>')
    expect(html).toContain('<div class="table-wrap"><table>')
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('position:fixed')
    expect(html).not.toContain("alert('unsafe')")
  })
})
