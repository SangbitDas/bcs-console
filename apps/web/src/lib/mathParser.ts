import katex from 'katex';

/**
 * BCS Console — Math & Science LaTeX / KaTeX Formula Parser
 *
 * Client-side non-destructive parser that detects and converts plain-text
 * mathematical notations (fractions, square roots, nested powers, chemical formulas)
 * into KaTeX-compatible LaTeX without altering raw database content.
 */

const SUP_MAP: Record<string, string> = {
  '⁰': '0',
  '¹': '1',
  '²': '2',
  '³': '3',
  '⁴': '4',
  '⁵': '5',
  '⁶': '6',
  '⁷': '7',
  '⁸': '8',
  '⁹': '9',
  'ⁿ': 'n',
  '⁺': '+',
  '⁻': '-',
  '⁼': '=',
  '⁽': '(',
  '⁾': ')',
};

const SUB_MAP: Record<string, string> = {
  '₀': '0',
  '₁': '1',
  '₂': '2',
  '₃': '3',
  '₄': '4',
  '₅': '5',
  '₆': '6',
  '₇': '7',
  '₈': '8',
  '₉': '9',
  '₊': '+',
  '₋': '-',
  '₌': '=',
  '₍': '(',
  '₎': ')',
};

/**
 * Finds the index of the matching closing delimiter taking nesting depth into account.
 */
export function findMatchingClose(
  s: string,
  startIdx: number,
  openChar = '(',
  closeChar = ')'
): number {
  let depth = 0;
  for (let i = startIdx; i < s.length; i++) {
    if (s[i] === openChar) {
      depth++;
    } else if (s[i] === closeChar) {
      depth--;
      if (depth === 0) {
        return i;
      }
    }
  }
  return -1;
}

/**
 * Quickly checks if a string contains any mathematical or scientific tokens.
 */
export function hasMathTokens(text: string | null | undefined): boolean {
  if (!text) return false;
  // Ignore URLs
  if (text.startsWith('http://') || text.startsWith('https://')) return false;

  // Distinct math/science symbols
  if (/[²³⁴⁵⁶⁷⁸⁹ⁿ₀₁₂₃₄₅₆₇₈₉°√^]/.test(text)) return true;
  if (/[≠≤≥±∞πθ∆∠∴∵⇒]/.test(text)) return true;
  if (/₍[₀-₉0-9]+₎/.test(text)) return true;

  // Fractions: not dates (12/05/2020) or options/slashes in text (বাংলা/ইংরেজি)
  if (
    /(?<![0-9০-৯/])[0-9a-zA-Z০-৯√()]+(?:\^\{[^}]+\}|[²³⁴ⁿ])?\/[0-9a-zA-Z০-৯√()]+(?![0-9০-৯/])/.test(
      text
    )
  ) {
    return true;
  }

  // Math equations with relations: e.g. 5x+4y-1=0 or x+y=5 or 3x-2>0
  if (/[0-9a-zA-Z০-৯]\s*[=><≠≤≥]\s*[0-9a-zA-Z০-৯]/.test(text)) return true;

  // Equations with operators (guard against English hyphenated words like "Co-operative" or "Now-a-days")
  if (/(?:[0-9০-৯]+|[a-zA-Z])\s*[-+−×/]\s*(?:[0-9০-৯]+|[a-zA-Z]\b)/.test(text)) {
    if (!/^[a-zA-Z]{2,}-[a-zA-Z]{2,}$/.test(text.trim())) {
      return true;
    }
  }

  // LaTeX commands: e.g. \frac, \sqrt, \times, etc.
  if (/\\[a-zA-Z]+/.test(text)) return true;

  // Delimiters: $ ... $
  if (/\$.*?\$/.test(text)) return true;

  // Chemical formulas
  if (/\b(?:HNO[₀-₉0-9]|CO[₀-₉0-9]|CH[₀-₉0-9]|H[₀-₉0-9]O|HCI|CFC|NaCl)\b/.test(text)) return true;

  // Logarithms
  if (/\blog[_(0-9]/.test(text)) return true;

  // Factorials: e.g. 8!, n!, 3!, (n-r)!
  if (/[0-9a-zA-Z০-৯)]!/.test(text)) return true;

  // Intervals like [1, ∞) or (0, 1) require a separating comma between bounds
  if (
    /[[({]\s*[-+−]?[0-9a-zA-Z০-৯/∞.]+\s*,\s*[-+−]?[0-9a-zA-Z০-৯/∞.]+\s*[\])}]/.test(
      text
    )
  ) {
    return true;
  }

  return false;
}

