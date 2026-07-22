import { promises as fs } from 'node:fs'
import path from 'node:path'
import { Buffer } from 'node:buffer'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  protocol,
  shell,
  type MenuItemConstructorOptions,
} from 'electron'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import icon from '../../Resources/AppIcon.png?asset'
import { validRenameName, viewAccelerators } from './platform'
import type {
  CloseDecision,
  ExportPayload,
  FileNode,
  MenuCommand,
  OpenedFile,
  SavedFile,
  WorkspaceSnapshot,
} from '../shared/types'
import { markdownExtensions } from '../shared/types'

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'inkstone-local',
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
  },
])

let mainWindow: BrowserWindow | null = null
let allowWindowClose = false
let pendingExternalPaths: string[] = []
const supportedExtensions = new Set<string>(markdownExtensions)
const titleBarHeight = 48

function titleBarOverlay(theme: 'light' | 'dark'): Electron.TitleBarOverlay {
  return theme === 'dark'
    ? { color: '#24211e', symbolColor: '#e9e4de', height: titleBarHeight }
    : { color: '#f3f0eb', symbolColor: '#5f5b55', height: titleBarHeight }
}

function sendCommand(command: MenuCommand): void {
  mainWindow?.webContents.send('menu:command', command)
}

function menuItem(label: string, accelerator: string | undefined, command: MenuCommand): MenuItemConstructorOptions {
  return { label, accelerator, click: () => sendCommand(command) }
}

function installApplicationMenu(): void {
  const isMac = process.platform === 'darwin'
  const accelerators = viewAccelerators(isMac)
  const template: MenuItemConstructorOptions[] = []
  if (isMac) {
    template.push({
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        menuItem('Settings…', 'CmdOrCtrl+,', 'show-settings'),
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ] satisfies MenuItemConstructorOptions[],
    })
  }
  template.push(
    {
      label: 'File',
      submenu: [
        menuItem('New Document', 'CmdOrCtrl+N', 'new-document'),
        menuItem('New File in Workspace', 'CmdOrCtrl+Shift+N', 'new-workspace-file'),
        { type: 'separator' },
        menuItem('Open…', 'CmdOrCtrl+O', 'open-document'),
        menuItem('Open Workspace…', 'CmdOrCtrl+Shift+O', 'open-workspace'),
        { type: 'separator' },
        menuItem('Save', 'CmdOrCtrl+S', 'save'),
        menuItem('Save As…', 'CmdOrCtrl+Shift+S', 'save-as'),
        { type: 'separator' },
        menuItem('Export HTML…', 'CmdOrCtrl+Shift+E', 'export-html'),
        menuItem('Export PDF…', undefined, 'export-pdf'),
        { type: 'separator' },
        menuItem('Close Tab', 'CmdOrCtrl+W', 'close-tab'),
        ...(!isMac ? [{ type: 'separator' as const }, { role: 'quit' as const }] : []),
      ] satisfies MenuItemConstructorOptions[],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ] satisfies MenuItemConstructorOptions[],
    },
    {
      label: 'Format',
      submenu: [
        menuItem('Bold', 'CmdOrCtrl+B', 'format-bold'),
        menuItem('Italic', 'CmdOrCtrl+I', 'format-italic'),
        menuItem('Inline Code', 'CmdOrCtrl+`', 'format-inline-code'),
        menuItem('Strikethrough', undefined, 'format-strikethrough'),
        { type: 'separator' },
        menuItem('Heading 1', 'CmdOrCtrl+Alt+1', 'format-heading-1'),
        menuItem('Heading 2', 'CmdOrCtrl+Alt+2', 'format-heading-2'),
        menuItem('Heading 3', 'CmdOrCtrl+Alt+3', 'format-heading-3'),
        menuItem('Block Quote', undefined, 'format-quote'),
        menuItem('Bulleted List', undefined, 'format-bullet-list'),
        menuItem('Numbered List', undefined, 'format-numbered-list'),
        menuItem('Task List', undefined, 'format-task-list'),
        { type: 'separator' },
        menuItem('Insert Link', 'CmdOrCtrl+K', 'format-link'),
        menuItem('Insert Image', undefined, 'format-image'),
        menuItem('Code Block', undefined, 'format-code-block'),
        menuItem('Horizontal Rule', undefined, 'format-horizontal-rule'),
      ] satisfies MenuItemConstructorOptions[],
    },
    {
      label: 'View',
      submenu: [
        menuItem('Editor', accelerators.editor, 'layout-editor'),
        menuItem('Split View', accelerators.split, 'layout-split'),
        menuItem('Reader', accelerators.reader, 'layout-preview'),
        { type: 'separator' },
        menuItem('Toggle Outline', 'CmdOrCtrl+Alt+L', 'toggle-outline'),
        menuItem('Toggle Sidebar', accelerators.sidebar, 'toggle-sidebar'),
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { role: 'togglefullscreen' },
      ] satisfies MenuItemConstructorOptions[],
    },
    {
      label: 'Tabs',
      submenu: Array.from({ length: 9 }, (_, index) =>
        menuItem(`Select Tab ${index + 1}`, `CmdOrCtrl+${index + 1}`, `select-tab-${index + 1}`),
      ),
    },
    {
      label: 'Window',
      submenu: isMac
        ? ([{ role: 'minimize' }, { role: 'zoom' }, { type: 'separator' }, { role: 'front' }] satisfies MenuItemConstructorOptions[])
        : ([{ role: 'minimize' }, { role: 'zoom' }] satisfies MenuItemConstructorOptions[]),
    },
  )

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 920,
    minHeight: 620,
    show: false,
    backgroundColor: '#f7f5f2',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    titleBarOverlay:
      process.platform === 'darwin'
        ? false
        : titleBarOverlay('light'),
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())
  mainWindow.on('close', (event) => {
    if (allowWindowClose) return
    event.preventDefault()
    mainWindow?.webContents.send('window:request-close')
  })
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.webContents.on('did-finish-load', () => {
    if (pendingExternalPaths.length > 0) {
      mainWindow?.webContents.send('external:open', [...new Set(pendingExternalPaths)])
      pendingExternalPaths = []
    }
  })

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

