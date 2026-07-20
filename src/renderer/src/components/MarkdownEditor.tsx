import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { languages } from '@codemirror/language-data'
import { EditorView, keymap, type ViewUpdate } from '@codemirror/view'
import { tags } from '@lezer/highlight'
import type { FormatCommand } from '@shared/types'
import { cursorMetricsEqual, editorUpdateNeedsMetrics } from '@/lib/cursor-metrics'
import { formatMarkdown } from '@/lib/formatting'
import type { InkstoneDocument } from '@/store/workspace'
import { useWorkspaceStore } from '@/store/workspace'

export interface EditorHandle {
  format(command: FormatCommand): void
  scrollToLine(line: number): void
  focus(): void
}

interface MarkdownEditorProps {
  document: InkstoneDocument
  syncedScroll?: { source: 'editor' | 'preview'; ratio: number; sequence: number }
  onScrollRatio?(ratio: number): void
}

const inkstoneHighlightStyle = HighlightStyle.define([
  { tag: tags.heading, color: 'var(--foreground)', fontWeight: '650' },
  { tag: [tags.strong, tags.heading1, tags.heading2], fontWeight: '700' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: [tags.link, tags.url], color: 'var(--primary)', textDecoration: 'underline' },
  { tag: [tags.monospace, tags.string, tags.number, tags.bool], color: 'var(--syntax-code)' },
  { tag: [tags.meta, tags.comment, tags.punctuation], color: 'var(--muted-foreground)' },
  { tag: [tags.keyword, tags.typeName, tags.className], color: 'var(--primary)' },
])

