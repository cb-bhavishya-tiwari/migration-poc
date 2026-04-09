# MDAST analysis: pricing page features

This document summarizes the MDAST shapes produced from **fetched pricing-page feature markdown** (`pricing_features_output.json`), using the same pipeline as `process_features_pipeline.js`:

`formatMarkdown` → **remark-parse** + **remark-gfm** + **remark-tooltip**

The numeric inventory below comes from a full pass over that dataset. To refresh numbers, run:

```bash
cd validate-ast
node analyze_mdast_from_pricing_features.js
```

and open `mdast_analysis_report.json`.

---

## Dataset snapshot (report meta)

| Metric | Value |
|--------|------:|
| Generated at | 2026-04-01 (see report for exact ISO timestamp) |
| Pricing pages | 328 |
| Feature strings (non-empty) | 2,157 |
| Parsed successfully | 2,157 |
| Parse errors | 0 |
| Distinct `node.type` values | 15 |
| Max tree depth (root = 0) | 6 |

**GFM extras in this corpus:** unordered lists only; **no** fenced code blocks, **no** GFM tables, **no** footnote definitions, **no** link reference definitions in practice (counts are zero where noted in the report).

---

## Why this matters for MDAST → HTML

A recursive serializer typically:

1. Switches on `node.type`.
2. Reads type-specific fields (see **Properties** per type below).
3. Walks `children` where present (leaf type: `text` has `value` only).

**Custom node:** `tooltip` comes from `remark-tooltip` (`[label]{tooltip body}`), not from stock CommonMark. You must implement it explicitly (for example `<span>` + `title` or a dedicated tooltip component).

**Raw HTML:** `html` nodes contain a `value` string. Rendering as real DOM requires sanitization or a strict allowlist; otherwise treat as escaped text or strip.

---

## Node types present (with counts)

Sorted by frequency. Counts are **total node instances** across all parsed feature trees.

| `type` | Count | Role |
|--------|------:|------|
| `text` | 17,343 | Leaf text; field `value` |
| `paragraph` | 13,713 | Block paragraph |
| `listItem` | 8,367 | One list row |
| `root` | 2,157 | Document root (one per feature string) |
| `list` | 2,045 | Bullet/ordered list container |
| `heading` | 1,958 | ATX heading; `depth` 1–6 |
| `strong` | 1,682 | Bold inline |
| `blockquote` | 1,286 | Quoted block |
| `tooltip` | 412 | Custom: visible `text`, hover/aria `tooltip` |
| `emphasis` | 394 | Italic inline |
| `link` | 288 | Autolink / `[text](url)` |
| `delete` | 245 | Strikethrough (GFM) |
| `image` | 153 | Image |
| `thematicBreak` | 77 | Horizontal rule (`---`) |
| `html` | 30 | Raw HTML snippet |

**Not observed in this dataset** (your HTML layer may still want fallbacks): `code` (fenced), `inlineCode`, `table`, `tableRow`, `tableCell`, `footnoteReference`, `definition`, `yaml` frontmatter, etc.

---

## Properties observed per node type

These are the keys that appeared on nodes (excluding `type`, `children`, `position`):

| Type | Properties |
|------|------------|
| `heading` | `depth` |
| `text` | `value` |
| `list` | `ordered`, `spread`, `start` |
| `listItem` | `checked`, `spread` |
| `tooltip` | `text`, `tooltip` |
| `image` | `alt`, `title`, `url` |
| `link` | `title`, `url` |
| `html` | `value` |

---

## Nesting patterns (parent → child)

High-frequency edges describe how nodes actually nest in this data (not every theoretical MDAST tree):

- `list` → `listItem` → `paragraph` → (`text` | `strong` | `emphasis` | `link` | `tooltip` | `delete` | `image` | `html` | …)
- `root` → `heading` / `paragraph` / `list` / `blockquote` / `thematicBreak`
- `blockquote` → `paragraph` (only edge in sample)
- Inline nesting examples: `paragraph` → `strong` → `text`; `strong` → `emphasis` → `text`; `delete` → `emphasis`; `heading` → `strong` / `tooltip` / `image`

Max depth 6 occurs along paths that stack block content and multiple inline wrappers down to `text`.

---

## Heading and list shape (this corpus)

- **Heading depths:** almost all `depth: 1` (1,956); two nodes at `depth: 3`.
- **Lists:** all **unordered** in the report (`ordered: false`); no ordered-list instances counted.

---

## Example HTML (illustrative)

The following is **not** a production serializer; it shows a reasonable HTML target per MDAST type. Adjust class names, sanitization, and tooltip behavior to your product.

### `root`

Wrap the serialized children (often a fragment; below shown as a div for clarity).

```html
<div class="mdast-root">
  <!-- children -->
</div>
```

### `heading` (`depth`)

```html
<h1 class="mdast-heading">What's included</h1>
<!-- use <h2>…</h6> for depth 2…6 -->
```

### `paragraph`

```html
<p class="mdast-p">…children…</p>
```

### `text` (`value`)

Escape `value` for HTML (entities for `<`, `>`, `&`, quotes).

```html
<!-- if value is "Save 70%" -->
Save 70%
```

### `strong`

```html
<strong class="mdast-strong">…children…</strong>
```

### `emphasis`

