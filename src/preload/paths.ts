import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { DesktopPlatform } from '../shared/types'

export function resolveAssetPath(documentPath: string, source: string, platform: DesktopPlatform): string {
  const isWindows = platform === 'windows'
  const pathApi = isWindows ? path.win32 : path.posix
  if (/^file:/i.test(source)) return fileURLToPath(source, { windows: isWindows })
  const decoded = decodeURIComponent(source)
  return pathApi.isAbsolute(decoded) ? decoded : pathApi.resolve(pathApi.dirname(documentPath), decoded)
}
