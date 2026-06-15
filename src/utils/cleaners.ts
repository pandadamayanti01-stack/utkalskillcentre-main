/**
 * Shared utility functions to clean up AI outputs and format mathematical expressions.
 */

export const cleanMathNotation = (text: string): string => {
  if (!text) return "";

  let cleaned = text;

  // 1. Replace block math markers $$ ... $$ with bold formulas in blockquotes
  cleaned = cleaned.replace(/\$\$(.*?)\$\$/gs, (_, formula) => {
    return `\n> **${formula.trim()}**\n`;
  });

  // 2. Replace inline math markers $ ... $ with simple bold formulas
  cleaned = cleaned.replace(/\$(.*?)\$/g, (_, formula) => {
    return `**${formula.trim()}**`;
  });

  // 3. Clean up LaTeX formatting commands
  cleaned = cleaned.replace(/\\times/g, "×");
  cleaned = cleaned.replace(/\\div/g, "÷");
  cleaned = cleaned.replace(/\\pm/g, "±");
  cleaned = cleaned.replace(/\\theta/g, "θ");
  cleaned = cleaned.replace(/\\pi/g, "π");
  cleaned = cleaned.replace(/\\alpha/g, "α");
  cleaned = cleaned.replace(/\\beta/g, "β");
  cleaned = cleaned.replace(/\\gamma/g, "γ");
  cleaned = cleaned.replace(/\\delta/g, "δ");
  cleaned = cleaned.replace(/\\lambda/g, "λ");
  cleaned = cleaned.replace(/\\mu/g, "μ");
  cleaned = cleaned.replace(/\\sigma/g, "σ");
  cleaned = cleaned.replace(/\\phi/g, "φ");
  cleaned = cleaned.replace(/\\omega/g, "ω");
  cleaned = cleaned.replace(/\\Omega/g, "Ω");
  cleaned = cleaned.replace(/\\Sigma/g, "Σ");
  cleaned = cleaned.replace(/\\Delta/g, "Δ");
  cleaned = cleaned.replace(/\\triangle/g, "Δ");
  cleaned = cleaned.replace(/\\cdot/g, "·");
  cleaned = cleaned.replace(/\\sqrt\{(.*?)\}/g, "√$1");
  cleaned = cleaned.replace(/\\sqrt/g, "√");
  cleaned = cleaned.replace(/\\le/g, "≤");
  cleaned = cleaned.replace(/\\ge/g, "≥");
  cleaned = cleaned.replace(/\\neq/g, "≠");
  cleaned = cleaned.replace(/\\approx/g, "≈");
  cleaned = cleaned.replace(/\\infty/g, "∞");
  cleaned = cleaned.replace(/\^\\circ/g, "°");
  cleaned = cleaned.replace(/\\circ/g, "°");

  // LaTeX math spacing
  cleaned = cleaned.replace(/\\quad/g, "   ");
  cleaned = cleaned.replace(/\\qquad/g, "      ");
  cleaned = cleaned.replace(/\\[,;!]/g, " ");

  // LaTeX Fraction conversions
  cleaned = cleaned.replace(/\\frac\{(.*?)\}\{(.*?)\}/g, (_, num, den) => {
    const numClean = num.trim();
    const denClean = den.trim();
    const needsParens = (str: string) => /[\s+\-*/=<>]/g.test(str);
    const nStr = needsParens(numClean) ? `(${numClean})` : numClean;
    const dStr = needsParens(denClean) ? `(${denClean})` : denClean;
    return `${nStr}/${dStr}`;
  });

  // 4. Handle curly-braced exponents like 1^{2} or x^{10} to unicode superscripts
  cleaned = cleaned.replace(/(\w+|\([^)]+\))\^\{(.*?)\}/g, (_, base, exp) => {
    const unicodeSuperscripts: Record<string, string> = {
      '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
      '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
      '+': '⁺', '-': '⁻', '=': '⁼', 'n': 'ⁿ', 'x': 'ˣ', 'y': 'ʸ'
    };
    let mappedExp = "";
    for (let char of exp) {
      mappedExp += unicodeSuperscripts[char] || char;
    }
    return `${base}${mappedExp}`;
  });

  // 5. Handle simple exponents like x^2 or 1^2 to unicode superscripts
  cleaned = cleaned.replace(/(\w+|\([^)]+\))\^([0-9+\-nxy])/g, (_, base, exp) => {
    const unicodeSuperscripts: Record<string, string> = {
      '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
      '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
      '+': '⁺', '-': '⁻', 'n': 'ⁿ', 'x': 'ˣ', 'y': 'ʸ'
    };
    return `${base}${unicodeSuperscripts[exp] || ('^' + exp)}`;
  });

  // 6. Handle curly-braced subscripts like a_{1} or x_{2} or a_{n} to unicode subscripts
  cleaned = cleaned.replace(/(\w+)_\{(.*?)\}/g, (_, base, sub) => {
    const unicodeSubscripts: Record<string, string> = {
      '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
      '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
      '+': '₊', '-': '₋', '=': '₌', 'n': 'ₙ', 'i': 'ᵢ',
      'j': 'ⱼ', 'k': 'ₖ', 'x': 'ₓ', 'y': 'ᵧ'
    };
    let mappedSub = "";
    for (let char of sub) {
      mappedSub += unicodeSubscripts[char] || char;
    }
    return `${base}${mappedSub}`;
  });

  // 7. Handle simple subscripts like a_1 or x_2 or S_n to unicode subscripts
  cleaned = cleaned.replace(/(\w+)_([0-9nixy])/g, (_, base, sub) => {
    const unicodeSubscripts: Record<string, string> = {
      '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
      '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
      'n': 'ₙ', 'i': 'ᵢ', 'x': 'ₓ', 'y': 'ᵧ'
    };
    return `${base}${unicodeSubscripts[sub] || sub}`;
  });

  // 8. Clean up remaining standalone backslashes or math formatting symbols
  cleaned = cleaned.replace(/\\{/g, "{").replace(/\\}/g, "}");

  // 9. Clean up standard LaTeX environments and blocks
  cleaned = cleaned
    .replace(/\\begin\{equation\}/g, "")
    .replace(/\\end\{equation\}/g, "")
    .replace(/\\begin\{align\}/g, "")
    .replace(/\\end\{align\}/g, "")
    .replace(/\\text\s*\{(.*?)\}/g, "$1")
    .replace(/\\mathrm\s*\{(.*?)\}/g, "$1")
    .replace(/\\mathit\s*\{(.*?)\}/g, "$1");

  return cleaned;
};
