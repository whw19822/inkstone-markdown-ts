import { useState } from 'react'
import {
  ChevronRight,
  FilePlus2,
  FileText,
  Folder,
  FolderOpen,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react'
import type { FileNode } from '@shared/types'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useWorkspaceStore } from '@/store/workspace'

export function Sidebar(): React.JSX.Element {
  const rootPath = useWorkspaceStore((state) => state.rootPath)
  const rootName = useWorkspaceStore((state) => state.rootName)
  const tree = useWorkspaceStore((state) => state.tree)
  const selectedPath = useWorkspaceStore((state) => state.documents.find((document) => document.id === state.selectedId)?.path)
  const chooseWorkspace = useWorkspaceStore((state) => state.chooseWorkspace)
  const chooseDocuments = useWorkspaceStore((state) => state.chooseDocuments)
  const refreshWorkspace = useWorkspaceStore((state) => state.refreshWorkspace)
  const createFile = useWorkspaceStore((state) => state.createWorkspaceFile)
  const [query, setQuery] = useState('')
  const filtered = query.trim() ? filterTree(tree, query.trim().toLowerCase()) : tree

  return (
    <aside className="flex h-full w-[248px] shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground">
      <div className="flex h-[54px] items-center gap-2.5 border-b border-border px-3">
        <div className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <FileText className="size-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[9px] font-bold tracking-[0.18em] text-muted-foreground">INKSTONE</div>
          <div className="truncate text-xs font-semibold">{rootName ?? 'No Workspace'}</div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Workspace actions"><MoreHorizontal /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => void chooseWorkspace()}><FolderOpen />Open Workspace…</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void chooseDocuments()}><FileText />Open Document…</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={!rootPath} onSelect={() => void refreshWorkspace()}><RefreshCw />Refresh Workspace</DropdownMenuItem>
            <DropdownMenuItem disabled={!rootPath} onSelect={() => rootPath && void window.inkstone.revealPath(rootPath)}><Folder />Reveal in Finder</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {rootPath && (
        <div className="px-2.5 pb-2 pt-2.5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter files"
              className="h-7 w-full rounded-md border border-border bg-background/55 pl-7 pr-2 text-[11px] outline-none placeholder:text-muted-foreground/70 focus:border-ring focus:ring-2 focus:ring-ring/15"
            />
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto px-1.5 pb-3">
        {!rootPath ? (
          <SidebarEmpty icon={FolderOpen} text="Open a folder to browse your Markdown library." action="Open Workspace" onAction={() => void chooseWorkspace()} />
        ) : filtered.length === 0 ? (
          <SidebarEmpty icon={FileText} text={query ? 'No files match your filter.' : 'This workspace has no Markdown files yet.'} action={query ? undefined : 'Create File'} onAction={() => void createFile()} />
        ) : (
          <div className="space-y-px">
            {filtered.map((node) => <FileTreeNode key={node.path} node={node} depth={0} selectedPath={selectedPath} />)}
          </div>
        )}
      </div>

      {rootPath && (
        <div className="flex h-9 items-center justify-between border-t border-border px-2.5 text-[10px] text-muted-foreground">
          <span>{countFiles(tree)} documents</span>
          <Button variant="ghost" size="icon-sm" onClick={() => void createFile()} aria-label="New Markdown file"><FilePlus2 /></Button>
        </div>
      )}
    </aside>
  )
}

function FileTreeNode({ node, depth, selectedPath }: { node: FileNode; depth: number; selectedPath?: string }): React.JSX.Element {
  const [expanded, setExpanded] = useState(true)
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(node.name)
  const openPath = useWorkspaceStore((state) => state.openPath)
  const createFile = useWorkspaceStore((state) => state.createWorkspaceFile)
  const renameNode = useWorkspaceStore((state) => state.renameNode)
  const trashNode = useWorkspaceStore((state) => state.trashNode)
  const selected = !node.isDirectory && node.path === selectedPath

  const commitRename = (): void => {
    setRenaming(false)
    if (name.trim() && name.trim() !== node.name) void renameNode(node, name)
    else setName(node.name)
  }

  return (
    <div>
      <div
        className={cn('group flex h-7 items-center gap-1 rounded-md pr-1 text-[11.5px] transition-colors', selected ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/85 hover:bg-sidebar-accent/65')}
        style={{ paddingLeft: 4 + depth * 13 }}
      >
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left outline-none"
          onClick={() => node.isDirectory ? setExpanded((value) => !value) : void openPath(node.path)}
        >
          {node.isDirectory ? <ChevronRight className={cn('size-3 shrink-0 text-muted-foreground transition-transform', expanded && 'rotate-90')} /> : <span className="w-3" />}
          {node.isDirectory ? (expanded ? <FolderOpen className="size-3.5 shrink-0 text-primary/75" /> : <Folder className="size-3.5 shrink-0 text-primary/70" />) : <FileText className={cn('size-3.5 shrink-0', selected ? 'text-primary' : 'text-muted-foreground')} />}
          {renaming ? (
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              onBlur={commitRename}
              onKeyDown={(event) => {
                if (event.key === 'Enter') commitRename()
                if (event.key === 'Escape') { setName(node.name); setRenaming(false) }
                event.stopPropagation()
              }}
              onClick={(event) => event.stopPropagation()}
              className="h-5 min-w-0 flex-1 rounded border border-ring bg-background px-1 outline-none"
            />
          ) : <span className="truncate">{node.name}</span>}
        </button>
        {!renaming && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="size-6 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100" aria-label={`${node.name} actions`}><MoreHorizontal /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {node.isDirectory ? <DropdownMenuItem onSelect={() => void createFile(node.path)}><FilePlus2 />New Markdown File</DropdownMenuItem> : <DropdownMenuItem onSelect={() => void openPath(node.path)}><FileText />Open</DropdownMenuItem>}
              <DropdownMenuItem onSelect={() => void window.inkstone.revealPath(node.path)}><FolderOpen />Reveal in Finder</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setRenaming(true)}><Pencil />Rename…</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => void trashNode(node)}><Trash2 />Move to Trash</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {node.isDirectory && expanded && node.children?.map((child) => <FileTreeNode key={child.path} node={child} depth={depth + 1} selectedPath={selectedPath} />)}
    </div>
  )
}

function SidebarEmpty({ icon: Icon, text, action, onAction }: { icon: typeof Folder; text: string; action?: string; onAction(): void }): React.JSX.Element {
  return (
    <div className="flex h-full min-h-48 flex-col items-center justify-center gap-3 px-5 text-center">
      <Icon className="size-7 stroke-[1.25] text-muted-foreground/55" />
      <p className="max-w-40 text-[11px] leading-relaxed text-muted-foreground">{text}</p>
      {action && <Button variant="outline" size="sm" onClick={onAction}>{action}</Button>}
    </div>
  )
}

function filterTree(nodes: FileNode[], query: string): FileNode[] {
  return nodes.flatMap((node) => {
    if (!node.isDirectory) return node.name.toLowerCase().includes(query) ? [node] : []
    const children = filterTree(node.children ?? [], query)
    return node.name.toLowerCase().includes(query) || children.length > 0 ? [{ ...node, children }] : []
  })
}

function countFiles(nodes: FileNode[]): number {
  return nodes.reduce((total, node) => total + (node.isDirectory ? countFiles(node.children ?? []) : 1), 0)
}
