/**
 * Clean MDAST utility - removes position properties and html nodes
 * 
 * This utility provides functions to clean MDAST trees by:
 * 1. Removing all position properties from nodes
 * 2. Filtering out html nodes entirely
 * 3. Recursively processing all children
 */

/**
 * Remove position properties from a node and all its children
 * @param {Object} node - MDAST node
 * @returns {Object} - Cleaned node without position properties
 */
function removePositions(node) {
  if (!node || typeof node !== 'object') {
    return node;
  }

  // Create a copy of the node without the position property
  const { position, ...cleanNode } = node;

  // Recursively clean children if they exist
  if (Array.isArray(cleanNode.children)) {
    cleanNode.children = cleanNode.children.map(removePositions);
  }

  return cleanNode;
}

/**
 * Filter out html nodes from the MDAST tree
 * @param {Object} node - MDAST node
 * @returns {Object|null} - Node without html children, or null if node itself is html
 */
function filterHtmlNodes(node) {
  if (!node || typeof node !== 'object') {
    return node;
  }

  // If this node is an html node, remove it entirely
  if (node.type === 'html') {
    return null;
  }

  // Create a copy of the node
  const cleanNode = { ...node };

  // Recursively filter children if they exist
  if (Array.isArray(cleanNode.children)) {
    cleanNode.children = cleanNode.children
      .map(filterHtmlNodes)
      .filter(child => child !== null); // Remove null entries (filtered html nodes)
  }

  return cleanNode;
}

/**
 * Clean MDAST tree by removing positions and html nodes
 * @param {Object} ast - MDAST tree
 * @returns {Object} - Cleaned MDAST tree
 */
export function cleanMDAST(ast) {
  if (!ast) {
    return ast;
  }

  // First remove html nodes, then remove positions
  let cleaned = filterHtmlNodes(ast);
  cleaned = removePositions(cleaned);

  return cleaned;
}

/**
 * Clean MDAST tree with options for selective cleaning
 * @param {Object} ast - MDAST tree
 * @param {Object} options - Cleaning options
 * @param {boolean} options.removePositions - Whether to remove position properties (default: true)
 * @param {boolean} options.removeHtmlNodes - Whether to remove html nodes (default: true)
 * @returns {Object} - Cleaned MDAST tree
 */
export function cleanMDASTWithOptions(ast, options = {}) {
  const {
    removePositions: shouldRemovePositions = true,
    removeHtmlNodes: shouldRemoveHtmlNodes = true
  } = options;

  if (!ast) {
    return ast;
  }

  let cleaned = ast;

  // Apply html node filtering if requested
  if (shouldRemoveHtmlNodes) {
    cleaned = filterHtmlNodes(cleaned);
  }

  // Apply position removal if requested
  if (shouldRemovePositions) {
    cleaned = removePositions(cleaned);
  }

  return cleaned;
}

/**
 * Get statistics about what was cleaned from the MDAST
 * @param {Object} originalAst - Original MDAST tree
 * @param {Object} cleanedAst - Cleaned MDAST tree
 * @returns {Object} - Statistics about the cleaning process
 */
export function getCleaningStats(originalAst, cleanedAst) {
  const stats = {
    originalNodes: 0,
    cleanedNodes: 0,
    removedHtmlNodes: 0,
    removedPositions: 0
  };

  function countNodes(node, isOriginal = false) {
    if (!node || typeof node !== 'object') {
      return;
    }

    if (isOriginal) {
      stats.originalNodes++;
      if (node.type === 'html') {
        stats.removedHtmlNodes++;
      }
      if (node.position) {
        stats.removedPositions++;
      }
    } else {
      stats.cleanedNodes++;
    }

    if (Array.isArray(node.children)) {
      node.children.forEach(child => countNodes(child, isOriginal));
    }
  }

  countNodes(originalAst, true);
  countNodes(cleanedAst, false);

  return stats;
}