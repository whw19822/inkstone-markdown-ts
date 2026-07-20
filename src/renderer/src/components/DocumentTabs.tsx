import { FileText, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useWorkspaceStore } from '@/store/workspace'

export function DocumentTabs(): React.JSX.Element {
  const documents = useWorkspaceStore((state) => state.documents)
  const selectedId = useWorkspaceStore((state) => state.selectedId)
  const select = useWorkspaceStore((state) => state.selectDocument)
  const close = useWorkspaceStore((state) => state.closeDocument)
  const newDocument = useWorkspaceStore((state) => state.newDocument)
  return (
    <div className="flex h-[34px] shrink-0 overflow-x-auto border-b border-border bg-tabs">
      {documents.map((document) => {
        const selected = document.id === selectedId
        const dirty = document.text !== document.savedText
        return (
          <button
            type="button"
            key={document.id}
            onClick={() => select(document.id)}
            className={cn('group relative flex h-full max-w-52 shrink-0 items-center gap-1.5 border-r border-border px-3 text-[11px] text-muted-foreground outline-none hover:bg-editor/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring', selected && 'bg-editor text-foreground')}
          >
            <FileText className={cn('size-3.5 shrink-0', selected && 'text-primary')} />
            <span className="truncate">{document.name}</span>
            {dirty && <span className="size-1.5 shrink-0 rounded-full bg-muted-foreground group-hover:hidden" />}
            <span
              role="button"
              tabIndex={0}
              aria-label={`Close ${document.name}`}
              onClick={(event) => { event.stopPropagation(); void close(document.id) }}
              onKeyDown={(event) => { if (event.key === 'Enter') { event.stopPropagation(); void close(document.id) } }}
              className={cn('grid size-4 shrink-0 place-items-center rounded-sm opacity-0 hover:bg-muted group-hover:opacity-100', !dirty && 'opacity-0')}
            ><X className="size-2.5" /></span>
            {selected && <span className="absolute inset-x-0 bottom-0 h-[2px] bg-primary" />}
          </button>
        )
      })}
      <Button variant="ghost" size="icon" className="h-[33px] w-8 shrink-0 rounded-none" onClick={newDocument} aria-label="New document"><Plus className="size-3" /></Button>
    </div>
  )
}
