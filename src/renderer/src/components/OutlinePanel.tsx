import { ListTree } from 'lucide-react'
import type { OutlineHeading } from '@/lib/markdown'
import { cn } from '@/lib/utils'

export function OutlinePanel({ headings, onSelect }: { headings: OutlineHeading[]; onSelect(heading: OutlineHeading): void }): React.JSX.Element {
  return (
    <aside className="flex h-full w-[214px] shrink-0 flex-col border-l border-border bg-outline">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-border px-3">
        <span className="text-[9px] font-bold tracking-[0.16em] text-muted-foreground">OUTLINE</span>
        <span className="font-mono text-[9px] text-muted-foreground/70">{headings.length}</span>
      </div>
      {headings.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2.5 px-4 text-center"><ListTree className="size-6 stroke-[1.25] text-muted-foreground/45" /><p className="text-[10.5px] leading-relaxed text-muted-foreground">Add headings to build a document outline.</p></div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto py-2">
          {headings.map((heading) => (
            <button
              key={`${heading.id}-${heading.line}`}
              type="button"
              onClick={() => onSelect(heading)}
              className="group flex w-full items-start gap-2 py-1.5 pr-2 text-left text-[11px] leading-snug text-muted-foreground outline-none hover:bg-muted/55 hover:text-foreground focus-visible:bg-muted"
              style={{ paddingLeft: 10 + (heading.level - 1) * 10 }}
            >
              <span className={cn('mt-[5px] size-1 shrink-0 rounded-full bg-muted-foreground/45', heading.level <= 2 && 'bg-primary')} />
              <span className={cn('line-clamp-2', heading.level === 1 && 'font-semibold text-foreground')}>{heading.title}</span>
            </button>
          ))}
        </div>
      )}
    </aside>
  )
}
