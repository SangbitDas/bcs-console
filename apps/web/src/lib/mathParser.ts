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

const MATH_FUNCS_AND_UNITS = new Set([
  'sin', 'cos', 'tan', 'cot', 'sec', 'csc',
  'log', 'ln', 'lim', 'det',
  'dx', 'dy', 'dt',
  'cm', 'm', 'km', 'kg', 'gm', 'sec', 's', 'hr', 'h', 'min'
]);

const COMMON_PROSE_SLASHES = new Set([
  'a/an', 'and/or', 'he/she', 'his/her', 'him/her', 'w/o', 'i/o', 'c/o', 'p/a',
  's/he', 'either/or', 'neither/nor', 'in/out', 'up/down', 'true/false',
  'yes/no', 'on/off', 'input/output'
]);

/**
 * Quickly checks if a string contains any mathematical or scientific tokens.
 */
export function hasMathTokens(text: string | null | undefined): boolean {
  if (!text) return false;
  // Ignore URLs
  if (text.startsWith('http://') || text.startsWith('https://')) return false;

  // Strip HTML tags (e.g. <u>, </b>, <i>) so they don't trigger '<' or '>' relation tests
  const clean = text.replace(/<\/?[a-zA-Z]+(?:\s+[^>]*)?>/g, '');
  if (!clean.trim()) return false;

  // Distinct math/science symbols
  if (/[²³⁴⁵⁶⁷⁸⁹ⁿ₀₁₂₃₄₅₆₇₈₉°√^]/.test(clean)) return true;
  if (/[≠≤≥±∞πθ∆∠∴∵⇒]/.test(clean)) return true;
  if (/₍[₀-₉0-9]+₎/.test(clean)) return true;

  // Chemical formulas
  if (/\b(?:HNO[₀-₉0-9]|CO[₀-₉0-9]|CH[₀-₉0-9]|H[₀-₉0-9]O|HCI|CFC|NaCl)\b/.test(clean)) return true;

  // Logarithms
  if (/\blog[_(0-9]/.test(clean)) return true;

  // LaTeX commands: e.g. \frac, \sqrt, \times, etc.
  if (/\\[a-zA-Z]+/.test(clean)) return true;

  // Delimiters: $ ... $
  if (/\$.*?\$/.test(clean)) return true;

  // Factorials: e.g. 8!, n!, 3!, (n-r)! - single variable or number or paren, NOT English words like Alas!
  if (/(?:[0-9০-৯]+|\b[nkrxabNKRXAB]\b|\))\s*!/.test(clean)) return true;

  // Intervals like [1, ∞) or (0, 1) require a separating comma between bounds
  if (
    /[[({]\s*[-+−]?[0-9a-zA-Z০-৯/∞.]+\s*,\s*[-+−]?[0-9a-zA-Z০-৯/∞.]+\s*[\])}]/.test(
      clean
    )
  ) {
    return true;
  }

  // Fractions:
  // 1. Numerator or denominator has numbers: e.g. 1/2, ৩/৪, 125/27, 1/x, x/2, n/2
  if (
    /(?<![0-9০-৯/])[0-9০-৯]+(?:\^\{[^}]+\}|[²³⁴ⁿ])?\/[0-9a-zA-Z০-৯√()]+(?![0-9০-৯/])/.test(
      clean
    ) ||
    /(?<![0-9০-৯/])[0-9a-zA-Z০-৯√()]+(?:\^\{[^}]+\}|[²³⁴ⁿ])?\/[0-9০-৯]+(?![0-9০-৯/])/.test(
      clean
    )
  ) {
    return true;
  }
  // 2. Fractions with parens or radicals or powers: (a+b)/c, √(3)/2, x^2/y
  if (
    /(?:\([^)]+\)|√[0-9a-zA-Z০-৯]+|[a-zA-Z][²³⁴ⁿ^])\/[0-9a-zA-Z০-৯√()]+/.test(clean) ||
    /[0-9a-zA-Z০-৯√()]+(?:\^\{[^}]+\}|[²³⁴ⁿ])?\/(?:\([^)]+\)|√[0-9a-zA-Z০-৯]+|[a-zA-Z][²³⁴ⁿ^])/.test(clean)
  ) {
    return true;
  }
  // 3. Single letter / single letter ONLY if isolated variables (e.g. a/b, x/y), but NOT common abbreviations like w/o, i/o
  const singleVarSlashes = clean.match(/\b([a-zA-Z])\s*\/\s*([a-zA-Z])\b/g);
  if (singleVarSlashes) {
    for (const match of singleVarSlashes) {
      const pair = match.replace(/\s+/g, '').toLowerCase();
      if (!COMMON_PROSE_SLASHES.has(pair)) {
        return true;
      }
    }
  }

  // Math equations with relations: e.g. 5x+4y-1=0 or x+y=5 or 3x-2>0
  if (/[0-9a-zA-Z০-৯]\s*[=><≠≤≥]\s*[0-9a-zA-Z০-৯]/.test(clean)) return true;

  // Equations with arithmetic operators: e.g. 2 + 3, x × y
  if (/(?:[0-9০-৯]+|[a-zA-Z])\s*[+−×÷]\s*(?:[0-9০-৯]+|[a-zA-Z]\b)/.test(clean)) {
    return true;
  }

  // Subtraction / minus: distinguish math subtraction from hyphenated words or number ranges (70-72, 1971-1975)
  if (/(?:[0-9০-৯]+|[a-zA-Z])\s+-\s+(?:[0-9০-৯]+|[a-zA-Z]\b)/.test(clean)) {
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
  // Guard against dates (12/05/2020), Bengali words (বাংলা/ইংরেজি), and English words (a/an, TCP/IP)
  const TOKEN = '(?:\\\\sqrt\\{[^}]+\\}|[0-9a-zA-Z০-৯!]+(?:[\\^_]\\{[^}]+\\})*)';
  s = s.replace(
    new RegExp(`(?<![0-9০-৯/])(${TOKEN})/(${TOKEN})(?![0-9০-৯/])`, 'g'),
    (match, num, den) => {
      // Don't convert English prose words or slashes (e.g. a/an, TCP/IP, and/or, word/phrase)
      const numIsWord = /^[a-zA-Z]{2,}$/.test(num);
      const denIsWord = /^[a-zA-Z]{2,}$/.test(den);
      const pair = `${num.toLowerCase()}/${den.toLowerCase()}`;
      if (numIsWord || denIsWord || COMMON_PROSE_SLASHES.has(pair)) {
        return match;
      }
      return `\\frac{${num}}{${den}}`;
    }
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

/* ---------- Native (no-DOM) math fallback: LaTeX / plain math -> Unicode text ---------- */

const SUP_UNICODE: Record<string, string> = {
  '0': '\u2070', '1': '\u00b9', '2': '\u00b2', '3': '\u00b3', '4': '\u2074',
  '5': '\u2075', '6': '\u2076', '7': '\u2077', '8': '\u2078', '9': '\u2079',
  '+': '\u207a', '-': '\u207b', '=': '\u207c', '(': '\u207d', ')': '\u207e', 'n': '\u207f',
};

const SUB_UNICODE: Record<string, string> = {
  '0': '\u2080', '1': '\u2081', '2': '\u2082', '3': '\u2083', '4': '\u2084',
  '5': '\u2085', '6': '\u2086', '7': '\u2087', '8': '\u2088', '9': '\u2089',
  '+': '\u208a', '-': '\u208b', '=': '\u208c', '(': '\u208d', ')': '\u208e',
};

/** Symbol table for the native pass. Order matters (longer commands first). */
const LATEX_SYMBOLS: [RegExp, string][] = [
  [/\\longrightarrow\b/g, '\u27f6'],
  [/\\rightarrow\b/g, '\u2192'],
  [/\\leftarrow\b/g, '\u2190'],
  [/\\Rightarrow\b/g, '\u21d2'],
  [/\\implies\b/g, '\u21d2'],
  [/\\therefore\b/g, '\u2234'],
  [/\\because\b/g, '\u2235'],
  [/\\approx\b/g, '\u2248'],
  [/\\neq\b/g, '\u2260'],
  [/\\leq\b/g, '\u2264'],
  [/\\le\b/g, '\u2264'],
  [/\\geq\b/g, '\u2265'],
  [/\\ge\b/g, '\u2265'],
  [/\\pm\b/g, '\u00b1'],
  [/\\mp\b/g, '\u2213'],
  [/\\infty\b/g, '\u221e'],
  [/\\times\b/g, '\u00d7'],
  [/\\div\b/g, '\u00f7'],
  [/\\cdot\b/g, '\u00b7'],
  [/\\circ\b/g, '\u00b0'],
  [/\\pi\b/g, '\u03c0'],
  [/\\theta\b/g, '\u03b8'],
  [/\\Delta\b/g, '\u0394'],
  [/\\angle\b/g, '\u2220'],
  [/\\log\b/g, 'log'],
  [/\\ln\b/g, 'ln'],
  [/\\sin\b/g, 'sin'],
  [/\\cos\b/g, 'cos'],
  [/\\tan\b/g, 'tan'],
  [/\\cot\b/g, 'cot'],
  [/\\sec\b/g, 'sec'],
  [/\\csc\b/g, 'csc'],
  [/\\lim\b/g, 'lim'],
  [/\\dot\{([^{}]*)\}/g, '$1\u0307'],
  [/\\hat\{([^{}]*)\}/g, '$1\u0302'],
  [/\\bar\{([^{}]*)\}/g, '$1\u0304'],
];

/** Reads a balanced `{...}` group starting at `openIdx` (index of the opening brace). */
function readBraceGroup(s: string, openIdx: number): [string, number] | null {
  if (s[openIdx] !== '{') return null;
  const close = findMatchingClose(s, openIdx, '{', '}');
  if (close === -1) return null;
  return [s.slice(openIdx + 1, close), close];
}

/** Maps every char of `inner` through `map`; returns null when any char is unmapped. */
function toUnicodeScript(inner: string, map: Record<string, string>): string | null {
  let out = '';
  for (const ch of inner) {
    const mapped = map[ch];
    if (!mapped) return null;
    out += mapped;
  }
  return out;
}

/** Parenthesises an operand that contains spaces or operators (so a/b stays unambiguous). */
function wrapOperand(value: string): string {
  return /[\s+\-\u00d7\u00f7\u00b1\u00b7]/.test(value.trim()) ? `(${value})` : value;
}

/** \frac{a}{b} -> a/b (nested-aware, recursive). */
function expandFractions(s: string): string {
  let i = 0;
  while (i < s.length) {
    const pos = s.indexOf('\\frac', i);
    if (pos === -1) break;
    const num = readBraceGroup(s, pos + 5);
    const den = num ? readBraceGroup(s, num[1] + 1) : null;
    if (!num || !den) {
      i = pos + 5;
      continue;
    }
    const replacement = `${wrapOperand(latexToReadableText(num[0]))}/${wrapOperand(latexToReadableText(den[0]))}`;
    s = s.slice(0, pos) + replacement + s.slice(den[1] + 1);
    i = pos + replacement.length;
  }
  return s;
}

/** \sqrt{x} -> \u221ax, \sqrt[3]{x} -> \u221bx (nested-aware). */
function expandRadicals(s: string): string {
  let i = 0;
  while (i < s.length) {
    const pos = s.indexOf('\\sqrt', i);
    if (pos === -1) break;
    let cursor = pos + 5;
    let index = '';
    if (s[cursor] === '[') {
      const close = s.indexOf(']', cursor);
      if (close !== -1) {
        index = s.slice(cursor + 1, close);
        cursor = close + 1;
      }
    }
    const group = readBraceGroup(s, cursor);
    if (!group) {
      i = cursor;
      continue;
    }
    const inner = wrapOperand(latexToReadableText(group[0]));
    const prefix = index === '3' ? '\u221b' : index ? `\u221a[${index}]` : '\u221a';
    const replacement = `${prefix}${inner}`;
    s = s.slice(0, pos) + replacement + s.slice(group[1] + 1);
    i = pos + replacement.length;
  }
  return s;
}

/**
 * Converts LaTeX / plain mathematical notation into readable Unicode text.
 * Used on native, where the DOM-based KaTeX renderer is unavailable.
 */
export function latexToReadableText(input: string): string {
  if (!input) return '';
  let s = input;

  s = s.replace(/\\displaystyle\b/g, '');
  s = s.replace(/\\left\b|\\right\b/g, '');
  s = s.replace(/\\quad\b|\\qquad\b/g, ' ');
  s = s.replace(/\\[,;:!]/g, ' ');
  s = s.replace(/\\text\{([^{}]*)\}/g, '$1');
  s = s.replace(/\\mathrm\{([^{}]*)\}/g, '$1');
  s = s.replace(/\\\{/g, '{').replace(/\\\}/g, '}');
  s = s.replace(/\\([%&$#_])/g, '$1');

  s = expandFractions(s);
  s = expandRadicals(s);

  for (const [pattern, value] of LATEX_SYMBOLS) {
    s = s.replace(pattern, value);
  }

  // Degrees: ^{\circ}, ^\circ and ^\u2218 collapse to a single degree sign.
  s = s.replace(/\^\s*\{?\s*(?:\\circ|\u00b0|\u2218)\s*\}?\s*C\b/g, '\u00b0C');
  s = s.replace(/\^\s*\{?\s*(?:\\circ|\u00b0|\u2218)\s*\}?/g, '\u00b0');

  s = s.replace(/\^\{([^{}]*)\}/g, (_m, inner: string) => {
    const uni = toUnicodeScript(inner, SUP_UNICODE);
    if (uni) return uni;
    return inner.length === 1 ? `^${inner}` : `^(${inner})`;
  });
  s = s.replace(/\^([0-9a-zA-Z])/g, (_m, ch: string) => SUP_UNICODE[ch] ?? `^${ch}`);

  s = s.replace(/_\{([^{}]*)\}/g, (_m, inner: string) => {
    const uni = toUnicodeScript(inner, SUB_UNICODE);
    return uni ?? `_${inner}`;
  });
  s = s.replace(/_([0-9])/g, (_m, ch: string) => SUB_UNICODE[ch] ?? `_${ch}`);

  // Any remaining \command -> its bare name, never a stray backslash.
  s = s.replace(/\\([a-zA-Z]+)/g, '$1');

  return s;
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

  // Strip HTML tags (e.g. <u>, </b>, <i>)
  const clean = trimmed.replace(/<\/?[a-zA-Z]+(?:\s+[^>]*)?>/g, '');

  // If text contains common Bengali words (excluding trailing unit words like টাকা, মিটার, বর্গমিটার), it is mixed
  const withoutUnits = clean
    .replace(/\s*(?:টাকা|মিটার|সেমি|বর্গমিটার|বর্গ\s*সেমি|ডিগ্রি|গুণ|সেকেন্ড)\b/g, '')
    .trim();

  // If there are Bengali alphabet letters (not digits ০-৯), check if it's prose
  const bengaliLetters = withoutUnits.match(/[\u0985-\u09B9\u09CE\u09DC-\u09DF]/g);
  if (bengaliLetters && bengaliLetters.length > 3) {
    return false;
  }

  // If there are 2 or more English prose words, it is prose, NOT pure math!
  const englishWords = withoutUnits.match(/\b[a-zA-Z]{2,}\b/g) || [];
  const proseWords = englishWords.filter(
    (w) => !MATH_FUNCS_AND_UNITS.has(w.toLowerCase())
  );
  if (proseWords.length >= 2) {
    return false;
  }

  // Must have math token
  return hasMathTokens(withoutUnits);
}

/**
 * Splits mixed text (Bengali sentences containing mathematical expressions)
 * into a sequence of plain text and math segments for rendering.
 */
export function splitTextAndMath(raw: string, options?: { html?: boolean }): TextSegment[] {
  const wantHtml = options?.html !== false;
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
    const html = wantHtml ? renderKaTeXHtml(styledLatex) : undefined;
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
      // Guard: do not treat English prose with word slashes as an inline math block
      const segEngWords = matchStr.match(/\b[a-zA-Z]{2,}\b/g) || [];
      const segProseWords = segEngWords.filter(
        (w) => !MATH_FUNCS_AND_UNITS.has(w.toLowerCase())
      );
      if (segProseWords.length >= 2) {
        continue;
      }
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
      segments.push({
        type: 'math',
        content: matchStr,
        html: wantHtml ? renderKaTeXHtml(styledLatex) : undefined,
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
