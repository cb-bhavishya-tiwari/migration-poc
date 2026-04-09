/**
 * Markdown to MDAST Pipeline - Production Ready
 * 
 * Main pipeline that transforms raw markdown strings from database to clean MDAST JSON.
 * 
 * Usage:
 *   import { transformMarkdownToMdast } from './main.js';
 *   
 *   const result = await transformMarkdownToMdast(rawMarkdown);
 *   if (result.success) {
 *     console.log('Clean MDAST:', result.mdast);
 *   } else {
 *     console.error('Pipeline error:', result.error);
 *   }
 */

import {
  preprocessMarkdown,
  createMdastParser,
  cleanMdast,
  validateMdast,
  validateInput,
  createPipelineError,
  createPipelineSuccess,
  mergeConfig,
  DEFAULT_CONFIG
} from './helper.js';

// ── Main Pipeline Function ─────────────────────────────────────────

/**
 * Transform raw markdown string to clean MDAST JSON
 * 
 * @param {string} rawMarkdown - Raw markdown string from database
 * @param {Object} config - Pipeline configuration (optional)
 * @returns {Promise<Object>} - Pipeline result with success/error status and MDAST
 * 
 * @example
 * const result = await transformMarkdownToMdast("# Hello **World**");
 * // Returns:
 * // {
 * //   success: true,
 * //   error: null,
 * //   mdast: { type: 'root', children: [...] },
 * //   metadata: { processedAt: '...', nodeCount: 3 }
 * // }
 */
export async function transformMarkdownToMdast(rawMarkdown, config = {}) {
  const finalConfig = mergeConfig(config);
  
  try {
    // Step 1: Validate Input
    const inputValidation = validateInput(rawMarkdown);
    if (!inputValidation.isValid) {
      return createPipelineError('input_validation', inputValidation.error);
    }

    const normalizedInput = inputValidation.normalizedInput;

    // Handle empty input
    if (!normalizedInput.trim()) {
      const emptyMdast = { type: 'root', children: [] };
      return createPipelineSuccess(emptyMdast, { 
        inputLength: 0,
        isEmpty: true 
      });
    }

    // Step 2: Preprocess Markdown
    let processedMarkdown = normalizedInput;
    if (finalConfig.preprocessing.enabled) {
      try {
        processedMarkdown = preprocessMarkdown(normalizedInput);
      } catch (error) {
        return createPipelineError('preprocessing', 'Failed to preprocess markdown', error);
      }
    }

    // Step 3: Parse to MDAST
    let rawMdast;
    try {
      const parser = createMdastParser();
      rawMdast = parser.parse(processedMarkdown);
    } catch (error) {
      return createPipelineError('parsing', 'Failed to parse markdown to MDAST', error);
    }

    // Step 4: Clean MDAST
    let cleanedMdast = rawMdast;
    if (finalConfig.cleaning.removePositions || finalConfig.cleaning.removeHtmlNodes) {
      try {
        cleanedMdast = cleanMdast(rawMdast);
      } catch (error) {
        return createPipelineError('cleaning', 'Failed to clean MDAST', error);
      }
    }

    // Step 5: Validate MDAST (optional)
    if (finalConfig.validation.enabled) {
      try {
        const validation = validateMdast(cleanedMdast);
        
        if (!validation.isValid && finalConfig.validation.strictMode) {
          return createPipelineError(
            'validation', 
            `MDAST validation failed: ${validation.errors.join(', ')}`
          );
        }

        // Include validation stats in metadata even if validation passes
        const metadata = {
          inputLength: normalizedInput.length,
          processedLength: processedMarkdown.length,
          validation: validation.stats
        };

        return createPipelineSuccess(cleanedMdast, metadata);
      } catch (error) {
        return createPipelineError('validation', 'Failed to validate MDAST', error);
      }
    }

    // Success without validation
    const metadata = {
      inputLength: normalizedInput.length,
      processedLength: processedMarkdown.length
    };

    return createPipelineSuccess(cleanedMdast, metadata);

  } catch (error) {
    return createPipelineError('unknown', 'Unexpected pipeline error', error);
  }
}

// ── Batch Processing Functions ─────────────────────────────────────

/**
 * Process multiple markdown strings in batch
 * 
 * @param {Array<string>} markdownArray - Array of raw markdown strings
 * @param {Object} config - Pipeline configuration (optional)
 * @returns {Promise<Array<Object>>} - Array of pipeline results
 */
export async function transformMarkdownBatch(markdownArray, config = {}) {
  if (!Array.isArray(markdownArray)) {
    throw new Error('Expected array of markdown strings');
  }

  const results = [];
  
  for (let i = 0; i < markdownArray.length; i++) {
    const markdown = markdownArray[i];
    const result = await transformMarkdownToMdast(markdown, config);
    
    // Add index to metadata for tracking
    if (result.success && result.metadata) {
      result.metadata.batchIndex = i;
    } else if (!result.success) {
      result.error.batchIndex = i;
    }
    
    results.push(result);
  }

  return results;
}