```html
<em class="mdast-em">…children…</em>
```

### `delete` (strikethrough)

```html
<del class="mdast-del">…children…</del>
```

### `link` (`url`, optional `title`)

```html
<a class="mdast-link" href="https://example.com" title="Optional title">…children…</a>
```

### `image` (`url`, `alt`, optional `title`)

```html
<img class="mdast-img" src="https://example.com/x.png" alt="Description" title="Optional title" loading="lazy" />
```

### `list` / `listItem` (`ordered`, `start`, `checked` on items)

```html
<ul class="mdast-ul">
  <li class="mdast-li"><p>First item</p></li>
  <li class="mdast-li"><p>Second</p></li>
</ul>
```

For ordered lists (not seen in counts but valid MDAST):

```html
<ol class="mdast-ol" start="1">
  <li class="mdast-li">…</li>
</ol>
```

Task list items (`checked` true/false) map to checkbox markup if you support it.

### `blockquote`

```html
<blockquote class="mdast-bq">
  <p>…</p>
</blockquote>
```

### `thematicBreak`

```html
<hr class="mdast-hr" />
```

### `tooltip` (custom — `text`, `tooltip`)

Option A: native hint (simple, limited styling):

```html
<span class="mdast-tooltip" title="Tooltip body goes here">ⓘ</span>
```

Option B: accessible button + your component (pseudo-markup):

```html
<button type="button" class="mdast-tooltip-trigger" aria-describedby="tt-1">ⓘ</button>
<span id="tt-1" role="tooltip" hidden>Tooltip body</span>
```

Use `node.text` as the visible label and `node.tooltip` as the explanation string.

### `html` (`value`)

**Unsafe if pasted into `innerHTML` without sanitization.** Treat `value` as opaque HTML *fragments*: remark often emits **separate** `html` nodes for an opening tag and its closing tag, not one node per element.

#### What actually appears in this dataset (30 `html` nodes total)

Aggregated from the same parse as `mdast_analysis_report.json` (`pricing_features_output.json`):

| `html` node `value` (trimmed) | Count | Notes |
|-------------------------------|------:|-------|
| `<abbr title="This is the tooltip text for Feature 1">` | 14 | Opening tag only; paired with `</abbr>` in the next row |
| `</abbr>` | 14 | Closing tag; content between tags is normal MDAST (`text`, etc.), not part of the `html` value |
| `</b>` | 2 | Stray closing tag inside blockquote-style lines (malformed source; no matching `<b>` in the same feature) |

So in practice, **almost all** raw HTML here is **`<abbr title="…">…</abbr>`** used as a tooltip-style hint (loan-product style pages). The serializer can map allowlisted `<abbr>` to semantic HTML or to your own tooltip component; the two `</b>` cases need a safe fallback (drop, escape, or wrap repair).

#### What is *not* usually an MDAST `html` node here

- **`&nbsp;` and similar entities** often appear inside markdown like `*&nbsp;*` (italic/emphasis around the literal characters `&nbsp;`). That typically becomes **`emphasis` → `text`** with `value` containing `&nbsp;`, not an `html` node. Render by escaping text or decoding entities in the text serializer, not by injecting raw HTML.

#### Example HTML output (illustrative)

If you pass through allowlisted tags (after sanitization), a full `<abbr>` sequence in the document might render conceptually as:

```html
<abbr title="This is the tooltip text for Feature 1">More info</abbr>
```

…but in MDAST you will see **two** `html` siblings (open + close) with normal content nodes between them, so a naive “one node = one snippet” `innerHTML` merge is wrong; walk siblings or normalize in a post-pass.

For the stray fragment:

```html
</b>
```

Prefer **not** injecting as HTML; log, strip, or escape as text depending on policy.

**Preferred approach:** parse/sanitize with a tight allowlist (e.g. `abbr[title]`), reject unknown tags, and never assign arbitrary `html.value` to `innerHTML` without a sanitizer.

---

## Composite example

Markdown:

```markdown
# What's included

**✅ Feature:** Description with [link](https://example.com).

> A short note.

---

- Item with **bold** and [ⓘ]{Extra detail here}
```

Rough HTML shape (structure only):

```html
<div class="mdast-root">
  <h1>What's included</h1>
  <p>
    <strong>✅ Feature:</strong>
    Description with <a href="https://example.com">link</a>.
  </p>
  <blockquote>
    <p>A short note.</p>
  </blockquote>
  <hr />
  <ul>
    <li>
      <p>
        Item with <strong>bold</strong> and
        <span title="Extra detail here">ⓘ</span>
      </p>
    </li>
  </ul>
</div>
```

---

## Source files

| File | Purpose |
|------|---------|
| `analyze_mdast_from_pricing_features.js` | Generates `mdast_analysis_report.json` |
| `mdast_analysis_report.json` | Machine-readable aggregates |
| `process_features_pipeline.js` | Same parse stack + round-trip markdown |
| `../plugins/remark-tooltip.js` | Defines custom MDAST `tooltip` nodes |

---

## Regenerating this narrative’s numbers

After updating `pricing_features_output.json` or changing plugins, re-run the analyzer and, if needed, edit the **Dataset snapshot** and tables in this file—or generate them from `mdast_analysis_report.json` in a follow-up automation step.
