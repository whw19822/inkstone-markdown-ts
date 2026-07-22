import { useEffect } from 'react'
import type { FormatCommand, MenuCommand } from '@shared/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { TooltipProvider } from '@/components/ui/tooltip'
import { DocumentWorkspace } from '@/components/DocumentWorkspace'
import { SettingsDialog } from '@/components/SettingsDialog'
import { Sidebar } from '@/components/Sidebar'
import { TopToolbar } from '@/components/TopToolbar'
import { WelcomeView } from '@/components/WelcomeView'
import { useWorkspaceStore } from '@/store/workspace'

export function App(): React.JSX.Element {
  const showSidebar = useWorkspaceStore((state) => state.showSidebar)
  const selectedId = useWorkspaceStore((state) => state.selectedId)
  const settings = useWorkspaceStore((state) => state.settings)
  const error = useWorkspaceStore((state) => state.error)
  const setError = useWorkspaceStore((state) => state.setError)

  useEffect(() => { void useWorkspaceStore.getState().initialize() }, [])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const applyTheme = (): void => {
      const dark = settings.theme === 'dark' || (settings.theme === 'system' && media.matches)
      document.documentElement.classList.toggle('dark', dark)
      document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
      window.inkstone.setTitleBarTheme(dark ? 'dark' : 'light')
    }
    applyTheme()
    media.addEventListener('change', applyTheme)
    return () => media.removeEventListener('change', applyTheme)
  }, [settings.theme])

  useEffect(() => window.inkstone.onExternalOpen((paths) => {
    void useWorkspaceStore.getState().openExternal(paths)
  }), [])

  useEffect(() => window.inkstone.onMenuCommand(handleMenuCommand), [])

  useEffect(() => window.inkstone.onWindowCloseRequested(() => { void confirmWindowClose() }), [])

  return (
    <TooltipProvider delayDuration={350}>
      <div data-platform={window.inkstone.platform} className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
        <TopToolbar />
        <div className="flex min-h-0 flex-1">
          {showSidebar && <Sidebar />}
          {selectedId ? <DocumentWorkspace /> : <WelcomeView />}
        </div>
        <SettingsDialog />
        <Dialog open={error !== null} onOpenChange={(open) => !open && setError(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Inkstone</DialogTitle><DialogDescription>{error ?? 'An unexpected error occurred.'}</DialogDescription></DialogHeader>
            <div className="flex justify-end px-5 py-4"><Button size="sm" onClick={() => setError(null)}>OK</Button></div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}

async function confirmWindowClose(): Promise<void> {
  const store = useWorkspaceStore.getState()
  const dirty = store.documents.filter((document) => document.text !== document.savedText)
  if (dirty.length === 0) {
    await window.inkstone.allowWindowClose()
    return
  }
  const decision = await window.inkstone.confirmCloseAll(dirty.map((document) => document.name))
  if (decision === 'cancel') return
  if (decision === 'save') {
    for (const document of dirty) {
      if (!(await useWorkspaceStore.getState().saveDocument(document.id))) return
    }
  }
  await window.inkstone.allowWindowClose()
}

function handleMenuCommand(command: MenuCommand): void {
  const store = useWorkspaceStore.getState()
  if (command.startsWith('format-')) {
    window.dispatchEvent(new CustomEvent<FormatCommand>('inkstone:format', { detail: command.slice(7) as FormatCommand }))
    return
  }
  if (command.startsWith('select-tab-')) {
    store.selectDocumentAt(Number(command.slice('select-tab-'.length)) - 1)
    return
  }
  switch (command) {
    case 'new-document': store.newDocument(); break
    case 'new-workspace-file': void store.createWorkspaceFile(); break
    case 'open-document': void store.chooseDocuments(); break
    case 'open-workspace': void store.chooseWorkspace(); break
    case 'save': void store.saveDocument(); break
    case 'save-as': void store.saveDocument(undefined, true); break
    case 'close-tab': void store.closeDocument(); break
    case 'export-html': void store.exportDocument('html'); break
    case 'export-pdf': void store.exportDocument('pdf'); break
    case 'layout-editor': store.setLayout('editor'); break
    case 'layout-split': store.setLayout('split'); break
    case 'layout-preview': store.setLayout('preview'); break
    case 'toggle-outline': store.toggleOutline(); break
    case 'toggle-sidebar': store.toggleSidebar(); break
    case 'show-settings': store.setSettingsOpen(true); break
  }
}