/**
 * Process markdown strings from database records
 * 
 * @param {Array<Object>} records - Database records with markdown fields
 * @param {string} markdownField - Field name containing markdown (default: 'markdown')
 * @param {string} idField - Field name for record ID (default: 'id')
 * @param {Object} config - Pipeline configuration (optional)
 * @returns {Promise<Array<Object>>} - Array of results with record IDs
 */
export async function transformDatabaseRecords(records, markdownField = 'markdown', idField = 'id', config = {}) {
  if (!Array.isArray(records)) {
    throw new Error('Expected array of database records');
  }

  const results = [];

  for (const record of records) {
    const recordId = record[idField];
    const markdown = record[markdownField];
    
    const result = await transformMarkdownToMdast(markdown, config);
    
    // Add record information to result
    const enrichedResult = {
      ...result,
      recordId,
      originalRecord: record
    };

    if (result.success && result.metadata) {
      enrichedResult.metadata.recordId = recordId;
    } else if (!result.success) {
      enrichedResult.error.recordId = recordId;
    }

    results.push(enrichedResult);
  }

  return results;
}

// ── Utility Functions ──────────────────────────────────────────────

/**
 * Get pipeline statistics from batch results
 * 
 * @param {Array<Object>} results - Array of pipeline results
 * @returns {Object} - Aggregated statistics
 */
export function getBatchStatistics(results) {
  const stats = {
    total: results.length,
    successful: 0,
    failed: 0,
    errors: {},
    totalNodes: 0,
    averageNodes: 0,
    processingTime: new Date().toISOString()
  };

  results.forEach(result => {
    if (result.success) {
      stats.successful++;
      if (result.metadata && result.metadata.nodeCount) {
        stats.totalNodes += result.metadata.nodeCount;
      }
    } else {
      stats.failed++;
      const errorStage = result.error?.stage || 'unknown';
      stats.errors[errorStage] = (stats.errors[errorStage] || 0) + 1;
    }
  });

  stats.averageNodes = stats.successful > 0 ? stats.totalNodes / stats.successful : 0;
  stats.successRate = (stats.successful / stats.total) * 100;

  return stats;
}

/**
 * Filter successful results from batch processing
 * 
 * @param {Array<Object>} results - Array of pipeline results
 * @returns {Array<Object>} - Array of successful results only
 */
export function getSuccessfulResults(results) {
  return results.filter(result => result.success);
}

/**
 * Filter failed results from batch processing
 * 
 * @param {Array<Object>} results - Array of pipeline results
 * @returns {Array<Object>} - Array of failed results only
 */
export function getFailedResults(results) {
  return results.filter(result => !result.success);
}

// ── Configuration Presets ──────────────────────────────────────────

/**
 * Configuration preset for maximum security (removes all HTML, strict validation)
 */
export const SECURITY_CONFIG = {
  preprocessing: {
    enabled: true,
    convertSetextHeadings: true,
    normalizeSpacing: true,
    convertEmojis: true,
    standardizeBold: true
  },
  parsing: {
    enableGfm: true,
    enableTooltips: false // Disable custom syntax for security
  },
  cleaning: {
    removePositions: true,
    removeHtmlNodes: true
  },
  validation: {
    enabled: true,
    strictMode: true
  }
};

/**
 * Configuration preset for performance (minimal processing)
 */
export const PERFORMANCE_CONFIG = {
  preprocessing: {
    enabled: false
  },
  parsing: {
    enableGfm: false,
    enableTooltips: false
  },
  cleaning: {
    removePositions: true,
    removeHtmlNodes: true
  },
  validation: {
    enabled: false,
    strictMode: false
  }
};

/**
 * Configuration preset for development (full features, detailed validation)
 */
export const DEVELOPMENT_CONFIG = {
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
    removePositions: false, // Keep positions for debugging
    removeHtmlNodes: false  // Keep HTML for analysis
  },
  validation: {
    enabled: true,
    strictMode: false
  }
};

// ── Export Default Configuration ───────────────────────────────────

export { DEFAULT_CONFIG } from './helper.js';

// ── Example Usage (for testing) ────────────────────────────────────

/**
 * Example usage function (for testing/demonstration)
 */
export async function exampleUsage() {
  const sampleMarkdown = `
# Sample Heading

This is **bold** text with *italic* and ~~strikethrough~~.

- List item 1
- List item 2 with [link](https://example.com)

> A blockquote with some content.

---

Final paragraph with emoji :rocket:
  `;

  console.log('🚀 Running pipeline example...\n');

  // Basic usage
  const result = await transformMarkdownToMdast(sampleMarkdown);
  
  if (result.success) {
    console.log('✅ Pipeline successful!');
    console.log('📊 Metadata:', result.metadata);
    console.log('🌳 MDAST node count:', result.metadata.nodeCount);
    console.log('📝 Sample MDAST structure:');
    console.log(JSON.stringify(result.mdast, null, 2).substring(0, 500) + '...');
  } else {
    console.log('❌ Pipeline failed:', result.error);
  }

  return result;
}

// Uncomment to run example when file is executed directly
// if (import.meta.url === `file://${process.argv[1]}`) {
//   exampleUsage().catch(console.error);
// }