async function readFile(documentPath: string): Promise<OpenedFile | null> {
  try {
    const stat = await fs.stat(documentPath)
    if (!stat.isFile() || !supportedExtensions.has(path.extname(documentPath).slice(1).toLowerCase())) return null
    return {
      path: path.resolve(documentPath),
      name: path.basename(documentPath),
      text: await fs.readFile(documentPath, 'utf8'),
    }
  } catch {
    return null
  }
}

async function readFiles(paths: string[]): Promise<OpenedFile[]> {
  const files = await Promise.all(paths.map(readFile))
  return files.filter((file): file is OpenedFile => file !== null)
}

async function readTree(directory: string): Promise<FileNode[]> {
  let entries
  try {
    entries = await fs.readdir(directory, { withFileTypes: true })
  } catch {
    return []
  }

  const nodes = await Promise.all(
    entries
      .filter((entry) => !entry.name.startsWith('.'))
      .map(async (entry): Promise<FileNode | null> => {
        const entryPath = path.join(directory, entry.name)
        if (entry.isDirectory()) {
          return { path: entryPath, name: entry.name, isDirectory: true, children: await readTree(entryPath) }
        }
        if (!entry.isFile() || !supportedExtensions.has(path.extname(entry.name).slice(1).toLowerCase())) return null
        return { path: entryPath, name: entry.name, isDirectory: false }
      }),
  )

  return nodes
    .filter((node): node is FileNode => node !== null)
    .sort((a, b) => (a.isDirectory === b.isDirectory ? a.name.localeCompare(b.name, undefined, { numeric: true }) : a.isDirectory ? -1 : 1))
}

function settingsPath(): string {
  return path.join(app.getPath('userData'), 'workspace.json')
}

