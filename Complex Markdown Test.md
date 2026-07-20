---
title: Inkstone Complex Markdown Test
author: Inkstone QA
tags: [markdown, gfm, renderer, 中文]
updated: 2026-07-14
---

# Inkstone · Complex Markdown Test

这份文档用于检查编辑器、分屏预览、阅读模式、导出 HTML/PDF，以及双向同步滚动。

> Tip: 在分屏模式中滚动此文档，检查编辑器与预览是否能稳定跟随。

## Table of contents

1. [Inline formatting](#inline-formatting)
2. [Lists and tasks](#lists-and-tasks)
3. [Tables](#tables)
4. [Code and math](#code-and-math)
5. [Links, images, and safety](#links-images-and-safety)
6. [中文标题与 Unicode](#中文标题与-unicode)

---

## Inline formatting

Regular text, *emphasis*, **strong emphasis**, ***both***, ~~strikethrough~~, and ==Inkstone highlight==.

Use `inline code`, including `code | pipe`, `let name = "Inkstone"`, and escaped punctuation: \*not emphasis\*, \_not emphasis\_, \[not a link\].

An inline line break follows here.<br>
This line begins after two trailing spaces.

This is a soft line break in Markdown;
it should remain part of the same paragraph.

Characters requiring HTML escaping: `<script>alert("not executed")</script> & "quotes" 'single quotes'`.

## Lists and tasks

- A bullet item
  - A nested bullet
    - Third-level nesting
      - **Nested rich text** with `code`
  - Another nested item
- A second top-level item

3. Ordered lists can start at a non-default number
   1. Nested ordered item
   2. Another nested ordered item
4. The following item preserves its number

- [x] Parse CommonMark and GFM through the AST
- [x] Keep preview source-location anchors
- [ ] Add KaTeX if real formula typesetting is required
- [ ] Test a very long document with thousands of lines

> A block quote can contain multiple paragraphs.
>
> It also supports **strong text**, [links](https://example.com), and `code`.
>
> - A list inside a quote
> - Another item

## Tables

| Left aligned | Center aligned | Right aligned | Escaped / code pipes |
| :--- | :---: | ---: | :--- |
| Plain text | Center | 42 | Escaped \| pipe |
| **Strong** | `inline code` | 1,024 | `code | pipe` |
| [A link](https://example.com) | ==Highlight== | `0xFF` | `a | b | c` |

The outer table pipes are optional:

Name | Value | Notes
--- | ---: | ---
Inkstone | 1.0.4 | GFM table without outer pipes
Emoji | 100% | 🧪 ✅ ✨

## Code and math

```swift
import Foundation

struct Note: Identifiable {
    let id = UUID()
    let title: String
    let tags: [String]
}

let note = Note(title: "Inkstone", tags: ["Markdown", "macOS"])
print(note.title)
```

```json
{
  "renderer": "swift-markdown",
  "features": ["tables", "task lists", "source locations"],
  "darkMode": true
}
```

```
Plain code blocks should still preserve <tags>, &, and indentation.
    Four leading spaces remain visible here.
```

The current math extension intentionally displays source text in a styled block:

$$
\int_0^1 x^2\,dx = \frac{1}{3}
$$

```markdown
This code fence contains a literal math delimiter:
$$
It must remain code, not become a math block.
$$
```

## Links, images, and safety

- External link: [OpenAI](https://openai.com)
- Mail link: [hello@example.com](mailto:hello@example.com)
- Local anchor: [Back to top](#inkstone--complex-markdown-test)
- Relative local file: [README](README.md)
- An unsafe `javascript:` URL is intentionally shown as plain text: [do not run](javascript:alert(1))

The following embedded SVG is a self-contained image test and should render without a network connection:

![Inkstone preview sample](data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%22480%22%20height=%22160%22%20viewBox=%220%200%20480%20160%22%3E%3Crect%20width=%22480%22%20height=%22160%22%20rx=%2216%22%20fill=%22%23282726%22/%3E%3Cpath%20d=%22M48%2044h384M48%2080h280M48%20116h336%22%20stroke=%22%23e08a61%22%20stroke-width=%2212%22%20stroke-linecap=%22round%22/%3E%3Ctext%20x=%2248%22%20y=%22146%22%20fill=%22%23e9e8e4%22%20font-family=%22sans-serif%22%20font-size=%2220%22%3EInkstone%20offline%20image%20test%3C/text%3E%3C/svg%3E)

Raw HTML is displayed as text rather than executed:

<details><summary>This must not become an interactive HTML element</summary><p>Raw HTML is escaped by the renderer.</p></details>

## 中文标题与 Unicode

### 多语言文本

中文、English、日本語、한국어、العربية，以及 emoji：😀 🧠 🚀。

重音字符：café, naïve, déjà vu, São Paulo。

### Repeated heading

This heading title appears twice, so anchor IDs should remain unique.

### Repeated heading

The second heading should receive a suffixed anchor ID.

---

## Long paragraph for scrolling

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer euismod, magna at dignissim posuere, est lectus volutpat leo, sed interdum ligula nulla nec justo. Donec aliquet, metus sit amet semper gravida, neque ligula venenatis erat, in pellentesque magna lacus sed elit. Curabitur faucibus, sapien vel imperdiet luctus, lacus justo feugiat augue, vitae volutpat erat est at neque. Sed in tortor quis nibh vulputate varius. Suspendisse potenti. Nulla facilisi.

Repeat this section while testing scroll interpolation: the preview should track the nearest `data-source-location` anchors rather than jumping only at headings. Move the editor caret through the table, nested lists, code blocks, and this paragraph to confirm that the reader follows naturally.

---

End of complex Markdown test document.
