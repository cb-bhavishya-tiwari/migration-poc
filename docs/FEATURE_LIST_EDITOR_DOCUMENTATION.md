# Feature List Editor Documentation

## Overview

The Feature List Editor in the Pricing Page is a **custom markdown-based rich text editor** built using **Lexical** framework. It allows users to edit plan features with various formatting options and custom markdown extensions.

---

## What is it?

The Feature List Editor is a **React-based WYSIWYG (What You See Is What You Get) markdown editor** that provides:

- Real-time markdown editing with visual formatting
- Custom markdown syntax extensions (tooltips, custom links, images)
- Toolbar-based formatting controls
- Integration with React Hook Form for state management
- Bidirectional conversion between markdown and rich text

### Technology Stack

- **Framework**: [Lexical](https://lexical.dev/) - A modern text editor framework by Meta
- **Markdown Processing**: `@lexical/markdown` for conversion between markdown and editor state
- **UI Components**: Custom React components with Tailwind CSS styling
- **Form Management**: React Hook Form

---

## How is it Configured?

### Component Location

```
src/client/components/editor/Editor.tsx
```

### Usage in Pricing Page

The editor is used in the pricing page editor at:

```tsx
// File: src/client/components/contextual-components/pricing-page/edit-plan/CustomizePlan.tsx

<EditorFormField
  id={`pricingTable.items.${index}.features`}
  name={`pricingTable.items.${index}.features`}
  title='Feature list'
/>
```

### Configuration Structure

#### 1. **Lexical Initial Config**

```typescript
const initialConfig: InitialConfigType = {
  namespace: 'lexical-editor',
  theme: {
    // Text formatting styles
    text: {
      bold: 'font-bold',
      italic: 'italic',
      strikethrough: 'line-through',
    },
    // Heading styles
    heading: {
      h1: 'py-2 text-base font-bold',
    },
    // List styles
    list: {
      ol: 'list-decimal list-outside',
      ul: 'list-disc list-outside',
      nested: {
        listitem: 'ml-8',
      },
    },
    // Quote styles
    quote: 'my-1.5 rounded py-1 px-2 text-sm bg-neutral-200 dark:bg-neutral-700',
    // Link styles
    link: 'text-blue-500 hover:underline',
  },
  // Registered custom nodes
  nodes: [
    HeadingNode,
    ListNode,
    ListItemNode,
    QuoteNode,
    HorizontalRuleNode,
    CodeNode,
    ImageNode,          // Custom image node
    CustomLinkNode,     // Custom link node
    TooltipNode,        // Custom tooltip node
  ],
  // Initial state from markdown
  editorState: () => $convertFromMarkdownString(value, EDITOR_TRANSFORMERS),
};
```

#### 2. **Plugins Loaded**

The editor uses several Lexical plugins:

```typescript
<LexicalComposer initialConfig={initialConfig}>
  <ToolbarPlugin disabledEditingOptions={disabledEditingOptions} />
  <RichTextPlugin contentEditable={...} />
  <OnChangePlugin onChange={onEditorStateChange} />
  <HistoryPlugin />              // Undo/Redo
  <ImagesPlugin />               // Image handling
  <LinkPlugin />                 // Link handling
  <TooltipPlugin />              // Tooltip handling
  <SetStateFromMarkdown />       // Sync with external markdown changes
  <MarkdownShortcutPlugin />     // Markdown shortcuts
</LexicalComposer>
```

#### 3. **Toolbar Options**

The toolbar can be configured using `disabledEditingOptions` prop:

```typescript
// Available options from src/client/constants/constant.ts
export const MARKDOWN_EDITING_OPTIONS = {
  PREDEFINED_FORMATS: {
    ALL: 'all_formats',         // Disable all format dropdowns
    NORMAL: 'normal',
    HEADING: 'heading',
    BULLET_LIST: 'bulleted_list',
    NUMBER_LIST: 'numbered_list',
    BLOCKQUOTE: 'blockquote',
  },
  EMOJI: 'emoji',
  BOLD: 'bold',
  ITALICS: 'italics',
  STRIKE_THROUGH: 'strike_through',
  LINK: 'link',
  IMAGE: 'image',
  TOOLTIP: 'tooltip',
};
```

**Example - Disabling specific options:**

```tsx
<EditorFormField
  name="someField"
  disabledEditingOptions={[
    MARKDOWN_EDITING_OPTIONS.PREDEFINED_FORMATS.ALL,
    MARKDOWN_EDITING_OPTIONS.IMAGE,
  ]}
/>
```

---

## Supported Modifications

### 1. **Text Formatting**

| Feature | Toolbar Button | Markdown Syntax | CSS Class |
|---------|---------------|-----------------|-----------|
| **Bold** | **B** | `**text**` or `__text__` | `font-bold` |
| **Italic** | *I* | `*text*` or `_text_` | `italic` |
| **Strikethrough** | ~~S~~ | `~~text~~` | `line-through` |

### 2. **Predefined Formats**

| Format | Dropdown Option | Markdown Syntax | Description |
|--------|----------------|-----------------|-------------|
| **Normal** | Normal | Plain text | Regular paragraph |
| **Heading** | Heading | `# Heading` | H1 heading with bold style |
| **Bulleted List** | • Bulleted List | `- Item` or `* Item` | Unordered list with disc bullets |
| **Numbered List** | 1. Numbered List | `1. Item` | Ordered list with numbers |
| **Blockquote** | " Blockquote | `> Quote` | Quoted text with background |

### 3. **Custom Nodes**

#### **Custom Link** 🔗

**Syntax:**
```markdown
[Link Text](https://example.com)
```

**Features:**
- Clickable links with custom styling
- Editable link text and URL via popup
- Blue color with hover underline
- Support for `target` and `rel` attributes

**Implementation:**
- Node: `CustomLinkNode` (`src/client/components/editor/nodes/CustomLinkNode.tsx`)
- Component: `CustomLinkComponent` - renders an editable link with popup
- Plugin: `LinkPlugin` - handles link creation/editing
- Transformer: Converts between markdown `[text](url)` format

#### **Tooltip** ℹ️

**Syntax:**
```markdown
[Text with tooltip]{Tooltip content here}
```

**Features:**
- Text with hover tooltip
- Custom tooltip text editable via dialog
- Information icon in toolbar
- Displays as underlined text with dotted border

**Implementation:**
- Node: `TooltipNode` (`src/client/components/editor/nodes/TooltipNode.tsx`)
- Component: `TooltipComponent` - renders text with tooltip
- Plugin: `TooltipPlugin` - handles tooltip creation/editing
- Transformer: Custom regex pattern `\[text\]\{tooltip\}`

**Default value:** When clicking toolbar button, defaults to "Tooltip text"

#### **Image** 🖼️

**Syntax:**
```markdown
![Alt text](https://example.com/image.jpg)
```

**Features:**
- Inline image embedding
- Editable alt text and URL via dialog
- Resizable images (width/height controls)
- Maximum width: 250px (default)
- Hover opacity effect

**Implementation:**
- Node: `ImageNode` (`src/client/components/editor/nodes/ImageNode.tsx`)
- Component: `ImageComponent` - renders image with controls
- Plugin: `ImagesPlugin` - handles image insertion dialog
- Transformer: Standard markdown image syntax

### 4. **Emoji Support** 😀

**Features:**
- Emoji picker popup
- Search and categories
- Recent/frequent emojis
- Native emoji insertion (not markdown codes)
- Converts `:emoji_code:` to actual emoji on save

**Example:**
```markdown
:fire: → 🔥
:heart: → ❤️
```

### 5. **Lists**

#### **Bullet Lists**
```markdown
- Feature 1
- Feature 2
  - Nested feature
```

#### **Numbered Lists**
```markdown
1. First item
2. Second item
   1. Sub-item
```

**Features:**
- Automatic numbering
- Nested lists (indented with 8 units)
- Keyboard shortcuts (Enter for new item, Tab for indent)

### 6. **Code Blocks**

**Syntax:**
```markdown
`inline code`

```
code block
```
```

**Note:** Code blocks are supported by `CodeNode` but don't have dedicated toolbar button.

### 7. **Horizontal Rule**

**Syntax:**
```markdown
---
or
***
or
___
```

**Renders as:** Horizontal line separator

---

## How Data is Stored

### Storage Format

The feature list data is stored as **plain markdown string** in the database.

#### Database Schema

```yaml
# api-spec/openapi.yml
ItemRequestBase:
  properties:
    features:
      type: string
      description: features string
```

#### Example Stored Data

```markdown
# What's included

- **Unlimited users** - Add as many team members as you need
- [Advanced analytics]{Get real-time insights into your data}
- ![Dashboard](https://example.com/dashboard.png)
- ~~Basic support~~ Premium support included
- [Documentation](https://docs.example.com)

> All features included in this plan
```

### Data Flow

```
┌─────────────────┐
│   User Input    │
│   (WYSIWYG)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐       onEditorStateChange
│  Lexical State  │ ────────────────────────────┐
└─────────────────┘                             │
         │                                      │
         │ $convertToMarkdownString             │
         ▼                                      │
┌─────────────────┐                             │
│  Markdown Text  │                             │
│  (Plain String) │                             │
└────────┬────────┘                             │
         │                                      │
         │ React Hook Form setValue             │
         ▼                                      │
┌─────────────────┐                             │
│   Form State    │                             │
│  pricingTable   │                             │
│  .items[n]      │                             │
│  .features      │                             │
└────────┬────────┘                             │
         │                                      │
         │ API POST/PUT                         │
         ▼                                      │
┌─────────────────┐                             │
│    Database     │                             │
│  (MongoDB/SQL)  │                             │
│  features: ""   │                             │
└────────┬────────┘                             │
         │                                      │
         │ API GET                              │
         ▼                                      │
┌─────────────────┐                             │
│  Form Load      │                             │
│  getValues()    │ ────────────────────────────┘
└────────┬────────┘
         │
         │ $convertFromMarkdownString
         ▼
┌─────────────────┐
│  Lexical State  │
│  (Re-render)    │
└─────────────────┘
```

### Processing Pipeline

#### 1. **On Save - Markdown Formatting**

Before saving, the markdown is processed by `formatMarkdown()` function:

```typescript
// File: src/client/lib/markdown-helper.ts

export const formatMarkdown = (markdown: string) => {
  // Convert underline-style headings to # style
  markdown = markdown.replace(/^(.*)\n(\s*)(=+)(\s*)\n/gm, '# $1\n\n');
  
  // Normalize spacing
  markdown = markdown.replace(/ {2,}/g, ' ');
  markdown = markdown.replace(/ +$/gm, '');
  markdown = markdown.replace(/\n +/g, '\n');
  
  // Ensure consistent line breaks
  markdown = markdown.replace(/\n/g, '\n\n');
  markdown = markdown.replace(/\n{3,}/g, '\n\n');
  markdown = markdown.replace(/\n+$/, '');
  
  // Convert __ to **
  markdown = markdown.replace(/ {1}__(.*?)__ {1}/g, ' **$1** ');
  
  // Convert :emoji_codes: to actual emojis
  const emojiRegex = /:(\w+):/g;
  // ... emoji conversion logic
  
  return markdown;
};
```

#### 2. **Custom Transformers**

The editor uses custom transformers for special nodes:

```typescript
// File: src/client/components/editor/plugins/Transformers.tsx

const IMAGE: TextMatchTransformer = {
  dependencies: [ImageNode],
  export: (node) => `![${node.getAltText()}](${node.getSrc()})`,
  importRegExp: /!(?:\[([^[]*)\])(?:\(([^(]+)\))/,
  replace: (textNode, match) => {
    const [, altText, src] = match;
    const imageNode = $createImageNode({ altText, src });
    textNode.replace(imageNode);
  },
  trigger: ')',
  type: 'text-match',
};

const LINK: TextMatchTransformer = {
  dependencies: [CustomLinkNode],
  export: (node) => `[${node.getTextContent()}](${node.getHref()})`,
  importRegExp: /(?:\[([^[]+)\])(?:\((?:([^()\s]+))/,
  // ... similar structure
};

const TOOLTIP: TextMatchTransformer = {
  dependencies: [TooltipNode],
  export: (node) => `[${node.getTextContent()}]{${node.getTooltip()}}`,
  importRegExp: /(?:\[([^[]+)\])\{([^{}]+)\}/,
  // ... similar structure
};

export const EDITOR_TRANSFORMERS: Array<Transformer> = [
  IMAGE,
  LINK,
  TOOLTIP,
  ...ELEMENT_TRANSFORMERS,      // From @lexical/markdown
  ...TEXT_FORMAT_TRANSFORMERS,  // From @lexical/markdown
];
```

#### 3. **Default Value**

If no features are provided, a default template is used:

```typescript
// File: src/client/lib/pricing-table-helper.ts

features: formatMarkdown(
  item.features ?? `# What's included\n\n- Feature 1\n- Feature 2\n- Feature 3`
)
```

---

## Usage Examples

### Example 1: Basic Feature List

```tsx
<EditorFormField
  id="features"
  name="pricingTable.items.0.features"
  title="Feature list"
