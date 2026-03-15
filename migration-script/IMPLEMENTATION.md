# Markdown to AST Migration Script

## Folder Structure

```
migration-script/
├── migrate.js                            # Main pipeline entry point
├── package.json                          # Dependencies
├── .gitignore
│
├── input/
│   └── sample-input.json                 # Input JSON (markdownString key)
│
├── lib/
│   └── format-markdown.js                # Preprocessor (ported from markdown-helper.ts)
│
├── plugins/
│   ├── micromark-extension-tooltip.js    # Tokenizer: [text]{tooltip} → tokens
│   ├── mdast-util-tooltip.js             # Tokens → MDAST tooltip nodes
│   └── remark-tooltip.js                 # Glue: registers both into unified
│
└── output/
    └── <name>-ast-<timestamp>.json       # Generated AST output
```

---

## How It Works

### Pipeline Overview

```
INPUT JSON ──→ formatMarkdown() ──→ unified parser ──→ validate ──→ OUTPUT JSON
   (1)              (2)                  (3)             (4)           (5)
```

### Step-by-Step

**Step 1 — Read Input**
Reads `input/sample-input.json` (or a custom path). Expects a JSON object with a `markdownString` key containing the raw database markdown string.

**Step 2 — Preprocess with `formatMarkdown()`**
Converts the database's custom markdown dialect into standard CommonMark:
- `===` Setext headings → `#` ATX headings
- `:fire:` emoji shortcodes → native unicode emoji
- `__bold__` → `**bold**`
- Normalizes spacing (single `\n` → double `\n\n`)

This function is ported from `src/client/lib/markdown-helper.ts`. Keep them in sync.

**Step 3 — Parse to MDAST**
Creates a unified processor with three plugins:
- `remarkParse` — standard markdown → MDAST
- `remarkGfm` — adds strikethrough (`~~text~~`), tables, task lists
- `remarkTooltip` — custom `[text]{tooltip}` syntax support

**Step 4 — Validate AST**
Walks the tree and counts every node type. Flags any unknown types not in the expected set.

**Step 5 — Write Output**
Saves the AST as JSON to `output/` with metadata (timestamp, input file, pipeline used).

**Step 6 — Roundtrip Test**
Converts the AST back to markdown string to verify nothing was lost.

---

## How to Run

### Setup (first time)

```bash
cd migration-script
npm install
```

### Run migration

```bash
# Default input (input/sample-input.json) → writes AST to output/
node migrate.js

# Dry run — prints AST to console, no file writes
DRY_RUN=true node migrate.js

# Custom input file
node migrate.js path/to/my-input.json
```

### Input Format

Create a JSON file with this structure:

```json
{
  "markdownString": "Your raw markdown string here..."
}
```

### Output Format

The output JSON contains:

```json
{
  "meta": {
    "generatedAt": "2026-03-15T10:36:42.703Z",
    "inputFile": "input/sample-input.json",
    "pipeline": "formatMarkdown → remarkParse + remarkGfm + remarkTooltip"
  },
  "ast": {
    "type": "root",
    "children": [...]
  }
}
```

---

## Custom Tooltip Plugin

The `[text]{tooltip}` syntax is handled by three files working together:

| File | Role |
|------|------|
| `plugins/micromark-extension-tooltip.js` | Reads characters one-by-one, breaks `[text]{tooltip}` into tokens |
| `plugins/mdast-util-tooltip.js` | Converts those tokens into an MDAST `tooltip` node |
| `plugins/remark-tooltip.js` | Registers both above into the unified pipeline |

### Tooltip AST Node

```json
{
  "type": "tooltip",
  "text": "feature name",
  "tooltip": "tooltip hover text"
}
```

---

## Supported Markdown Features

| Syntax | MDAST Node | Plugin |
|--------|-----------|--------|
| `**bold**` | `strong` | remark-parse |
| `*italic*` | `emphasis` | remark-parse |
| `~~strikethrough~~` | `delete` | remark-gfm |
| `# heading` | `heading` | remark-parse |
| `- bullet` | `list` (ordered: false) | remark-parse |
| `1. numbered` | `list` (ordered: true) | remark-parse |
| `> quote` | `blockquote` | remark-parse |
| `[text](url)` | `link` | remark-parse |
| `![alt](url)` | `image` | remark-parse |
| `[text]{tooltip}` | `tooltip` | remark-tooltip (custom) |

---

## Keeping formatMarkdown() in Sync

`lib/format-markdown.js` is a direct port of `src/client/lib/markdown-helper.ts`.

If the source file changes, update the migration copy too. The preprocessing must match exactly, otherwise the AST structure will differ from what the editor produces.
