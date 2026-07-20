import { CloudOff, Folder } from 'lucide-react'
import type { InkstoneDocument } from '@/store/workspace'

export function StatusBar({ document }: { document: InkstoneDocument }): React.JSX.Element {
  const metrics = document.cursor
  return (
    <footer className="flex h-6 shrink-0 items-center gap-3 border-t border-border bg-status px-3 text-[9.5px] text-muted-foreground">
      <span className="flex min-w-0 items-center gap-1.5 truncate">{document.path ? <Folder className="size-3 shrink-0" /> : <CloudOff className="size-3 shrink-0" />}<span className="truncate">{document.path || 'Unsaved document'}</span></span>
      <span className="ml-auto shrink-0">{metrics.selectionLength > 0 && `${metrics.selectionLength} selected · `}{metrics.words} words</span>
      <span className="hidden shrink-0 xl:inline">{metrics.characters} characters</span>
      <span className="shrink-0 tabular-nums">Ln {metrics.line}, Col {metrics.column}</span>
    </footer>
  )
}