async function loadRecentWorkspaces(): Promise<string[]> {
  try {
    const parsed = JSON.parse(await fs.readFile(settingsPath(), 'utf8')) as { recentWorkspaces?: string[] }
    const candidates = parsed.recentWorkspaces ?? []
    const existing = await Promise.all(candidates.map(async (item) => ((await fs.stat(item).catch(() => null))?.isDirectory() ? item : null)))
    return existing.filter((item): item is string => item !== null)
  } catch {
    return []
  }
}

async function rememberWorkspace(workspacePath: string): Promise<void> {
  const recent = await loadRecentWorkspaces()
  const next = [workspacePath, ...recent.filter((item) => item !== workspacePath)].slice(0, 6)
  await fs.mkdir(path.dirname(settingsPath()), { recursive: true })
  await fs.writeFile(settingsPath(), JSON.stringify({ recentWorkspaces: next }, null, 2), 'utf8')
}

async function workspaceSnapshot(workspacePath: string): Promise<WorkspaceSnapshot | null> {
  const resolved = path.resolve(workspacePath)
  const stat = await fs.stat(resolved).catch(() => null)
  if (!stat?.isDirectory()) return null
  return { path: resolved, name: path.basename(resolved), tree: await readTree(resolved) }
}

function normalizeMarkdownName(name: string): string {
  return path.extname(name) ? name : `${name}.md`
}

async function saveDocument(
  documentPath: string | null,
  name: string,
  text: string,
  forceDialog: boolean,
): Promise<SavedFile | null> {
  let destination = documentPath
  if (!destination || forceDialog) {
    const response = await dialog.showSaveDialog(mainWindow!, {
      title: 'Save Markdown Document',
      defaultPath: documentPath ?? normalizeMarkdownName(name),
      filters: [
        { name: 'Markdown', extensions: ['md', 'markdown', 'mdown', 'mkd'] },
        { name: 'Text', extensions: ['txt'] },
      ],
    })
    if (response.canceled || !response.filePath) return null
    destination = path.extname(response.filePath) ? response.filePath : `${response.filePath}.md`
  }
  await fs.writeFile(destination, text, 'utf8')
  return { path: destination, name: path.basename(destination) }
}

async function exportFile(payload: ExportPayload, format: 'html' | 'pdf'): Promise<boolean> {
  const baseName = path.basename(payload.name, path.extname(payload.name))
  const response = await dialog.showSaveDialog(mainWindow!, {
    title: `Export ${format.toUpperCase()}`,
    defaultPath: path.join(payload.documentPath ? path.dirname(payload.documentPath) : app.getPath('documents'), `${baseName}.${format}`),
    filters: [{ name: format.toUpperCase(), extensions: [format] }],
  })
  if (response.canceled || !response.filePath) return false

  const html = await prepareExportHtml(payload)
  if (format === 'html') {
    await fs.writeFile(response.filePath, html, 'utf8')
    return true
  }

  const pdfWindow = new BrowserWindow({ show: false, webPreferences: { sandbox: true } })
  try {
    await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
    const pdf = await pdfWindow.webContents.printToPDF({ printBackground: true, pageSize: 'A4' })
    await fs.writeFile(response.filePath, pdf)
    return true
  } finally {
    pdfWindow.destroy()
  }
}

async function prepareExportHtml(payload: ExportPayload): Promise<string> {
  if (!payload.documentPath) return payload.html
  const directory = path.dirname(payload.documentPath)
  const matches = [...payload.html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/gi)]
  let html = payload.html
  for (const match of matches) {
    const source = match[1]
    if (!source || /^(https?:|data:|blob:)/i.test(source)) continue
    try {
      const imagePath = source.startsWith('file:') ? fileURLToPath(source) : path.resolve(directory, decodeURIComponent(source))
      const data = await fs.readFile(imagePath)
      const mime = mimeTypeForPath(imagePath)
      html = html.replaceAll(`src="${source}"`, `src="data:${mime};base64,${data.toString('base64')}"`)
    } catch {
      // Keep the original source when an image is unavailable.
    }
  }
  return html
}

