import { describe, expect, it } from 'vitest'
import { formatMarkdown } from './formatting'

describe('formatMarkdown', () => {
  it('wraps a selection and preserves its selection range', () => {
    expect(formatMarkdown('hello world', 6, 11, 'bold')).toEqual({
      text: 'hello **world**',
      anchor: 8,
      head: 13,
    })
  })

  it('replaces an existing heading marker', () => {
    expect(formatMarkdown('## Heading', 3, 10, 'heading-1').text).toBe('# Heading')
  })

  it('numbers every selected line', () => {
    expect(formatMarkdown('alpha\nbeta', 0, 10, 'numbered-list').text).toBe('1. alpha\n2. beta')
  })
})
