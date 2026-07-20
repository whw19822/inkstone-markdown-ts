import { useCallback, useMemo, useRef, useState } from 'react'
import type { FormatCommand } from '@shared/types'
import { DocumentTabs } from '@/components/DocumentTabs'
import { FormattingBar } from '@/components/FormattingBar'
import { MarkdownEditor, type EditorHandle } from '@/components/MarkdownEditor'
import { MarkdownPreview, type PreviewHandle } from '@/components/MarkdownPreview'
import { OutlinePanel } from '@/components/OutlinePanel'
import { StatusBar } from '@/components/StatusBar'
import { extractHeadings, type OutlineHeading } from '@/lib/markdown'
import { useWorkspaceStore } from '@/store/workspace'

interface ScrollPosition {
  source: 'editor' | 'preview'
  ratio: number
  sequence: number
}

export function DocumentWorkspace(): React.JSX.Element | null {
  const document = useWorkspaceStore((state) => state.documents.find((item) => item.id === state.selectedId))
  const layout = useWorkspaceStore((state) => state.layout)
  const showOutline = useWorkspaceStore((state) => state.showOutline)
  const synchronizedScrolling = useWorkspaceStore((state) => state.settings.synchronizedScrolling)
  const openRelative = useWorkspaceStore((state) => state.openRelative)
  const editorRef = useRef<EditorHandle>(null)
  const previewRef = useRef<PreviewHandle>(null)
  const sequence = useRef(0)
  const [scrollPosition, setScrollPosition] = useState<ScrollPosition>()
  const headings = useMemo(() => extractHeadings(document?.text ?? ''), [document?.text])

  const publishScroll = useCallback((source: ScrollPosition['source'], ratio: number): void => {
    if (!synchronizedScrolling || layout !== 'split') return
    setScrollPosition({ source, ratio, sequence: ++sequence.current })
  }, [layout, synchronizedScrolling])

  if (!document) return null

  const selectHeading = (heading: OutlineHeading): void => {
    if (layout !== 'preview') editorRef.current?.scrollToLine(heading.line)
    if (layout !== 'editor') previewRef.current?.scrollToHeading(heading.id)
  }

  const format = (command: FormatCommand): void => editorRef.current?.format(command)

  return (
    <main className="flex min-h-0 flex-1 flex-col bg-editor">
      <DocumentTabs />
      <div className="flex min-h-0 flex-1">
        <section className="flex min-w-0 flex-1 flex-col">
          <FormattingBar document={document} onFormat={format} disabled={layout === 'preview'} />
          <div className="min-h-0 flex-1 overflow-hidden">
            {layout === 'editor' && (
              <MarkdownEditor ref={editorRef} document={document} />
            )}
            {layout === 'preview' && (
              <MarkdownPreview
                ref={previewRef}
                markdown={document.text}
                documentPath={document.path || null}
                onOpenRelative={(source) => document.path && void openRelative(document.path, source)}
              />
            )}
            {layout === 'split' && (
              <div className="grid h-full min-h-0 grid-cols-2 overflow-hidden">
                <div className="h-full min-h-0 min-w-0 overflow-hidden border-r border-border">
                  <MarkdownEditor
                    ref={editorRef}
                    document={document}
                    syncedScroll={scrollPosition}
                    onScrollRatio={(ratio) => publishScroll('editor', ratio)}
                  />
                </div>
                <div className="h-full min-h-0 min-w-0 overflow-hidden">
                  <MarkdownPreview
                    ref={previewRef}
                    markdown={document.text}
                    documentPath={document.path || null}
                    onOpenRelative={(source) => document.path && void openRelative(document.path, source)}
                    syncedScroll={scrollPosition}
                    onScrollRatio={(ratio) => publishScroll('preview', ratio)}
                  />
                </div>
              </div>
            )}
          </div>
          <StatusBar document={document} />
        </section>
        {showOutline && <OutlinePanel headings={headings} onSelect={selectHeading} />}
      </div>
    </main>
  )
}
