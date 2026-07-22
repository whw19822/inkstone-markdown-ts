import { describe, expect, it } from 'vitest'
import { validRenameName, viewAccelerators } from './platform'

describe('viewAccelerators', () => {
  it('keeps Command and Control as distinct modifiers on macOS', () => {
    expect(viewAccelerators(true)).toEqual({
      editor: 'Command+Control+1',
      split: 'Command+Control+2',
      reader: 'Command+Control+3',
      sidebar: 'Command+Control+S',
    })
  })

  it('uses non-conflicting shortcuts on Windows and Linux', () => {
    expect(viewAccelerators(false)).toEqual({
      editor: 'Control+Shift+1',
      split: 'Control+Shift+2',
      reader: 'Control+Shift+3',
      sidebar: 'Control+Shift+B',
    })
  })
})

describe('validRenameName', () => {
  it('rejects path traversal and both path separators on every platform', () => {
    for (const name of ['.', '..', '../outside.md', '..\\outside.md', 'folder/note.md', 'folder\\note.md']) {
      expect(validRenameName(name, 'win32')).toBeNull()
      expect(validRenameName(name, 'darwin')).toBeNull()
    }
  })

  it('rejects Windows-invalid and reserved names', () => {
    for (const name of ['draft?.md', 'bad:name.md', 'trailing.', 'CON', 'con.md', 'LPT9.txt']) {
      expect(validRenameName(name, 'win32')).toBeNull()
    }
  })

  it('allows ordinary names and preserves the existing outer-whitespace normalization', () => {
    expect(validRenameName('  Notes 02.md  ', 'win32')).toBe('Notes 02.md')
    expect(validRenameName('draft?.md', 'darwin')).toBe('draft?.md')
  })
})