export const MarkdownEditor = forwardRef<EditorHandle, MarkdownEditorProps>(function MarkdownEditor(
  { document, syncedScroll, onScrollRatio },
  ref,
) {
  const settings = useWorkspaceStore((state) => state.settings)
  const setText = useWorkspaceStore((state) => state.setDocumentText)
  const setCursor = useWorkspaceStore((state) => state.setCursor)
  const viewRef = useRef<EditorView | null>(null)
  const metricsRef = useRef(document.cursor)
  const programmaticScroll = useRef(false)
  const scrollListener = useRef<(() => void) | null>(null)
  const onScrollRatioRef = useRef(onScrollRatio)
  onScrollRatioRef.current = onScrollRatio

  useEffect(() => {
    metricsRef.current = document.cursor
  }, [document.id])

  const applyCommand = useCallback(async (command: FormatCommand): Promise<void> => {
    const view = viewRef.current
    if (!view) return
    let imageSource: string | undefined
    if (command === 'image') {
      imageSource = (await window.inkstone.chooseImage(document.path || null)) ?? undefined
      if (!imageSource) return
    }
    const selection = view.state.selection.main
    const result = formatMarkdown(view.state.doc.toString(), selection.from, selection.to, command, imageSource)
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: result.text },
      selection: { anchor: result.anchor, head: result.head },
      scrollIntoView: true,
    })
    view.focus()
  }, [document.path])

  useImperativeHandle(ref, () => ({
    format: (command) => void applyCommand(command),
    scrollToLine: (line) => {
      const view = viewRef.current
      if (!view) return
      const safeLine = Math.min(Math.max(1, line), view.state.doc.lines)
      const position = view.state.doc.line(safeLine).from
      view.dispatch({ selection: { anchor: position }, effects: EditorView.scrollIntoView(position, { y: 'start', yMargin: 44 }) })
      view.focus()
    },
    focus: () => viewRef.current?.focus(),
  }), [applyCommand])

  useEffect(() => {
    const listener = (event: Event): void => {
      const command = (event as CustomEvent<FormatCommand>).detail
      if (command) void applyCommand(command)
    }
    window.addEventListener('inkstone:format', listener)
    return () => window.removeEventListener('inkstone:format', listener)
  }, [applyCommand])

  useEffect(() => {
    if (!syncedScroll || syncedScroll.source !== 'preview' || !settings.synchronizedScrolling) return
    const view = viewRef.current
    if (!view) return
    const maximum = Math.max(0, view.scrollDOM.scrollHeight - view.scrollDOM.clientHeight)
    programmaticScroll.current = true
    view.scrollDOM.scrollTop = maximum * syncedScroll.ratio
    window.setTimeout(() => { programmaticScroll.current = false }, 90)
  }, [settings.synchronizedScrolling, syncedScroll])

  useEffect(() => () => {
    const view = viewRef.current
    if (view && scrollListener.current) view.scrollDOM.removeEventListener('scroll', scrollListener.current)
  }, [])

  const fontFamily = settings.typeface === 'serif'
    ? 'ui-serif, Georgia, Cambria, serif'
    : settings.typeface === 'monospace'
      ? 'ui-monospace, SFMono-Regular, Menlo, monospace'
      : '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

  const extensions = useMemo(() => [
    markdown({ base: markdownLanguage, codeLanguages: languages }),
    syntaxHighlighting(inkstoneHighlightStyle),
    EditorView.lineWrapping,
    EditorView.contentAttributes.of({ spellcheck: settings.spellCheck ? 'true' : 'false', autocorrect: 'on' }),
    EditorView.theme({
      '&': { height: '100%', minHeight: '0', overflow: 'hidden', fontSize: `${settings.fontSize}px`, backgroundColor: 'transparent', color: 'var(--foreground)' },
      '.cm-scroller': { height: '100%', minHeight: '0', overflow: 'auto', overscrollBehavior: 'contain', fontFamily, lineHeight: String(settings.lineHeight), padding: '34px 0 64px' },
      '.cm-content': { minHeight: '100%', padding: '0 clamp(26px, 5vw, 72px)', caretColor: 'var(--primary)' },
      '.cm-line': { padding: '0' },
      '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--primary)' },
      '.cm-gutters': { backgroundColor: 'transparent', border: 'none', color: 'var(--muted-foreground)', paddingLeft: '6px' },
      '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: 'color-mix(in srgb, var(--muted) 45%, transparent)' },
      '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection': { backgroundColor: 'color-mix(in srgb, var(--primary) 20%, transparent) !important' },
      '&.cm-focused': { outline: 'none' },
    }),
    keymap.of([
      { key: 'Mod-b', run: () => { void applyCommand('bold'); return true } },
      { key: 'Mod-i', run: () => { void applyCommand('italic'); return true } },
      { key: 'Mod-k', run: () => { void applyCommand('link'); return true } },
      { key: 'Mod-`', run: () => { void applyCommand('inline-code'); return true } },
      { key: 'Mod-Alt-1', run: () => { void applyCommand('heading-1'); return true } },
      { key: 'Mod-Alt-2', run: () => { void applyCommand('heading-2'); return true } },
      { key: 'Mod-Alt-3', run: () => { void applyCommand('heading-3'); return true } },
    ]),
  ], [applyCommand, fontFamily, settings.fontSize, settings.lineHeight, settings.spellCheck])

  const publishMetrics = useCallback((update: ViewUpdate): void => {
    if (!editorUpdateNeedsMetrics(update)) return
    const selection = update.state.selection.main
    const line = update.state.doc.lineAt(selection.head)
    const value = update.docChanged ? update.state.doc.toString() : null
    const nextMetrics = {
      line: line.number,
      column: selection.head - line.from + 1,
      words: value === null ? metricsRef.current.words : value.trim() ? value.trim().split(/\s+/u).length : 0,
      characters: value === null ? metricsRef.current.characters : value.length,
      selectionLength: Math.abs(selection.to - selection.from),
    }
    if (cursorMetricsEqual(metricsRef.current, nextMetrics)) return
    metricsRef.current = nextMetrics
    setCursor(document.id, nextMetrics)
  }, [document.id, setCursor])

  return (
    <CodeMirror
      value={document.text}
      height="100%"
      theme="none"
      extensions={extensions}
      basicSetup={{
        lineNumbers: settings.showLineNumbers,
        foldGutter: false,
        highlightActiveLineGutter: settings.showLineNumbers,
        highlightActiveLine: true,
        bracketMatching: true,
        closeBrackets: true,
        autocompletion: false,
        rectangularSelection: true,
        searchKeymap: true,
        history: true,
      }}
      onChange={(value) => setText(document.id, value)}
      onUpdate={publishMetrics}
      onCreateEditor={(view) => {
        viewRef.current = view
        const listener = (): void => {
          if (programmaticScroll.current || !settings.synchronizedScrolling) return
          const maximum = Math.max(1, view.scrollDOM.scrollHeight - view.scrollDOM.clientHeight)
          onScrollRatioRef.current?.(Math.min(1, Math.max(0, view.scrollDOM.scrollTop / maximum)))
        }
        scrollListener.current = listener
        view.scrollDOM.addEventListener('scroll', listener, { passive: true })
      }}
      className="h-full min-h-0 overflow-hidden bg-editor text-foreground"
    />
  )
})
