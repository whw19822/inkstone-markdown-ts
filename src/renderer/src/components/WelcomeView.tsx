import { Clock3, FilePlus2, FileText, FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useWorkspaceStore } from '@/store/workspace'

export function WelcomeView(): React.JSX.Element {
  const recent = useWorkspaceStore((state) => state.recentWorkspaces)
  const newDocument = useWorkspaceStore((state) => state.newDocument)
  const chooseDocuments = useWorkspaceStore((state) => state.chooseDocuments)
  const chooseWorkspace = useWorkspaceStore((state) => state.chooseWorkspace)
  const openWorkspace = useWorkspaceStore((state) => state.openWorkspace)

  return (
    <main className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-editor px-10 py-12">
      <div className="w-full max-w-2xl">
        <div className="mb-9 flex items-start gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-[14px] bg-primary text-primary-foreground shadow-lg shadow-primary/15"><FileText className="size-5" /></div>
          <div><h1 className="text-xl font-semibold tracking-tight">Write without the noise.</h1><p className="mt-1 text-sm text-muted-foreground">Inkstone keeps Markdown editing and reading in one calm workspace.</p></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <WelcomeAction icon={FilePlus2} title="New document" subtitle="Start with a blank page" onClick={newDocument} />
          <WelcomeAction icon={FileText} title="Open document" subtitle="Choose Markdown files" onClick={() => void chooseDocuments()} />
          <WelcomeAction icon={FolderOpen} title="Open workspace" subtitle="Browse a folder" onClick={() => void chooseWorkspace()} />
        </div>
        {recent.length > 0 && (
          <section className="mt-9">
            <div className="mb-2 flex items-center gap-2 px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"><Clock3 className="size-3" />Recent workspaces</div>
            <div className="overflow-hidden rounded-xl border border-border bg-card/60">
              {recent.map((workspace, index) => (
                <button key={workspace} type="button" onClick={() => void openWorkspace(workspace)} className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left last:border-0 hover:bg-muted/65">
                  <FolderOpen className="size-4 text-primary/75" />
                  <div className="min-w-0 flex-1"><div className="truncate text-xs font-medium">{workspace.split(/[/\\]/).at(-1)}</div><div className="mt-0.5 truncate text-[10px] text-muted-foreground">{workspace}</div></div>
                  <span className="text-[10px] tabular-nums text-muted-foreground">{index === 0 ? 'Last opened' : ''}</span>
                </button>
              ))}
            </div>
          </section>
        )}
        <p className="mt-7 text-center text-[10px] text-muted-foreground">⌘N New · ⌘O Open · ⇧⌘O Workspace</p>
      </div>
    </main>
  )
}

function WelcomeAction({ icon: Icon, title, subtitle, onClick }: { icon: typeof FileText; title: string; subtitle: string; onClick(): void }): React.JSX.Element {
  return (
    <Button variant="outline" className="h-auto items-start justify-start gap-3 rounded-xl bg-card/65 px-4 py-4 text-left shadow-none hover:border-primary/30 hover:bg-card" onClick={onClick}>
      <Icon className="mt-0.5 size-4 text-primary" />
      <span><span className="block text-xs font-semibold">{title}</span><span className="mt-0.5 block text-[10px] font-normal text-muted-foreground">{subtitle}</span></span>
    </Button>
  )
}