function mimeTypeForPath(filePath: string): string {
  switch (path.extname(filePath).toLowerCase()) {
    case '.png': return 'image/png'
    case '.jpg':
    case '.jpeg': return 'image/jpeg'
    case '.gif': return 'image/gif'
    case '.webp': return 'image/webp'
    case '.svg': return 'image/svg+xml'
    default: return 'application/octet-stream'
  }
}

function registerIpcHandlers(): void {
  ipcMain.on('window:set-title-bar-theme', (_event, theme: 'light' | 'dark') => {
    if (process.platform === 'darwin' || (theme !== 'light' && theme !== 'dark')) return
    mainWindow?.setTitleBarOverlay(titleBarOverlay(theme))
  })
  ipcMain.handle('documents:choose', async (): Promise<OpenedFile[]> => {
    const response = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Markdown', extensions: [...markdownExtensions] },
        { name: 'All Files', extensions: ['*'] },
      ],
    })
    return response.canceled ? [] : readFiles(response.filePaths)
  })
  ipcMain.handle('documents:read-paths', (_event, paths: string[]) => readFiles(paths))
  ipcMain.handle('documents:open-relative', (_event, documentPath: string, source: string) => {
    if (!documentPath || !source || source.startsWith('#') || /^(https?:|mailto:|data:|javascript:)/i.test(source)) return null
    const target = source.startsWith('file:')
      ? fileURLToPath(source)
      : path.isAbsolute(source)
        ? source
        : path.resolve(path.dirname(documentPath), decodeURIComponent(source))
    return readFile(target)
  })
  ipcMain.handle('workspace:choose', async (): Promise<WorkspaceSnapshot | null> => {
    const response = await dialog.showOpenDialog(mainWindow!, { properties: ['openDirectory', 'createDirectory'] })
    if (response.canceled || !response.filePaths[0]) return null
    const snapshot = await workspaceSnapshot(response.filePaths[0])
    if (snapshot) await rememberWorkspace(snapshot.path)
    return snapshot
  })
  ipcMain.handle('workspace:open', async (_event, workspacePath: string) => {
    const snapshot = await workspaceSnapshot(workspacePath)
    if (snapshot) await rememberWorkspace(snapshot.path)
    return snapshot
  })
  ipcMain.handle('workspace:refresh', async (_event, workspacePath: string) => {
    const snapshot = await workspaceSnapshot(workspacePath)
    if (!snapshot) throw new Error('The workspace is no longer available.')
    return snapshot
  })
  ipcMain.handle('workspace:recent', () => loadRecentWorkspaces())
  ipcMain.handle('workspace:create-file', async (_event, directory: string): Promise<OpenedFile> => {
    let candidate = path.join(directory, 'Untitled.md')
    let suffix = 2
    while (await fs.access(candidate).then(() => true).catch(() => false)) candidate = path.join(directory, `Untitled ${suffix++}.md`)
    const text = '# Untitled\n\nStart writing…\n'
    await fs.writeFile(candidate, text, 'utf8')
    return { path: candidate, name: path.basename(candidate), text }
  })
  ipcMain.handle('workspace:rename', async (_event, targetPath: string, newName: string): Promise<string | null> => {
    const cleanName = validRenameName(newName, process.platform)
    if (!cleanName) return null
    const destination = path.join(path.dirname(targetPath), cleanName)
    if (await fs.access(destination).then(() => true).catch(() => false)) throw new Error(`An item named ${cleanName} already exists.`)
    await fs.rename(targetPath, destination)
    return destination
  })
  ipcMain.handle('workspace:trash', async (_event, targetPath: string): Promise<boolean> => {
    const response = await dialog.showMessageBox(mainWindow!, {
      type: 'warning',
      message: `Move ${path.basename(targetPath)} to Trash?`,
      detail: 'You can recover it from the Trash.',
      buttons: ['Move to Trash', 'Cancel'],
      defaultId: 1,
      cancelId: 1,
    })
    if (response.response !== 0) return false
    await shell.trashItem(targetPath)
    return true
  })
  ipcMain.handle('shell:reveal', (_event, targetPath: string) => shell.showItemInFolder(targetPath))
  ipcMain.handle('shell:open-external', (_event, url: string) => (/^(https?:|mailto:)/i.test(url) ? shell.openExternal(url) : undefined))
  ipcMain.handle('document:save', (_event, documentPath: string | null, name: string, text: string, forceDialog: boolean) =>
    saveDocument(documentPath, name, text, forceDialog),
  )
  ipcMain.handle('document:confirm-close', async (_event, name: string): Promise<CloseDecision> => {
    const response = await dialog.showMessageBox(mainWindow!, {
      type: 'warning',
      message: `Save changes to ${name}?`,
      detail: 'Your changes will be lost if you close without saving.',
      buttons: ['Save', 'Cancel', 'Don’t Save'],
      defaultId: 0,
      cancelId: 1,
    })
    return response.response === 0 ? 'save' : response.response === 2 ? 'discard' : 'cancel'
  })
  ipcMain.handle('window:confirm-close-all', async (_event, names: string[]): Promise<CloseDecision> => {
    const response = await dialog.showMessageBox(mainWindow!, {
      type: 'warning',
      message: `Save changes to ${names.length === 1 ? names[0] : `${names.length} documents`}?`,
      detail: 'Your changes will be lost if you quit without saving.',
      buttons: ['Save All', 'Cancel', 'Don’t Save'],
      defaultId: 0,
      cancelId: 1,
    })
    return response.response === 0 ? 'save' : response.response === 2 ? 'discard' : 'cancel'
  })
  ipcMain.handle('window:allow-close', () => {
    allowWindowClose = true
    mainWindow?.close()
  })
  ipcMain.handle('document:export-html', (_event, payload: ExportPayload) => exportFile(payload, 'html'))
  ipcMain.handle('document:export-pdf', (_event, payload: ExportPayload) => exportFile(payload, 'pdf'))
  ipcMain.handle('document:choose-image', async (_event, documentPath: string | null): Promise<string | null> => {
    const response = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'] }],
    })
    const source = response.filePaths[0]
    if (response.canceled || !source) return null
    if (!documentPath) return pathToFileURL(source).toString()
    const assetsDirectory = path.join(path.dirname(documentPath), 'assets')
    await fs.mkdir(assetsDirectory, { recursive: true })
    const extension = path.extname(source)
    const stem = path.basename(source, extension)
    let destination = path.join(assetsDirectory, path.basename(source))
    let suffix = 2
    while (await fs.access(destination).then(() => true).catch(() => false)) destination = path.join(assetsDirectory, `${stem}-${suffix++}${extension}`)
    await fs.copyFile(source, destination)
    return path.relative(path.dirname(documentPath), destination).split(path.sep).join('/')
  })
}

