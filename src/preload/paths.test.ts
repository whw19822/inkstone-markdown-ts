import { describe, expect, it } from 'vitest'
import { resolveAssetPath } from './paths'

describe('resolveAssetPath', () => {
  it('converts Windows drive-letter file URLs correctly', () => {
    expect(resolveAssetPath('C:\\Docs\\note.md', 'FILE:///C:/Images/My%20Photo.png', 'windows'))
      .toBe('C:\\Images\\My Photo.png')
  })

  it('preserves Windows UNC hosts', () => {
    expect(resolveAssetPath('C:\\Docs\\note.md', 'file://server/share/image.png', 'windows'))
      .toBe('\\\\server\\share\\image.png')
  })

  it('resolves relative paths with the target platform semantics', () => {
    expect(resolveAssetPath('C:\\Docs\\note.md', 'assets/image.png', 'windows'))
      .toBe('C:\\Docs\\assets\\image.png')
    expect(resolveAssetPath('/Users/example/note.md', 'assets/image.png', 'macos'))
      .toBe('/Users/example/assets/image.png')
  })
})
