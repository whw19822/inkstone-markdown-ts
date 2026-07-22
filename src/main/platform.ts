export interface ViewAccelerators {
  editor: string
  split: string
  reader: string
  sidebar: string
}

export function viewAccelerators(isMac: boolean): ViewAccelerators {
  const layoutChord = isMac ? 'Command+Control' : 'Control+Shift'
  return {
    editor: `${layoutChord}+1`,
    split: `${layoutChord}+2`,
    reader: `${layoutChord}+3`,
    sidebar: isMac ? 'Command+Control+S' : 'Control+Shift+B',
  }
}

const windowsReservedName = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i

export function validRenameName(name: string, platform: NodeJS.Platform): string | null {
  const cleanName = name.trim()
  if (!cleanName || cleanName === '.' || cleanName === '..' || /[/\\]/.test(cleanName)) return null
  if (
    platform === 'win32' &&
    (/[<>:"|?*\u0000-\u001F]/.test(cleanName) || cleanName.endsWith('.') || windowsReservedName.test(cleanName))
  ) return null
  return cleanName
}