function collectExternalPaths(argv: string[]): string[] {
  return argv.filter((argument) => !argument.startsWith('-') && supportedExtensions.has(path.extname(argument).slice(1).toLowerCase()))
}

const hasLock = app.requestSingleInstanceLock()
if (!hasLock) {
  app.quit()
} else {
  app.on('second-instance', (_event, argv) => {
    const paths = collectExternalPaths(argv)
    if (paths.length > 0) mainWindow?.webContents.send('external:open', paths)
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.on('open-file', (event, filePath) => {
    event.preventDefault()
    if (mainWindow && !mainWindow.webContents.isLoading()) mainWindow.webContents.send('external:open', [filePath])
    else pendingExternalPaths.push(filePath)
  })

  app.whenReady().then(() => {
    electronApp.setAppUserModelId('com.whw.inkstone')
    app.on('browser-window-created', (_event, window) => optimizer.watchWindowShortcuts(window))
    protocol.handle('inkstone-local', async (request) => {
      try {
        const encoded = new URL(request.url).pathname.slice(1)
        const localPath = Buffer.from(encoded, 'base64url').toString('utf8')
        const data = await fs.readFile(localPath)
        return new Response(new Uint8Array(data), { headers: { 'content-type': mimeTypeForPath(localPath) } })
      } catch {
        return new Response('Not found', { status: 404 })
      }
    })
    registerIpcHandlers()
    installApplicationMenu()
    pendingExternalPaths.push(...collectExternalPaths(process.argv))
    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