/**
 * Converts nested powers ^(...) to ^{...} with balanced parentheses.
 */
function convertBalancedPowers(s: string): string {
  let i = 0;
  while (i < s.length) {
    const pos = s.indexOf('^(', i);
    if (pos === -1) break;
    const openParen = pos + 1;
    const closeParen = findMatchingClose(s, openParen, '(', ')');
    if (closeParen !== -1) {
      const inner = s.slice(openParen + 1, closeParen);
      const convertedInner = convertBalancedPowers(inner);
      s = s.slice(0, pos) + '^{' + convertedInner + '}' + s.slice(closeParen + 1);
      i = pos + convertedInner.length + 3;
    } else {
      i = pos + 2;
    }
  }
  return s;
}

/**
 * Converts balanced radicals √( ... ) to \sqrt{ ... }.
 */
function convertBalancedRadicals(s: string): string {
  let i = 0;
  while (i < s.length) {
    const pos = s.indexOf('√(', i);
    if (pos === -1) break;
    const openParen = pos + 1;
    const closeParen = findMatchingClose(s, openParen, '(', ')');
    if (closeParen !== -1) {
      const inner = s.slice(openParen + 1, closeParen);
      const convertedInner = convertPlainMathToLatex(inner);
      s = s.slice(0, pos) + '\\sqrt{' + convertedInner + '}' + s.slice(closeParen + 1);
      i = pos + convertedInner.length + 7;
    } else {
      i = pos + 2;
    }
  }
  return s;
}

/**
 * Converts fractional notation (balanced parens and simple fractions) into \frac{...}{...}.
 */
function convertFractions(s: string): string {
  // 0. \sqrt{...} / (balanced_B)
  s = s.replace(/(\\sqrt\{[^}]+\})\/\(([^)]+)\)/g, (_match, num, den) => {
    return `\\frac{${num}}{${convertPlainMathToLatex(den)}}`;
  });

  // 1. (balanced_A) / (balanced_B)
  let i = 0;
  while (i < s.length) {
    if (s[i] === '(') {
      const close1 = findMatchingClose(s, i, '(', ')');
      if (close1 !== -1 && close1 + 1 < s.length && s[close1 + 1] === '/') {
        const afterSlash = close1 + 2;
        if (afterSlash < s.length && s[afterSlash] === '(') {
          const close2 = findMatchingClose(s, afterSlash, '(', ')');
          if (close2 !== -1) {
            const num = convertPlainMathToLatex(s.slice(i + 1, close1));
            const den = convertPlainMathToLatex(s.slice(afterSlash + 1, close2));
            s = s.slice(0, i) + `\\frac{${num}}{${den}}` + s.slice(close2 + 1);
            i = 0;
            continue;
          }
        } else {
          // (balanced_A) / token_B
          const m = s.slice(afterSlash).match(/^([0-9a-zA-Z০-৯\\{}^_!]+)/);
          if (m && m[1]) {
            const num = convertPlainMathToLatex(s.slice(i + 1, close1));
            const den = m[1];
            const endPos = afterSlash + m[1].length;
            s = s.slice(0, i) + `\\frac{${num}}{${den}}` + s.slice(endPos);
            i = 0;
            continue;
          }
        }
      }
    }
    i++;
  }

  // 2. token_A / (balanced_B)
  const tokenBeforeRegex = /([0-9a-zA-Z০-৯\\{}^_!]+)\/\(/;
  let match = s.match(tokenBeforeRegex);
  while (match && match.index !== undefined) {
    const tokenStart = match.index;
    const num = match[1];
    const openParen = tokenStart + num.length + 1;
    const close2 = findMatchingClose(s, openParen, '(', ')');
    if (close2 !== -1) {
      const den = convertPlainMathToLatex(s.slice(openParen + 1, close2));
      s = s.slice(0, tokenStart) + `\\frac{${num}}{${den}}` + s.slice(close2 + 1);
      match = s.match(tokenBeforeRegex);
    } else {
      break;
    }
  }

  // 3. Simple fractions: token / token (e.g. ১২৫/২৭, ১/২৫, \sqrt{৩}/৪, 3/2, a/b, 1/x^{2})
  // Guard against dates (12/05/2020) and Bengali words (বাংলা/ইংরেজি)
  const TOKEN = '(?:\\\\sqrt\\{[^}]+\\}|[0-9a-zA-Z০-৯!]+(?:[\\^_]\\{[^}]+\\})*)';
  s = s.replace(
    new RegExp(`(?<![0-9০-৯/])(${TOKEN})/(${TOKEN})(?![0-9০-৯/])`, 'g'),
    '\\frac{$1}{$2}'
  );

  return s;
}

