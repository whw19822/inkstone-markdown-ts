import { Buffer } from 'node:buffer'
import { contextBridge, ipcRenderer } from 'electron'
import { resolveAssetPath } from './paths'
import type { DesktopPlatform, ExportPayload, InkstoneAPI, MenuCommand } from '../shared/types'

const platform: DesktopPlatform = process.platform === 'darwin' ? 'macos' : process.platform === 'win32' ? 'windows' : 'linux'

const api: InkstoneAPI = {
  platform,
  setTitleBarTheme: (theme) => ipcRenderer.send('window:set-title-bar-theme', theme),
  chooseDocuments: () => ipcRenderer.invoke('documents:choose'),
  readPaths: (paths) => ipcRenderer.invoke('documents:read-paths', paths),
  openRelative: (documentPath, source) => ipcRenderer.invoke('documents:open-relative', documentPath, source),
  chooseWorkspace: () => ipcRenderer.invoke('workspace:choose'),
  openWorkspace: (workspacePath) => ipcRenderer.invoke('workspace:open', workspacePath),
  refreshWorkspace: (workspacePath) => ipcRenderer.invoke('workspace:refresh', workspacePath),
  recentWorkspaces: () => ipcRenderer.invoke('workspace:recent'),
  createWorkspaceFile: (directory) => ipcRenderer.invoke('workspace:create-file', directory),
  renamePath: (targetPath, newName) => ipcRenderer.invoke('workspace:rename', targetPath, newName),
  trashPath: (targetPath) => ipcRenderer.invoke('workspace:trash', targetPath),
  revealPath: (targetPath) => ipcRenderer.invoke('shell:reveal', targetPath),
  saveDocument: (documentPath, name, text) => ipcRenderer.invoke('document:save', documentPath, name, text, false),
  saveDocumentAs: (documentPath, name, text) => ipcRenderer.invoke('document:save', documentPath, name, text, true),
  confirmClose: (name) => ipcRenderer.invoke('document:confirm-close', name),
  confirmCloseAll: (names) => ipcRenderer.invoke('window:confirm-close-all', names),
  allowWindowClose: () => ipcRenderer.invoke('window:allow-close'),
  exportHtml: (payload: ExportPayload) => ipcRenderer.invoke('document:export-html', payload),
  exportPdf: (payload: ExportPayload) => ipcRenderer.invoke('document:export-pdf', payload),
  chooseImage: (documentPath) => ipcRenderer.invoke('document:choose-image', documentPath),
  openExternal: (url) => ipcRenderer.invoke('shell:open-external', url),
  resolveAsset: (documentPath, source) => {
    if (!documentPath || /^(https?:|data:|blob:|inkstone-local:|#)/i.test(source)) return source
    const resolved = resolveAssetPath(documentPath, source, platform)
    return `inkstone-local://file/${Buffer.from(resolved).toString('base64url')}`
  },
  onMenuCommand: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, command: MenuCommand): void => callback(command)
    ipcRenderer.on('menu:command', listener)
    return () => ipcRenderer.removeListener('menu:command', listener)
  },
  onExternalOpen: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, paths: string[]): void => callback(paths)
    ipcRenderer.on('external:open', listener)
    return () => ipcRenderer.removeListener('external:open', listener)
  },
  onWindowCloseRequested: (callback) => {
    const listener = (): void => callback()
    ipcRenderer.on('window:request-close', listener)
    return () => ipcRenderer.removeListener('window:request-close', listener)
  },
}

contextBridge.exposeInMainWorld('inkstone', api)
