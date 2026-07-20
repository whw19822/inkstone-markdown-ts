import { describe, expect, it } from 'vitest'
import { extractHeadings, prepareMarkdown } from './markdown'

describe('extractHeadings', () => {
  it('ignores fenced code and disambiguates duplicate slugs', () => {
    expect(extractHeadings('# Intro\n```md\n# Hidden\n```\n## Intro')).toEqual([
      { id: 'intro', level: 1, title: 'Intro', line: 1 },
      { id: 'intro-1', level: 2, title: 'Intro', line: 5 },
    ])
  })

  it('protects pipes inside table code spans', () => {
    expect(prepareMarkdown('| Value |\n| --- |\n| `a | b` |')).toContain('`a \\| b`')
  })
})
