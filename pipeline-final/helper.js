/**
 * Pipeline Helper Functions
 * 
 * Contains all utility functions needed for the markdown to MDAST transformation pipeline:
 * - Markdown preprocessing and normalization
 * - MDAST cleaning (position removal, HTML filtering)
 * - Parser configuration
 * - Error handling utilities
 */

import { createRequire } from 'node:module';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

// Import emoji data for preprocessing (with fallback)
let emojiData = null;
try {
  const require = createRequire(import.meta.url);
  emojiData = require('@emoji-mart/data');
} catch (error) {
  console.warn('Warning: @emoji-mart/data not available. Emoji conversion will be skipped.');
  emojiData = { emojis: {} };
}

// Import custom tooltip plugin (you'll need to copy this from the original location)
// For now, we'll create a simple version
const remarkTooltip = () => {
  return (tree) => {
    // Simple tooltip plugin - you can enhance this based on your needs
    return tree;
  };
};

// ── Markdown Preprocessing ─────────────────────────────────────────

/**
 * Preprocess raw markdown into standard CommonMark format
 * @param {string} markdown - Raw markdown string from database
 * @returns {string} - Normalized markdown
 */
export function preprocessMarkdown(markdown) {
  if (!markdown || typeof markdown !== 'string') {
    return '';
  }

  let processed = markdown;

  // 1. Convert Setext headings to ATX headings
  processed = processed.replace(/^(.*)\n(\s*)(=+)(\s*)\n/gm, '# $1\n\n');

  // 2. Normalize spacing
  processed = processed.replace(/ {2,}/g, ' '); // Multiple spaces to single
  processed = processed.replace(/ +$/gm, ''); // Trailing spaces
  processed = processed.replace(/\n +/g, '\n'); // Leading spaces on new lines

  // 3. Ensure double newlines for paragraph breaks
  processed = processed.replace(/\n/g, '\n\n');
  processed = processed.replace(/\n{3,}/g, '\n\n');
  processed = processed.replace(/\n+$/, '');

  // 4. Convert __ to ** for bold (CommonMark standard)
  processed = processed.replace(/ {1}__(.*?)__ {1}/g, ' **$1** ');

  // 5. Convert emoji shortcodes to native Unicode emoji (if available)
  if (emojiData && emojiData.emojis) {
    const emojiRegex = /:(\w+):/g;
    const matches = processed.match(emojiRegex);
    if (matches) {
      matches.forEach((match) => {
        const emojiKey = match.replace(/:/g, '');
        const emoji = emojiData.emojis[emojiKey];
        if (emoji && emoji.skins && emoji.skins[0]) {
          processed = processed.replace(match, emoji.skins[0].native);
        }
      });
    }
  }

  return processed;
}

// ── MDAST Parser Configuration ─────────────────────────────────────

/**
 * Create a configured unified processor for parsing markdown to MDAST
 * @returns {Object} - Configured unified processor
 */
export function createMdastParser() {
  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkTooltip);
}

// ── MDAST Cleaning Functions ───────────────────────────────────────

/**
 * Remove position properties from a node and all its children
 * @param {Object} node - MDAST node
 * @returns {Object} - Node without position properties
 */
function removePositions(node) {
  if (!node || typeof node !== 'object') {
    return node;
  }

  // Create a copy without the position property
  const { position, ...cleanNode } = node;

  // Recursively clean children
  if (Array.isArray(cleanNode.children)) {
    cleanNode.children = cleanNode.children.map(removePositions);
  }

  return cleanNode;
}

/**
 * Filter out HTML nodes from the MDAST tree
 * @param {Object} node - MDAST node
 * @returns {Object|null} - Node without HTML children, or null if node is HTML
 */
function filterHtmlNodes(node) {
  if (!node || typeof node !== 'object') {
    return node;
  }

  // Remove HTML nodes entirely
  if (node.type === 'html') {
    return null;
  }

  // Create a copy of the node
  const cleanNode = { ...node };

  // Recursively filter children
  if (Array.isArray(cleanNode.children)) {
    cleanNode.children = cleanNode.children
      .map(filterHtmlNodes)
      .filter(child => child !== null);
  }

  return cleanNode;
}

/**
 * Clean MDAST tree by removing positions and HTML nodes
 * @param {Object} ast - Raw MDAST tree
 * @returns {Object} - Clean MDAST tree
 */
export function cleanMdast(ast) {
  if (!ast) {
    return ast;
  }

  // First remove HTML nodes, then remove positions
  let cleaned = filterHtmlNodes(ast);
  cleaned = removePositions(cleaned);

  return cleaned;
}

// ── Validation Functions ───────────────────────────────────────────

