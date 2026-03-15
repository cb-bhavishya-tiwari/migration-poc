/**
 * Micromark syntax extension for tooltip syntax: [text]{tooltip}
 *
 * Teaches micromark how to TOKENIZE the [text]{tooltip} pattern
 * character-by-character using a state machine.
 */

export function tooltip() {
  return {
    text: {
      91: {
        tokenize: tokenizeTooltip,
      },
    },
  };
}

function tokenizeTooltip(effects, ok, nok) {
  return start;

  function start(code) {
    if (code !== 91) return nok(code); // '['
    effects.enter('tooltip');
    effects.enter('tooltipTextMarker');
    effects.consume(code);
    effects.exit('tooltipTextMarker');
    effects.enter('tooltipText');
    return text;
  }

  function text(code) {
    if (code === null) return nok(code);
    if (code === 93) {
      // ']'
      effects.exit('tooltipText');
      effects.enter('tooltipTextMarker');
      effects.consume(code);
      effects.exit('tooltipTextMarker');
      return contentStart;
    }
    effects.consume(code);
    return text;
  }

  function contentStart(code) {
    if (code !== 123) return nok(code); // '{'
    effects.enter('tooltipContentMarker');
    effects.consume(code);
    effects.exit('tooltipContentMarker');
    effects.enter('tooltipContent');
    return content;
  }

  function content(code) {
    if (code === null) return nok(code);
    if (code === 125) {
      // '}'
      effects.exit('tooltipContent');
      effects.enter('tooltipContentMarker');
      effects.consume(code);
      effects.exit('tooltipContentMarker');
      effects.exit('tooltip');
      return ok;
    }
    effects.consume(code);
    return content;
  }
}
