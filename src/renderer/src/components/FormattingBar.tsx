import {
  Bold,
  Braces,
  Check,
  Code2,
  Heading1,
  Heading2,
  Image,
  Italic,
  Link,
  List,
  ListChecks,
  ListOrdered,
  Quote,
  Save,
  Strikethrough,
} from 'lucide-react'
import type { FormatCommand } from '@shared/types'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { InkstoneDocument } from '@/store/workspace'
import { useWorkspaceStore } from '@/store/workspace'

const groups: { command: FormatCommand; label: string; icon: typeof Bold }[][] = [
  [
    { command: 'heading-1', label: 'Heading 1', icon: Heading1 },
    { command: 'heading-2', label: 'Heading 2', icon: Heading2 },
  ],
  [
    { command: 'bold', label: 'Bold', icon: Bold },
    { command: 'italic', label: 'Italic', icon: Italic },
    { command: 'strikethrough', label: 'Strikethrough', icon: Strikethrough },
    { command: 'inline-code', label: 'Inline Code', icon: Code2 },
  ],
  [
    { command: 'bullet-list', label: 'Bulleted List', icon: List },
    { command: 'numbered-list', label: 'Numbered List', icon: ListOrdered },
    { command: 'task-list', label: 'Task List', icon: ListChecks },
    { command: 'quote', label: 'Block Quote', icon: Quote },
  ],
  [
    { command: 'link', label: 'Link', icon: Link },
    { command: 'image', label: 'Image', icon: Image },
    { command: 'code-block', label: 'Code Block', icon: Braces },
  ],
]

export function FormattingBar({ document, onFormat, disabled }: { document: InkstoneDocument; onFormat(command: FormatCommand): void; disabled?: boolean }): React.JSX.Element {
  const save = useWorkspaceStore((state) => state.saveDocument)
  const isDirty = document.text !== document.savedText
  return (
    <div className="flex h-9 shrink-0 items-center border-b border-border bg-formatting px-2">
      <div className="flex min-w-0 flex-1 items-center overflow-x-auto">
        {groups.map((group, index) => (
          <div key={group[0]?.command} className="flex items-center">
            {index > 0 && <Separator orientation="vertical" className="mx-1.5 h-4" />}
            {group.map(({ command, label, icon: Icon }) => (
              <Tooltip key={command}>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon-sm" disabled={disabled} onClick={() => onFormat(command)} aria-label={label}><Icon /></Button>
                </TooltipTrigger>
                <TooltipContent>{label}</TooltipContent>
              </Tooltip>
            ))}
          </div>
        ))}
      </div>
      <Separator orientation="vertical" className="mx-2 h-4" />
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn('mr-1 grid size-6 place-items-center text-muted-foreground', isDirty && 'text-primary')}>
            {isDirty ? <span className="size-1.5 rounded-full bg-current" /> : <Check className="size-3.5" />}
          </span>
        </TooltipTrigger>
        <TooltipContent>{isDirty ? 'Edited' : 'Saved'}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild><Button variant="ghost" size="icon-sm" onClick={() => void save(document.id)} aria-label="Save"><Save /></Button></TooltipTrigger>
        <TooltipContent>Save (⌘S)</TooltipContent>
      </Tooltip>
    </div>
  )
}
