export const markdownExtensions = ['md', 'markdown', 'mdown', 'mkd', 'txt'] as const

export type EditorLayout = 'editor' | 'split' | 'preview'
export type Theme = 'system' | 'light' | 'dark'
export type Typeface = 'system' | 'serif' | 'monospace'
export type DesktopPlatform = 'macos' | 'windows' | 'linux'
export type MenuCommand =
  | 'new-document'
  | 'new-workspace-file'
  | 'open-document'
  | 'open-workspace'
  | 'save'
  | 'save-as'
  | 'close-tab'
  | 'export-html'
  | 'export-pdf'
  | 'layout-editor'
  | 'layout-split'
  | 'layout-preview'
  | 'toggle-outline'
  | 'toggle-sidebar'
  | 'show-settings'
  | `select-tab-${number}`
  | `format-${FormatCommand}`

export type FormatCommand =
  | 'bold'
  | 'italic'
  | 'inline-code'
  | 'strikethrough'
  | 'heading-1'
  | 'heading-2'
  | 'heading-3'
  | 'quote'
  | 'bullet-list'
  | 'numbered-list'
  | 'task-list'
  | 'link'
  | 'image'
  | 'code-block'
  | 'horizontal-rule'

export interface FileNode {
  path: string
  name: string
  isDirectory: boolean
  children?: FileNode[]
}

export interface OpenedFile {
  path: string
  name: string
  text: string
}

export interface WorkspaceSnapshot {
  path: string
  name: string
  tree: FileNode[]
}

export interface SavedFile {
  path: string
  name: string
}

export interface ExportPayload {
  documentPath: string | null
  name: string
  html: string
}

export interface CursorMetrics {
  line: number
  column: number
  words: number
  characters: number
  selectionLength: number
}

export interface EditorSettings {
  theme: Theme
  fontSize: number
  typeface: Typeface
  lineHeight: number
  spellCheck: boolean
  showLineNumbers: boolean
  synchronizedScrolling: boolean
}

export type CloseDecision = 'save' | 'discard' | 'cancel'

export interface InkstoneAPI {
  readonly platform: DesktopPlatform
  setTitleBarTheme(theme: 'light' | 'dark'): void
  chooseDocuments(): Promise<OpenedFile[]>
  readPaths(paths: string[]): Promise<OpenedFile[]>
  openRelative(documentPath: string, source: string): Promise<OpenedFile | null>
  chooseWorkspace(): Promise<WorkspaceSnapshot | null>
  openWorkspace(path: string): Promise<WorkspaceSnapshot | null>
  refreshWorkspace(path: string): Promise<WorkspaceSnapshot>
  recentWorkspaces(): Promise<string[]>
  createWorkspaceFile(directory: string): Promise<OpenedFile>
  renamePath(path: string, newName: string): Promise<string | null>
  trashPath(path: string): Promise<boolean>
  revealPath(path: string): Promise<void>
  saveDocument(path: string | null, name: string, text: string): Promise<SavedFile | null>
  saveDocumentAs(path: string | null, name: string, text: string): Promise<SavedFile | null>
  confirmClose(name: string): Promise<CloseDecision>
  confirmCloseAll(names: string[]): Promise<CloseDecision>
  allowWindowClose(): Promise<void>
  exportHtml(payload: ExportPayload): Promise<boolean>
  exportPdf(payload: ExportPayload): Promise<boolean>
  chooseImage(documentPath: string | null): Promise<string | null>
  openExternal(url: string): Promise<void>
  resolveAsset(documentPath: string | null, source: string): string
  onMenuCommand(callback: (command: MenuCommand) => void): () => void
  onExternalOpen(callback: (paths: string[]) => void): () => void
  onWindowCloseRequested(callback: () => void): () => void
}
