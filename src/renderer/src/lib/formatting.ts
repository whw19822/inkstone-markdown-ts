import type { FormatCommand } from '@shared/types'

export interface FormatResult {
  text: string
  anchor: number
  head: number
}

function wrap(text: string, from: number, to: number, prefix: string, suffix: string, placeholder: string): FormatResult {
  const selected = text.slice(from, to)
  const content = selected || placeholder
  const replacement = `${prefix}${content}${suffix}`
  return {
    text: text.slice(0, from) + replacement + text.slice(to),
    anchor: from + prefix.length,
    head: from + prefix.length + content.length,
  }
}

function prefixLines(text: string, from: number, to: number, command: FormatCommand): FormatResult {
  const lineStart = text.lastIndexOf('\n', Math.max(0, from - 1)) + 1
  const nextBreak = text.indexOf('\n', to)
  const lineEnd = nextBreak === -1 ? text.length : nextBreak
  const lines = text.slice(lineStart, lineEnd).split('\n')
  const replaced = lines.map((line, index) => {
    switch (command) {
      case 'heading-1':
      case 'heading-2':
      case 'heading-3': {
        const level = Number(command.at(-1))
        return `${'#'.repeat(level)} ${line.replace(/^#{1,6}\s*/, '')}`
      }
      case 'quote': return `> ${line.replace(/^>\s?/, '')}`
      case 'bullet-list': return `- ${line.replace(/^\s*[-+*]\s+/, '')}`
      case 'numbered-list': return `${index + 1}. ${line.replace(/^\s*\d+[.)]\s+/, '')}`
      case 'task-list': return `- [ ] ${line.replace(/^\s*[-+*]\s+\[[ xX]\]\s+/, '')}`
      default: return line
    }
  }).join('\n')
  return {
    text: text.slice(0, lineStart) + replaced + text.slice(lineEnd),
    anchor: lineStart,
    head: lineStart + replaced.length,
  }
}

export function formatMarkdown(
  text: string,
  from: number,
  to: number,
  command: FormatCommand,
  imageSource?: string,
): FormatResult {
  switch (command) {
    case 'bold': return wrap(text, from, to, '**', '**', 'bold text')
    case 'italic': return wrap(text, from, to, '*', '*', 'italic text')
    case 'inline-code': return wrap(text, from, to, '`', '`', 'code')
    case 'strikethrough': return wrap(text, from, to, '~~', '~~', 'struck text')
    case 'link': return wrap(text, from, to, '[', '](https://)', 'link text')
    case 'image': return wrap(text, from, to, '![', `](${imageSource ?? 'image.png'})`, 'alt text')
    case 'code-block': return wrap(text, from, to, '```\n', '\n```', 'code')
    case 'horizontal-rule': {
      const insertion = `${from > 0 && !text.slice(0, from).endsWith('\n\n') ? '\n\n' : ''}---\n\n`
      return { text: text.slice(0, from) + insertion + text.slice(to), anchor: from + insertion.length, head: from + insertion.length }
    }
    default: return prefixLines(text, from, to, command)
  }
}