/**
 * Balances unclosed and stray curly braces in mathematical expressions.
 */
function balanceBraces(s: string): string {
  let open = 0;
  let close = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '{' && (i === 0 || s[i - 1] !== '\\')) open++;
    else if (s[i] === '}' && (i === 0 || s[i - 1] !== '\\')) close++;
  }
  if (open > close) {
    s += '}'.repeat(open - close);
  } else if (close > open) {
    let res = '';
    let currOpen = 0;
    for (let i = 0; i < s.length; i++) {
      if (s[i] === '{' && (i === 0 || s[i - 1] !== '\\')) {
        currOpen++;
        res += s[i];
      } else if (s[i] === '}' && (i === 0 || s[i - 1] !== '\\')) {
        if (currOpen > 0) {
          currOpen--;
          res += s[i];
        } else {
          res += '\\}';
        }
      } else {
        res += s[i];
      }
    }
    s = res;
  }
  return s;
}

/**
 * Translates a plain-text mathematical/scientific expression into valid KaTeX LaTeX.
 */
export function convertPlainMathToLatex(raw: string): string {
  let s = raw.trim();

  // Strip trailing underscores (e.g. Hamlet_ or blank formatting in prose)
  s = s.replace(/_+(?![0-9a-zA-Z{])/g, '');

  // 1. Degree notations: ^(∘)C or ^(∘) or °C or ° or ^°
  s = s.replace(/\^\s*°/g, '^{\\circ}');
  s = s.replace(/\^\(\s*∘\s*\)\s*C/g, '^{\\circ}\\text{C}');
  s = s.replace(/\^\(\s*∘\s*\)/g, '^{\\circ}');
  s = s.replace(/°\s*C/g, '^{\\circ}\\text{C}');
  s = s.replace(/°/g, '^{\\circ}');

  // 2. Recurring decimal overdot (e.g. 0.4^(̇) -> 0.\dot{4})
  s = s.replace(/([0-9০-৯])\^\(\s*[\u0307.]\s*\)/g, '\\dot{$1}');

  // 3. Isotopes & pre-superscripts: ((_^60)Co) -> {}^{60}\text{Co}
  s = s.replace(/\(?\(_\^([0-9]+)\)\s*([a-zA-Z]+)\)?/g, '{}^{$1}\\text{$2}');

  // 4. Unicode superscripts (grouped so e.g. ¹⁴ becomes ^{14} instead of ^{1}^{4})
  s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ⁺⁻⁼⁽⁾]+/g, (m) => {
    const inner = Array.from(m)
      .map((c) => SUP_MAP[c] || c)
      .join('');
    return `^{${inner}}`;
  });

  // 5. Unicode subscripts (grouped, handles ₍₂₎ -> _{(2)} without double subscript errors)
  s = s.replace(/[₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎]+/g, (m) => {
    const inner = Array.from(m)
      .map((c) => SUB_MAP[c] || c)
      .join('');
    return `_{${inner}}`;
  });

  // 6. Mathematical operators and unicode symbols
  s = s.replace(/−/g, '-');
  s = s.replace(/×/g, ' \\times ');
  s = s.replace(/÷/g, ' \\div ');
  s = s.replace(/≠/g, ' \\neq ');
  s = s.replace(/≤/g, ' \\le ');
  s = s.replace(/≥/g, ' \\ge ');
  s = s.replace(/±/g, ' \\pm ');
  s = s.replace(/∞/g, ' \\infty ');
  s = s.replace(/π/g, ' \\pi ');
  s = s.replace(/θ/g, ' \\theta ');
  s = s.replace(/∆/g, ' \\Delta ');
  s = s.replace(/∠/g, ' \\angle ');
  s = s.replace(/∴/g, ' \\therefore ');
  s = s.replace(/∵/g, ' \\because ');
  s = s.replace(/⇒/g, ' \\implies ');
  s = s.replace(/=>/g, ' \\implies ');
  s = s.replace(/(?<!\\)%/g, '\\%');

  // 7. Nested and single-token powers
  s = convertBalancedPowers(s);
  s = s.replace(/\^([0-9a-zA-Z০-৯]+)/g, '^{$1}');

  // 8. Radicals (square roots)
  s = convertBalancedRadicals(s);
  s = s.replace(/√([0-9a-zA-Z০-৯]*(?:\.[0-9a-zA-Z০-৯]+|[0-9a-zA-Z০-৯]+))/g, '\\sqrt{$1}');

  // 9. Fractions
  s = convertFractions(s);

  // 10. Variables with numeric subscripts: a1, a2, b1, b2, c1, c2, x1, x2, y1, y2
  s = s.replace(/\b([a-wyzA-WYZ])([1-9])\b/g, '$1_{$2}');
  s = s.replace(/\bS\\infty\b/g, 'S_{\\infty}');
  s = s.replace(/\bS_\{\\infty\}\b/g, 'S_{\\infty}');

  // 11. Logarithms
  s = s.replace(/\blog_\(([^)]+)\)/g, (_match, base) => `\\log_{${convertPlainMathToLatex(base)}}`);
  s = s.replace(/\blog_([a-zA-Z0-9০-৯]+)([a-zA-Z0-9০-৯])/g, '\\log_{$1} $2');
  s = s.replace(/\blog_([a-zA-Z0-9০-৯]+)/g, '\\log_{$1}');
  s = s.replace(/\blog_\{([0-9০-৯a-zA-Z]+)\}/g, '\\log_{$1}');
  s = s.replace(/\blog([0-9০-৯])\b/g, '\\log_{$1}');
  s = s.replace(/\blog\b/g, '\\log');

  // 12. Common Chemical formulas in science questions
  s = s.replace(/\bHNO_3\b/g, '\\text{HNO}_3');
  s = s.replace(/\bCO_2\b/g, '\\text{CO}_2');
  s = s.replace(/\bCH_4\b/g, '\\text{CH}_4');
  s = s.replace(/\bH_2O\b/g, '\\text{H}_2\\text{O}');
  s = s.replace(/\bN_2O\b/g, '\\text{N}_2\\text{O}');
  s = s.replace(/\bO_3\b/g, '\\text{O}_3');

  // 13. Auto-scale parentheses containing \frac: ( ... ) -> \left( ... \right)
  // Prevents \left\left duplication and gracefully expands brackets for tall fractions
  let pi = 0;
  while (pi < s.length) {
    if (s[pi] === '(' && (pi < 5 || s.slice(pi - 5, pi) !== '\\left')) {
      const closeIdx = findMatchingClose(s, pi, '(', ')');
      if (closeIdx !== -1) {
        const inner = s.slice(pi + 1, closeIdx);
        if (inner.includes('\\frac')) {
          s = s.slice(0, pi) + '\\left(' + inner + '\\right)' + s.slice(closeIdx + 1);
          pi += 6 + inner.length + 7;
          continue;
        }
      }
    }
    pi++;
  }

  // 14. Add clean spacing around binary operators (+, -)
  s = s.replace(/(\d|[a-zA-Z০-৯\}])\s*([\+\-])\s*(\d|[a-zA-Z০-৯\\\{])/g, '$1 $2 $3');

  // 15. Balance unclosed and stray braces
  s = balanceBraces(s);

  return s;
}

