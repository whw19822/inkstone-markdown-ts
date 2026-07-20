import { create } from 'zustand'
import type {
  CursorMetrics,
  EditorLayout,
  EditorSettings,
  FileNode,
  OpenedFile,
  WorkspaceSnapshot,
} from '@shared/types'
import { buildHtmlExport } from '@/lib/markdown'
import { cursorMetricsEqual } from '@/lib/cursor-metrics'

export interface InkstoneDocument extends OpenedFile {
  id: string
  savedText: string
  cursor: CursorMetrics
}

interface WorkspaceState {
  rootPath: string | null
  rootName: string | null
  tree: FileNode[]
  recentWorkspaces: string[]
  documents: InkstoneDocument[]
  selectedId: string | null
  layout: EditorLayout
  showSidebar: boolean
  showOutline: boolean
  settingsOpen: boolean
  settings: EditorSettings
  error: string | null
  initialize(): Promise<void>
  newDocument(): void
  chooseDocuments(): Promise<void>
  openPath(path: string): Promise<void>
  openRelative(documentPath: string, source: string): Promise<void>
  openExternal(paths: string[]): Promise<void>
  chooseWorkspace(): Promise<void>
  openWorkspace(path: string): Promise<void>
  refreshWorkspace(): Promise<void>
  createWorkspaceFile(directory?: string): Promise<void>
  selectDocument(id: string): void
  selectDocumentAt(index: number): void
  setDocumentText(id: string, text: string): void
  setCursor(id: string, cursor: CursorMetrics): void
  saveDocument(id?: string, forceAs?: boolean): Promise<boolean>
  closeDocument(id?: string): Promise<void>
  exportDocument(format: 'html' | 'pdf'): Promise<void>
  renameNode(node: FileNode, newName: string): Promise<void>
  trashNode(node: FileNode): Promise<void>
  setLayout(layout: EditorLayout): void
  toggleSidebar(): void
  toggleOutline(): void
  setSettingsOpen(open: boolean): void
  updateSettings(settings: Partial<EditorSettings>): void
  setError(error: string | null): void
}

const emptyCursor: CursorMetrics = { line: 1, column: 1, words: 0, characters: 0, selectionLength: 0 }
const defaultSettings: EditorSettings = {
  theme: 'system',
  fontSize: 16,
  typeface: 'system',
  lineHeight: 1.55,
  spellCheck: true,
  showLineNumbers: false,
  synchronizedScrolling: true,
}

function loadSettings(): EditorSettings {
  try {
    return { ...defaultSettings, ...(JSON.parse(localStorage.getItem('inkstone.settings') ?? '{}') as Partial<EditorSettings>) }
  } catch {
    return defaultSettings
  }
}

function createDocument(file: OpenedFile): InkstoneDocument {
  const words = file.text.trim() ? file.text.trim().split(/\s+/u).length : 0
  return { ...file, id: crypto.randomUUID(), savedText: file.text, cursor: { ...emptyCursor, words, characters: file.text.length } }
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : 'An unexpected error occurred.'
}

function applyFiles(
  state: Pick<WorkspaceState, 'documents' | 'selectedId'>,
  files: OpenedFile[],
): Pick<WorkspaceState, 'documents' | 'selectedId'> {
  const documents = [...state.documents]
  let selectedId = state.selectedId
  for (const file of files) {
    const existing = documents.find((document) => document.path === file.path)
    if (existing) selectedId = existing.id
    else {
      const document = createDocument(file)
      documents.push(document)
      selectedId = document.id
    }
  }
  return { documents, selectedId }
}

