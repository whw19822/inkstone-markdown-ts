import type { Element, Root as HastRoot } from 'hast'
import type { Parent as MarkdownParent, Root as MarkdownRoot, Text } from 'mdast'
import { defaultUrlTransform } from 'react-markdown'
import type { UrlTransform } from 'react-markdown'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'

type SanitizeSchema = NonNullable<Parameters<typeof rehypeSanitize>[0]>

const additionalTags = [
  'abbr', 'address', 'article', 'aside', 'audio', 'bdi', 'bdo', 'caption', 'col', 'colgroup', 'data',
  'figcaption', 'figure', 'footer', 'header', 'main', 'mark', 'meter', 'nav', 'progress',
  'small', 'time', 'track', 'u', 'video', 'wbr',
]

const classAwareAttributes = Object.fromEntries(
  Object.entries(defaultSchema.attributes ?? {}).map(([tagName, definitions]) => [
    tagName,
    [...definitions.filter((definition) => (Array.isArray(definition) ? definition[0] : definition) !== 'className'), 'className'],
  ]),
)

export const htmlSanitizeSchema: SanitizeSchema = {
  ...defaultSchema,
  clobberPrefix: '',
  tagNames: [...new Set([...(defaultSchema.tagNames ?? []), ...additionalTags])],
  attributes: {
    ...classAwareAttributes,
    '*': [
      ...(classAwareAttributes['*'] ?? []),
      'className',
      'data*',
      'role',
      'style',
      'ariaHidden',
      'ariaLabel',
    ],
    a: [...(classAwareAttributes.a ?? []), 'download', 'rel', 'target'],
    audio: ['controls', 'crossOrigin', 'loop', 'muted', 'preload', 'src'],
    code: [...(classAwareAttributes.code ?? [])],
    col: ['span', 'width'],
    img: [
      ...(classAwareAttributes.img ?? []),
      'crossOrigin',
      'decoding',
      'height',
      'loading',
      'referrerPolicy',
      'sizes',
      'srcSet',
      'title',
      'width',
    ],
    input: ['type', 'checked', 'disabled'],
    meter: ['high', 'low', 'max', 'min', 'optimum', 'value'],
    progress: ['max', 'value'],
    source: ['height', 'media', 'sizes', 'src', 'srcSet', 'type', 'width'],
    time: ['dateTime'],
    track: ['default', 'kind', 'label', 'src', 'srcLang'],
    video: ['controls', 'crossOrigin', 'height', 'loop', 'muted', 'playsInline', 'poster', 'preload', 'src', 'width'],
  },
  protocols: {
    ...defaultSchema.protocols,
    href: [...new Set([...(defaultSchema.protocols?.href ?? []), 'tel'])],
    poster: ['http', 'https', 'file'],
    src: [...new Set([...(defaultSchema.protocols?.src ?? []), 'data', 'file'])],
  },
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/<[^>]+>/g, '')
    .replace(/[`*_~[\]()]|&[a-z]+;/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-') || 'section'
}

export function rehypeNormalizeHtml(): (tree: HastRoot) => void {
  return (tree) => {
    walkElements(tree, (element) => {
      const style = typeof element.properties.style === 'string' ? element.properties.style : ''
      const safeStyle = sanitizeInlineStyle(style, element.tagName)
      if (safeStyle) element.properties.style = safeStyle
      else delete element.properties.style

      const alignment = normalizeAlignment(element.properties.align)
      if (alignment) element.properties.align = alignment
      else delete element.properties.align

      if (element.tagName === 'a') normalizeLinkProperties(element)
      if (element.tagName === 'img' || element.tagName === 'source') {
        const srcSet = typeof element.properties.srcSet === 'string' ? sanitizeSrcSet(element.properties.srcSet) : ''
        if (srcSet) element.properties.srcSet = srcSet
        else delete element.properties.srcSet
      }
      if (element.tagName === 'audio' || element.tagName === 'video') {
        element.properties.controls = true
        delete element.properties.autoPlay
      }
    })
  }
}

export function rehypeHeadingIds(): (tree: HastRoot) => void {
  return (tree) => {
    const used = new Set<string>()
    walkElements(tree, (element) => {
      if (/^h[1-6]$/.test(element.tagName)) return
      const id = typeof element.properties.id === 'string' ? element.properties.id.trim() : ''
      if (id) used.add(id)
    })
    walkElements(tree, (element) => {
      if (!/^h[1-6]$/.test(element.tagName)) return
      const requested = typeof element.properties.id === 'string' ? element.properties.id.trim() : ''
      const base = requested || slugify(textFromHtml(element))
      let id = base
      let suffix = 1
      while (used.has(id)) id = `${base}-${suffix++}`
      used.add(id)
      element.properties.id = id
    })
  }
}

export function collectHtmlHeadings(tree: HastRoot): Array<{ id: string; level: number; title: string; line: number }> {
  const headings: Array<{ id: string; level: number; title: string; line: number }> = []
  walkElements(tree, (element) => {
    const match = /^h([1-6])$/.exec(element.tagName)
    if (!match) return
    headings.push({
      id: String(element.properties.id ?? slugify(textFromHtml(element))),
      level: Number(match[1]),
      title: textFromHtml(element).trim(),
      line: element.position?.start.line ?? 1,
    })
  })
  return headings
}

export function remarkHighlight(): (tree: MarkdownRoot) => void {
  return (tree) => transformHighlights(tree)
}

export const safeUrlTransform: UrlTransform = (url, key, node) => {
  if (/^data:/i.test(url)) return key === 'src' && node.tagName === 'img' && isSafeImageDataUrl(url) ? url : ''
  if (/^file:/i.test(url)) return key === 'src' || key === 'poster' ? url : ''
  return defaultUrlTransform(url)
}

export function isSafeImageDataUrl(source: string): boolean {
  return /^data:image\/(?:png|jpe?g|gif|webp|avif);base64,[a-z\d+/=\s]+$/i.test(source)
}

export function sanitizeSrcSet(source: string, transform: (url: string) => string = (url) => url): string {
  const withoutDataUrls = source.replace(/(?:^|,)\s*data:[^,\s]*,[^,\s]*(?:\s+\d+(?:\.\d+)?[wx])?/gi, '')
  return withoutDataUrls.split(',').flatMap((candidate) => {
    const match = /^(\S+)(?:\s+(\d+(?:\.\d+)?[wx]))?$/.exec(candidate.trim())
    if (!match?.[1] || /^data:/i.test(match[1])) return []
    const safeUrl = /^file:/i.test(match[1]) ? match[1] : defaultUrlTransform(match[1])
    if (!safeUrl) return []
    const transformed = transform(safeUrl)
    return transformed ? [`${transformed}${match[2] ? ` ${match[2]}` : ''}`] : []
  }).join(', ')
}

function walkElements(node: HastRoot | Element, visit: (element: Element) => void): void {
  if (node.type === 'element') visit(node)
  for (const child of node.children) {
    if (child.type === 'element') walkElements(child, visit)
  }
}

function textFromHtml(node: Element): string {
  return node.children.map((child) => {
    if (child.type === 'text') return child.value
    if (child.type !== 'element') return ''
    if (child.tagName === 'img') return String(child.properties.alt ?? '')
    return textFromHtml(child)
  }).join('')
}

function normalizeAlignment(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const alignment = value.toLowerCase()
  return /^(?:left|center|right|justify)$/.test(alignment) ? alignment : null
}

function normalizeLinkProperties(element: Element): void {
  if (element.properties.target !== '_blank') delete element.properties.target
  if (element.properties.target === '_blank') {
    const rel = new Set(String(element.properties.rel ?? '').split(/\s+/).filter(Boolean))
    rel.add('noopener')
    rel.add('noreferrer')
    element.properties.rel = [...rel]
  }
}

function sanitizeInlineStyle(style: string, tagName: string): string {
  const declarations: string[] = []
  for (const declaration of style.split(';')) {
    const separator = declaration.indexOf(':')
    if (separator < 1) continue
    let property = declaration.slice(0, separator).trim().toLowerCase()
    const value = declaration.slice(separator + 1).trim().toLowerCase()
    if (property === 'zoom' && tagName === 'img') property = 'width'
    if (!isSafeStyleDeclaration(property, value)) continue
    declarations.push(`${property}:${value}`)
  }
  return declarations.join(';')
}

function isSafeStyleDeclaration(property: string, value: string): boolean {
  if (!value || /(?:url|expression|javascript|@import|var\s*\(|\\|[{}<>])/i.test(value)) return false

  switch (property) {
    case 'text-align': return /^(?:left|right|center|justify|start|end)$/.test(value)
    case 'vertical-align': return /^(?:baseline|middle|top|bottom|sub|super|text-top|text-bottom)$/.test(value)
    case 'float': return /^(?:left|right|none)$/.test(value)
    case 'clear': return /^(?:left|right|both|none)$/.test(value)
    case 'white-space': return /^(?:normal|nowrap|pre|pre-wrap|pre-line|break-spaces)$/.test(value)
    case 'font-style': return /^(?:normal|italic|oblique)$/.test(value)
    case 'font-weight': return /^(?:normal|bold|bolder|lighter|[1-9]00)$/.test(value)
    case 'text-decoration': return /^(?:none|underline|overline|line-through)(?:\s+(?:underline|overline|line-through))*$/.test(value)
    case 'object-fit': return /^(?:contain|cover|fill|none|scale-down)$/.test(value)
    case 'caption-side': return /^(?:top|bottom)$/.test(value)
    case 'border-collapse': return /^(?:collapse|separate)$/.test(value)
    case 'opacity': return /^(?:0(?:\.\d+)?|1(?:\.0+)?)$/.test(value)
    case 'color':
    case 'background-color':
    case 'border-color': return isSafeColor(value)
    case 'font-size': return isSafeLength(value) || /^(?:xx-small|x-small|small|medium|large|x-large|xx-large|smaller|larger)$/.test(value)
    case 'line-height': return /^(?:normal|\d+(?:\.\d+)?)$/.test(value) || isSafeLength(value)
    case 'letter-spacing':
    case 'word-spacing': return value === 'normal' || isSafeLength(value)
    case 'width':
    case 'min-width':
    case 'max-width':
    case 'height':
    case 'min-height':
    case 'max-height': return /^(?:auto|fit-content|max-content|min-content)$/.test(value) || isSafeLength(value)
    case 'margin':
    case 'margin-top':
    case 'margin-right':
    case 'margin-bottom':
    case 'margin-left': return isSafeLengthList(value, true)
    case 'padding':
    case 'padding-top':
    case 'padding-right':
    case 'padding-bottom':
    case 'padding-left':
    case 'border-width':
    case 'border-radius': return isSafeLengthList(value, false)
    case 'border-style': return /^(?:none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset)(?:\s+(?:none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset)){0,3}$/.test(value)
    default: return false
  }
}

function isSafeLength(value: string, allowAuto = false): boolean {
  if (allowAuto && value === 'auto') return true
  return /^(?:0|\d{1,4}(?:\.\d{1,3})?(?:px|em|rem|%|ch|ex|vh|vw|vmin|vmax|pt))$/.test(value)
}

function isSafeLengthList(value: string, allowAuto: boolean): boolean {
  const parts = value.split(/\s+/)
  return parts.length > 0 && parts.length <= 4 && parts.every((part) => isSafeLength(part, allowAuto))
}

function isSafeColor(value: string): boolean {
  return /^(?:#[a-f\d]{3,8}|[a-z]{3,24}|(?:rgb|hsl)a?\([\d\s.,%/+-]+\))$/i.test(value)
}

function transformHighlights(parent: MarkdownParent): void {
  parent.children = parent.children.flatMap((node) => {
    if ('children' in node && Array.isArray(node.children)) transformHighlights(node as MarkdownParent)
    if (node.type !== 'text' || !node.value.includes('==')) return [node]
    const parts: Array<Text | { type: 'emphasis'; data: { hName: 'mark' }; children: Text[] }> = []
    const expression = /==([^=\n]+)==/g
    let cursor = 0
    for (const match of node.value.matchAll(expression)) {
      const index = match.index ?? 0
      if (index > cursor) parts.push({ type: 'text', value: node.value.slice(cursor, index) })
      parts.push({ type: 'emphasis', data: { hName: 'mark' }, children: [{ type: 'text', value: match[1] ?? '' }] })
      cursor = index + match[0].length
    }
    if (cursor === 0) return [node]
    if (cursor < node.value.length) parts.push({ type: 'text', value: node.value.slice(cursor) })
    return parts
  }) as MarkdownParent['children']
}
