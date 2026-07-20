import { describe, expect, it } from 'vitest'
import { cursorMetricsEqual, editorUpdateNeedsMetrics } from './cursor-metrics'

const metrics = { line: 1, column: 1, words: 3, characters: 18, selectionLength: 0 }

describe('editor cursor metrics', () => {
  it('ignores CodeMirror view-only updates', () => {
    expect(editorUpdateNeedsMetrics({ docChanged: false, selectionSet: false })).toBe(false)
  })

  it('publishes document and selection updates', () => {
    expect(editorUpdateNeedsMetrics({ docChanged: true, selectionSet: false })).toBe(true)
    expect(editorUpdateNeedsMetrics({ docChanged: false, selectionSet: true })).toBe(true)
  })

  it('recognizes an unchanged metric snapshot', () => {
    expect(cursorMetricsEqual(metrics, { ...metrics })).toBe(true)
    expect(cursorMetricsEqual(metrics, { ...metrics, column: 2 })).toBe(false)
  })
})
