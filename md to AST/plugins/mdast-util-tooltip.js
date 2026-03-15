/**
 * MDAST utility for tooltip nodes.
 *
 * Converts micromark tooltip tokens → MDAST `tooltip` nodes
 * and MDAST `tooltip` nodes → markdown string (for roundtrip).
 */

/** Token → MDAST node conversion */
export function tooltipFromMarkdown() {
  return {
    enter: {
      tooltip(token) {
        this.enter(
          {
            type: 'tooltip',
            text: '',
            tooltip: '',
          },
          token,
        );
      },
    },
    exit: {
      tooltipText(token) {
        const node = this.stack[this.stack.length - 1];
        node.text = this.sliceSerialize(token);
      },
      tooltipContent(token) {
        const node = this.stack[this.stack.length - 1];
        node.tooltip = this.sliceSerialize(token);
      },
      tooltip(token) {
        this.exit(token);
      },
    },
  };
}

/** MDAST node → markdown string conversion (for roundtrip / stringify) */
export function tooltipToMarkdown() {
  return {
    handlers: {
      tooltip(node) {
        return `[${node.text}]{${node.tooltip}}`;
      },
    },
  };
}