/**
 * Safely renders LaTeX string into KaTeX HTML without throwing errors.
 */
export function renderKaTeXHtml(latex: string, displayMode = false): string {
  try {
    return katex.renderToString(latex, {
      throwOnError: false,
      strict: false,
      displayMode,
      output: 'html',
    });
  } catch (err) {
    console.warn('KaTeX render fallback:', err);
    return `<span class="katex-fallback">${latex}</span>`;
  }
}

export interface TextSegment {
  type: 'text' | 'math';
  content: string;
  html?: string;
}

/**
 * Determines whether the entire text is purely a mathematical expression
 * (e.g. options like `√৩/৪ a²`, `n/(√2-1)`, `(১২৫/২৭)^(-২/৩)`, `১/২৫`, `6x²-7x-4=0`, `[1,∞)`).
 */
export function isPureMathExpr(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (/_{2,}/.test(trimmed)) return false;

  // If text contains common Bengali words (excluding trailing unit words like টাকা, মিটার, বর্গমিটার), it is mixed
  const withoutUnits = trimmed
    .replace(/\s*(?:টাকা|মিটার|সেমি|বর্গমিটার|বর্গ\s*সেমি|ডিগ্রি|গুণ|সেকেন্ড)\b/g, '')
    .trim();

  // If there are Bengali alphabet letters (not digits ০-৯), check if it's prose
  const bengaliLetters = withoutUnits.match(/[\u0985-\u09B9\u09CE\u09DC-\u09DF]/g);
  if (bengaliLetters && bengaliLetters.length > 3) {
    return false;
  }

  // Must have math token or be numeric/expression
  return (
    hasMathTokens(withoutUnits) ||
    /^[0-9a-zA-Z০-৯\s()+\-*./=,−^√_[\]{}]+$/.test(withoutUnits)
  );
}

