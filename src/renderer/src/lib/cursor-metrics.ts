import type { CursorMetrics } from '@shared/types'

export function cursorMetricsEqual(
  left: CursorMetrics | null | undefined,
  right: CursorMetrics,
): boolean {
  return Boolean(
    left
    && left.line === right.line
    && left.column === right.column
    && left.words === right.words
    && left.characters === right.characters
    && left.selectionLength === right.selectionLength
  )
}

export function editorUpdateNeedsMetrics(update: { docChanged: boolean; selectionSet: boolean }): boolean {
  return update.docChanged || update.selectionSet
}