/>
```

**Markdown:**
```markdown
# What's included

- Unlimited projects
- **Advanced analytics**
- *Priority support*
- 99.9% uptime SLA
```

### Example 2: With Restricted Options

```tsx
<EditorFormField
  id="infoText"
  name="pricingTable.items.0.infoText"
  disabledEditingOptions={[
    MARKDOWN_EDITING_OPTIONS.PREDEFINED_FORMATS.ALL,
    MARKDOWN_EDITING_OPTIONS.IMAGE,
  ]}
  placeholder="Add your text here"
  richTextWrapperClassName="min-h-10"
/>
```

**Result:** No format dropdown, no image button

### Example 3: Feature List with Custom Elements

```markdown
# What's included

- [Cloud storage]{Store up to 100GB of data securely}
- **Priority email support** - Get responses within 24 hours
- ![Feature Dashboard](https://example.com/dashboard.png)
- [API Documentation](https://api.example.com/docs)
- ~~Limited to 10 users~~ **Unlimited users**

> Note: All features are subject to our terms of service
```

**Renders:**
- Tooltip on "Cloud storage"
- Bold "Priority email support"
- Embedded image
- Clickable link to documentation
- Strikethrough with bold text
- Blockquote at the end

---

## Technical Details

### Key Files

| File | Purpose |
|------|---------|
| `src/client/components/editor/Editor.tsx` | Main editor component and form field wrapper |
| `src/client/components/editor/plugins/ToolbarPlugin.tsx` | Toolbar with formatting controls |
| `src/client/components/editor/plugins/Transformers.tsx` | Markdown ↔ Lexical state transformers |
| `src/client/components/editor/nodes/CustomLinkNode.tsx` | Custom link node implementation |
| `src/client/components/editor/nodes/TooltipNode.tsx` | Tooltip node implementation |
| `src/client/components/editor/nodes/ImageNode.tsx` | Image node implementation |
| `src/client/components/editor/plugins/ImagesPlugin.tsx` | Image insertion dialog |
| `src/client/components/editor/plugins/LinkPlugin.tsx` | Link editing functionality |
| `src/client/components/editor/plugins/TooltipPlugin.tsx` | Tooltip editing functionality |
| `src/client/lib/markdown-helper.ts` | Markdown formatting utilities |
| `src/client/constants/constant.ts` | Editor configuration constants |

### Component Props

#### `Editor` Component

```typescript
{
  value?: string;                      // Initial markdown value
  wrapperClassName?: string;           // Container CSS classes
  richTextWrapperClassName?: string;   // Content editable CSS classes
  placeholder?: string;                // Placeholder text
  disabledEditingOptions?: string[];   // Disabled toolbar features
  onChange: (markdown: string) => void; // Change handler
}
```

#### `EditorFormField` Component

```typescript
{
  id: string;                          // HTML element ID
  name: string;                        // React Hook Form field name
  title?: string;                      // Field label
  wrapperClassName?: string;           // Container CSS classes
  richTextWrapperClassName?: string;   // Content CSS classes
  placeholder?: string;                // Placeholder text
  disabledEditingOptions?: string[];   // Disabled toolbar features
}
```

### State Management

- **External State**: React Hook Form (`react-hook-form`)
- **Internal State**: Lexical Editor State
- **Synchronization**: Bidirectional through:
  - `OnChangePlugin` - Editor → Form
  - `SetStateFromMarkdown` - Form → Editor

### Styling

The editor uses Tailwind CSS with dark mode support:

```typescript
theme: {
  text: {
    bold: 'font-bold',
    italic: 'italic',
    strikethrough: 'line-through',
  },
  // ... with dark mode variants
}
```

All components are styled with:
- Light mode defaults
- Dark mode with `dark:` prefix
- Responsive design
- Focus states
- Hover effects

---

## Best Practices

### 1. **Content Guidelines**

- Use headings sparingly (usually just one "What's included" heading)
- Keep feature descriptions concise
- Use tooltips for additional information
- Use bold for emphasis on key features
- Use lists for better readability

### 2. **Markdown Tips**

- Maintain consistent formatting (double newlines between elements)
- Test custom nodes (links, tooltips, images) before publishing
- Use emoji codes (`:fire:`) rather than native emojis in source
- Keep alt text descriptive for images

### 3. **Performance**

- Editor is optimized for moderate content (< 1000 characters recommended)
- Large images may slow rendering
- Complex nested structures may impact performance

### 4. **Accessibility**

- Always provide alt text for images
- Use semantic markdown (headings, lists)
- Ensure link text is descriptive
- Tooltip content should be concise

---

## Limitations

1. **No Table Support** - Tables are not currently supported
2. **Single Heading Level** - Only H1 is available (not H2, H3, etc.)
3. **No Inline HTML** - Raw HTML is not supported
4. **No Markdown Preview Mode** - WYSIWYG only
5. **Image Upload** - No direct upload, requires external URL
6. **No Drag-and-Drop** - Images must be added via dialog

---

## Future Enhancements

Possible improvements:
- Multiple heading levels
- Table support
- Image upload to CDN
- Markdown preview toggle
- Copy/paste from Word
- Color picker for text
- Font size controls
- Anchor links within page
- Video embeds

---

## Troubleshooting

### Issue: Changes not saving
**Solution:** Ensure `onChange` handler is properly connected to form state

### Issue: Markdown not rendering correctly
**Solution:** Check `formatMarkdown()` processing and transformer patterns

### Issue: Custom nodes not appearing
**Solution:** Verify node is registered in `initialConfig.nodes` array

### Issue: Toolbar options missing
**Solution:** Check `disabledEditingOptions` prop is not blocking them

### Issue: Dark mode styling issues
**Solution:** Verify all CSS classes have `dark:` variants

---

## Version Information

- **Lexical Version**: 0.12.6
- **React Version**: 18.3.1
- **Framework**: Next.js 15.4.8

---

## Summary

The Feature List Editor is a powerful, markdown-based WYSIWYG editor that:

✅ Supports standard markdown formatting (bold, italic, lists, etc.)  
✅ Extends markdown with custom nodes (tooltips, custom links, images)  
✅ Stores data as plain markdown strings in the database  
✅ Provides real-time bidirectional conversion  
✅ Offers configurable toolbar options  
✅ Integrates seamlessly with React Hook Form  
✅ Supports dark mode and responsive design  

The data flow is simple: **User Input → Lexical State → Markdown String → Form State → Database**, with automatic synchronization at each step.