function withSnapshot(snapshot: WorkspaceSnapshot): Partial<WorkspaceState> {
  return { rootPath: snapshot.path, rootName: snapshot.name, tree: snapshot.tree }
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  rootPath: null,
  rootName: null,
  tree: [],
  recentWorkspaces: [],
  documents: [],
  selectedId: null,
  layout: 'split',
  showSidebar: true,
  showOutline: true,
  settingsOpen: false,
  settings: loadSettings(),
  error: null,

  initialize: async () => {
    try {
      const recentWorkspaces = await window.inkstone.recentWorkspaces()
      set({ recentWorkspaces })
      if (!get().rootPath && recentWorkspaces[0]) {
        const snapshot = await window.inkstone.openWorkspace(recentWorkspaces[0])
        if (snapshot) set(withSnapshot(snapshot))
      }
    } catch (error) {
      set({ error: describeError(error) })
    }
  },

  newDocument: () => {
    const document = createDocument({ path: '', name: 'Untitled.md', text: '' })
    set((state) => ({ documents: [...state.documents, document], selectedId: document.id, layout: 'split' }))
  },

  chooseDocuments: async () => {
    try {
      const files = await window.inkstone.chooseDocuments()
      set((state) => applyFiles(state, files))
    } catch (error) {
      set({ error: describeError(error) })
    }
  },

  openPath: async (path) => {
    try {
      const files = await window.inkstone.readPaths([path])
      set((state) => applyFiles(state, files))
    } catch (error) {
      set({ error: describeError(error) })
    }
  },

  openRelative: async (documentPath, source) => {
    try {
      const file = await window.inkstone.openRelative(documentPath, source)
      if (file) set((state) => applyFiles(state, [file]))
    } catch (error) {
      set({ error: describeError(error) })
    }
  },

  openExternal: async (paths) => {
    try {
      const files = await window.inkstone.readPaths(paths)
      set((state) => ({ ...applyFiles(state, files), layout: 'preview', showSidebar: false }))
    } catch (error) {
      set({ error: describeError(error) })
    }
  },

  chooseWorkspace: async () => {
    try {
      const snapshot = await window.inkstone.chooseWorkspace()
      if (!snapshot) return
      set({ ...withSnapshot(snapshot), recentWorkspaces: await window.inkstone.recentWorkspaces() })
    } catch (error) {
      set({ error: describeError(error) })
    }
  },

  openWorkspace: async (path) => {
    try {
      const snapshot = await window.inkstone.openWorkspace(path)
      if (!snapshot) throw new Error('The workspace is no longer available.')
      set({ ...withSnapshot(snapshot), recentWorkspaces: await window.inkstone.recentWorkspaces() })
    } catch (error) {
      set({ error: describeError(error) })
    }
  },

  refreshWorkspace: async () => {
    const { rootPath } = get()
    if (!rootPath) return
    try {
      const snapshot = await window.inkstone.refreshWorkspace(rootPath)
      set(withSnapshot(snapshot))
    } catch (error) {
      set({ error: describeError(error) })
    }
  },

  createWorkspaceFile: async (directory) => {
    const target = directory ?? get().rootPath
    if (!target) {
      get().newDocument()
      return
    }
    try {
      const file = await window.inkstone.createWorkspaceFile(target)
      set((state) => applyFiles(state, [file]))
      await get().refreshWorkspace()
    } catch (error) {
      set({ error: describeError(error) })
    }
  },

  selectDocument: (selectedId) => set({ selectedId }),
  selectDocumentAt: (index) => {
    const document = get().documents[index]
    if (document) set({ selectedId: document.id })
  },
  setDocumentText: (id, text) => set((state) => ({
    documents: state.documents.map((document) => (document.id === id ? { ...document, text } : document)),
  })),
  setCursor: (id, cursor) => set((state) => {
    const current = state.documents.find((document) => document.id === id)?.cursor
    if (!current || cursorMetricsEqual(current, cursor)) return state
    return {
      documents: state.documents.map((document) => (document.id === id ? { ...document, cursor } : document)),
    }
  }),

  saveDocument: async (id = get().selectedId ?? undefined, forceAs = false) => {
    const document = get().documents.find((item) => item.id === id)
    if (!document) return false
    try {
      const saved = forceAs
        ? await window.inkstone.saveDocumentAs(document.path || null, document.name, document.text)
        : await window.inkstone.saveDocument(document.path || null, document.name, document.text)
      if (!saved) return false
      set((state) => ({
        documents: state.documents.map((item) =>
          item.id === document.id ? { ...item, path: saved.path, name: saved.name, savedText: item.text } : item,
        ),
      }))
      await get().refreshWorkspace()
      return true
    } catch (error) {
      set({ error: describeError(error) })
      return false
    }
  },

  closeDocument: async (id = get().selectedId ?? undefined) => {
    const state = get()
    const document = state.documents.find((item) => item.id === id)
    if (!document) return
    if (document.text !== document.savedText) {
      const decision = await window.inkstone.confirmClose(document.name)
      if (decision === 'cancel') return
      if (decision === 'save' && !(await get().saveDocument(document.id))) return
    }
    set((current) => {
      const index = current.documents.findIndex((item) => item.id === document.id)
      const documents = current.documents.filter((item) => item.id !== document.id)
      let selectedId = current.selectedId
      if (selectedId === document.id) selectedId = documents[index]?.id ?? documents.at(-1)?.id ?? null
      return { documents, selectedId }
    })
  },

  exportDocument: async (format) => {
    const document = get().documents.find((item) => item.id === get().selectedId)
    if (!document) return
    try {
      const payload = {
        documentPath: document.path || null,
        name: document.name,
        html: buildHtmlExport(document.text, document.name),
      }
      if (format === 'html') await window.inkstone.exportHtml(payload)
      else await window.inkstone.exportPdf(payload)
    } catch (error) {
      set({ error: describeError(error) })
    }
  },

  renameNode: async (node, newName) => {
    try {
      const destination = await window.inkstone.renamePath(node.path, newName)
      if (!destination) return
      set((state) => ({
        documents: state.documents.map((document) => {
          const isExact = document.path === node.path
          const isChild = node.isDirectory && (document.path.startsWith(`${node.path}/`) || document.path.startsWith(`${node.path}\\`))
          if (!isExact && !isChild) return document
          const nextPath = destination + document.path.slice(node.path.length)
          return { ...document, path: nextPath, name: nextPath.split(/[/\\]/).at(-1) ?? document.name }
        }),
      }))
      await get().refreshWorkspace()
    } catch (error) {
      set({ error: describeError(error) })
    }
  },

  trashNode: async (node) => {
    try {
      if (!(await window.inkstone.trashPath(node.path))) return
      set((state) => {
        const removedIds = new Set(
          state.documents
            .filter((document) => document.path === node.path || document.path.startsWith(`${node.path}/`) || document.path.startsWith(`${node.path}\\`))
            .map((document) => document.id),
        )
        const documents = state.documents.filter((document) => !removedIds.has(document.id))
        return { documents, selectedId: state.selectedId && removedIds.has(state.selectedId) ? documents.at(-1)?.id ?? null : state.selectedId }
      })
      await get().refreshWorkspace()
    } catch (error) {
      set({ error: describeError(error) })
    }
  },

  setLayout: (layout) => set({ layout }),
  toggleSidebar: () => set((state) => ({ showSidebar: !state.showSidebar })),
  toggleOutline: () => set((state) => ({ showOutline: !state.showOutline })),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  updateSettings: (next) => set((state) => {
    const settings = { ...state.settings, ...next }
    localStorage.setItem('inkstone.settings', JSON.stringify(settings))
    return { settings }
  }),
  setError: (error) => set({ error }),
}))