/**
 * Validate that MDAST contains only known node types
 * @param {Object} ast - MDAST tree to validate
 * @returns {Object} - Validation results
 */
export function validateMdast(ast) {
  const validNodeTypes = new Set([
    'root', 'paragraph', 'text', 'heading', 'list', 'listItem',
    'strong', 'emphasis', 'delete', 'link', 'image', 'blockquote',
    'code', 'inlineCode', 'break', 'thematicBreak', 'tooltip'
  ]);

  const stats = {
    nodeCount: 0,
    nodeTypes: {},
    unknownTypes: [],
    maxDepth: 0
  };

  function walkNode(node, depth = 0) {
    if (!node || typeof node !== 'object') {
      return;
    }

    stats.nodeCount++;
    stats.maxDepth = Math.max(stats.maxDepth, depth);
    
    const nodeType = node.type;
    stats.nodeTypes[nodeType] = (stats.nodeTypes[nodeType] || 0) + 1;

    if (!validNodeTypes.has(nodeType)) {
      if (!stats.unknownTypes.includes(nodeType)) {
        stats.unknownTypes.push(nodeType);
      }
    }

    if (Array.isArray(node.children)) {
      node.children.forEach(child => walkNode(child, depth + 1));
    }
  }

  walkNode(ast);

  return {
    isValid: stats.unknownTypes.length === 0,
    stats,
    errors: stats.unknownTypes.length > 0 
      ? [`Unknown node types: ${stats.unknownTypes.join(', ')}`]
      : []
  };
}

// ── Error Handling Utilities ───────────────────────────────────────

/**
 * Create a standardized error response
 * @param {string} stage - Pipeline stage where error occurred
 * @param {string} message - Error message
 * @param {Error} originalError - Original error object (optional)
 * @returns {Object} - Standardized error object
 */
export function createPipelineError(stage, message, originalError = null) {
  return {
    success: false,
    error: {
      stage,
      message,
      originalError: originalError ? originalError.message : null,
      timestamp: new Date().toISOString()
    },
    mdast: null
  };
}

/**
 * Create a successful pipeline response
 * @param {Object} mdast - Clean MDAST tree
 * @param {Object} metadata - Processing metadata (optional)
 * @returns {Object} - Success response object
 */
export function createPipelineSuccess(mdast, metadata = {}) {
  return {
    success: true,
    error: null,
    mdast,
    metadata: {
      processedAt: new Date().toISOString(),
      nodeCount: countNodes(mdast),
      ...metadata
    }
  };
}

/**
 * Count total nodes in MDAST tree
 * @param {Object} node - MDAST node
 * @returns {number} - Total node count
 */
function countNodes(node) {
  if (!node || typeof node !== 'object') {
    return 0;
  }

  let count = 1;

  if (Array.isArray(node.children)) {
    count += node.children.reduce((sum, child) => sum + countNodes(child), 0);
  }

  return count;
}

// ── Input Validation ───────────────────────────────────────────────

/**
 * Validate input markdown string
 * @param {any} input - Input to validate
 * @returns {Object} - Validation result
 */
export function validateInput(input) {
  if (input === null || input === undefined) {
    return {
      isValid: false,
      error: 'Input is null or undefined',
      normalizedInput: ''
    };
  }

  if (typeof input !== 'string') {
    return {
      isValid: false,
      error: `Expected string input, got ${typeof input}`,
      normalizedInput: ''
    };
  }

  // Empty string is valid (will produce empty MDAST)
  return {
    isValid: true,
    error: null,
    normalizedInput: input
  };
}

// ── Configuration ──────────────────────────────────────────────────

/**
 * Default pipeline configuration
 */
export const DEFAULT_CONFIG = {
  preprocessing: {
    enabled: true,
    convertSetextHeadings: true,
    normalizeSpacing: true,
    convertEmojis: true,
    standardizeBold: true
  },
  parsing: {
    enableGfm: true,
    enableTooltips: true
  },
  cleaning: {
    removePositions: true,
    removeHtmlNodes: true
  },
  validation: {
    enabled: true,
    strictMode: false // If true, unknown node types cause pipeline failure
  }
};

/**
 * Merge user config with defaults
 * @param {Object} userConfig - User configuration
 * @returns {Object} - Merged configuration
 */
export function mergeConfig(userConfig = {}) {
  return {
    ...DEFAULT_CONFIG,
    ...userConfig,
    preprocessing: { ...DEFAULT_CONFIG.preprocessing, ...userConfig.preprocessing },
    parsing: { ...DEFAULT_CONFIG.parsing, ...userConfig.parsing },
    cleaning: { ...DEFAULT_CONFIG.cleaning, ...userConfig.cleaning },
    validation: { ...DEFAULT_CONFIG.validation, ...userConfig.validation }
  };
}