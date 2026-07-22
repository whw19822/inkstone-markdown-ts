import { BookOpen, Columns2, ListTree, Menu, Moon, PanelLeftClose, PanelLeftOpen, PenLine, Settings2, Sun } from 'lucide-react'
import type { EditorLayout } from '@shared/types'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useWorkspaceStore } from '@/store/workspace'

const layouts: { value: EditorLayout; label: string; icon: typeof PenLine }[] = [
  { value: 'editor', label: 'Editor', icon: PenLine },
  { value: 'split', label: 'Split', icon: Columns2 },
  { value: 'preview', label: 'Reader', icon: BookOpen },
]

export function TopToolbar(): React.JSX.Element {
  const layout = useWorkspaceStore((state) => state.layout)
  const setLayout = useWorkspaceStore((state) => state.setLayout)
  const showSidebar = useWorkspaceStore((state) => state.showSidebar)
  const toggleSidebar = useWorkspaceStore((state) => state.toggleSidebar)
  const showOutline = useWorkspaceStore((state) => state.showOutline)
  const toggleOutline = useWorkspaceStore((state) => state.toggleOutline)
  const settings = useWorkspaceStore((state) => state.settings)
  const updateSettings = useWorkspaceStore((state) => state.updateSettings)
  const setSettingsOpen = useWorkspaceStore((state) => state.setSettingsOpen)
  const hasDocument = useWorkspaceStore((state) => state.selectedId !== null)

  return (
    <header className="top-toolbar app-drag-region relative flex h-12 shrink-0 items-center border-b border-border bg-toolbar">
      <div className="no-drag flex items-center">
        <ToolbarButton label={showSidebar ? 'Hide Sidebar' : 'Show Sidebar'} onClick={toggleSidebar}>
          {showSidebar ? <PanelLeftClose /> : <PanelLeftOpen />}
        </ToolbarButton>
      </div>

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="no-drag pointer-events-auto flex items-center rounded-lg border border-border/80 bg-muted/55 p-0.5 shadow-sm">
          {layouts.map(({ value, label, icon: Icon }) => (
            <Tooltip key={value}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  disabled={!hasDocument}
                  onClick={() => setLayout(value)}
                  className={cn('grid size-7 place-items-center rounded-md text-muted-foreground outline-none transition-all hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-35', layout === value && 'bg-background text-foreground shadow-sm')}
                  aria-label={label}
                ><Icon className="size-3.5" /></button>
              </TooltipTrigger>
              <TooltipContent>{label}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>

      <div className="no-drag ml-auto flex items-center gap-0.5">
        <ToolbarButton label={showOutline ? 'Hide Outline' : 'Show Outline'} disabled={!hasDocument} active={showOutline} onClick={toggleOutline}><ListTree /></ToolbarButton>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Appearance">
              {settings.theme === 'light' ? <Sun /> : settings.theme === 'dark' ? <Moon /> : <Menu />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Appearance</DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => updateSettings({ theme: 'system' })}>System {settings.theme === 'system' && <span className="ml-auto">✓</span>}</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => updateSettings({ theme: 'light' })}><Sun />Light {settings.theme === 'light' && <span className="ml-auto">✓</span>}</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => updateSettings({ theme: 'dark' })}><Moon />Dark {settings.theme === 'dark' && <span className="ml-auto">✓</span>}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setSettingsOpen(true)}><Settings2 />Settings…</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

function ToolbarButton({ label, children, onClick, disabled, active }: { label: string; children: React.ReactNode; onClick(): void; disabled?: boolean; active?: boolean }): React.JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" disabled={disabled} onClick={onClick} className={cn(active && 'bg-accent text-accent-foreground')} aria-label={label}>{children}</Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