/**
 * Splits mixed text (Bengali sentences containing mathematical expressions)
 * into a sequence of plain text and math segments for rendering.
 */
export function splitTextAndMath(raw: string): TextSegment[] {
  if (!raw || !raw.trim()) {
    return [{ type: 'text', content: raw || '' }];
  }

  // 1. If it's pure math, render directly with textbook display fraction sizing
  if (isPureMathExpr(raw)) {
    const latex = convertPlainMathToLatex(raw);
    const styledLatex =
      latex.includes('\\frac') && !latex.includes('\\displaystyle')
        ? `\\displaystyle ${latex}`
        : latex;
    const html = renderKaTeXHtml(styledLatex);
    return [{ type: 'math', content: raw, html }];
  }

  // 2. If it contains NO math tokens at all, return as plain text
  if (!hasMathTokens(raw)) {
    return [{ type: 'text', content: raw }];
  }

  // 3. For mixed sentences, identify math expressions embedded within prose.
  const segments: TextSegment[] = [];

  // Match contiguous sequences of mathematical characters with optional spacing around operators
  const mathBlockPattern =
    /([0-9a-zA-Z০-৯().,+\-*−×÷/=\\<>≠≤≥±∞πθ∆∠°_²³⁴⁵⁶⁷⁸⁹ⁿ₀₁₂₃₄₅₆₇₈₉^{}\[\]~√!∴⇒%]+(?:\s+[-+−×÷/=><≠≤≥]\s+[0-9a-zA-Z০-৯().,+\-*−×÷/=\\<>≠≤≥±∞πθ∆∠°_²³⁴⁵⁶⁷⁸⁹ⁿ₀₁₂₃₄₅₆₇₈₉^{}\[\]~√!∴⇒%]+)*)/g;

  let lastIndex = 0;
  let m: RegExpExecArray | null;

  while ((m = mathBlockPattern.exec(raw)) !== null) {
    const start = m.index;
    const end = mathBlockPattern.lastIndex;
    let matchStr = m[1].trim();

    // Detach trailing sentence punctuation (e.g. single '.', ',', ';', '।', '?') if not an ellipsis
    let trailingPunct = '';
    const trailingPunctMatch = matchStr.match(/(?:(?<!\.)\.(?!\.)|[;:।?,])$/);
    if (trailingPunctMatch) {
      trailingPunct = trailingPunctMatch[0];
      matchStr = matchStr.slice(0, -trailingPunct.length).trim();
    }

    // Ignore fill-in-the-blank lines (e.g. ___, ____)
    if (/_{2,}/.test(matchStr)) continue;

    // Must contain genuine mathematical indicators
    if (matchStr && hasMathTokens(matchStr)) {
      if (start > lastIndex) {
        segments.push({
          type: 'text',
          content: raw.slice(lastIndex, start),
        });
      }
      const latex = convertPlainMathToLatex(matchStr);
      const styledLatex =
        latex.includes('\\frac') && !latex.includes('\\displaystyle')
          ? `\\displaystyle ${latex}`
          : latex;
      const html = renderKaTeXHtml(styledLatex);
      segments.push({
        type: 'math',
        content: matchStr,
        html,
      });
      if (trailingPunct) {
        segments.push({
          type: 'text',
          content: trailingPunct,
        });
      }
      lastIndex = end;
    }
  }

  if (lastIndex < raw.length) {
    segments.push({
      type: 'text',
      content: raw.slice(lastIndex),
    });
  }

  if (segments.length === 0) {
    return [{ type: 'text', content: raw }];
  }

  return segments;
}
