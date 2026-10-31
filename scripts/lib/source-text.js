/**
 * @file Reads JavaScript source at token level, telling code from comments and text.
 *
 * The expressions inside a template string are code, so they stay code here. A regular expression
 * literal is text. A slash starts one where an expression may start, judged by the code before it:
 * after a closing bracket that judgement is the likely reading, not a certain one.
 */

const QUOTES = new Set(["'", '"']);
const BACKTICK = '`';
const ESCAPE = '\\';
const NEWLINE = '\n';
const OPEN_BRACE = '{';
const CLOSE_BRACE = '}';
const LINE_COMMENT = '//';
const BLOCK_COMMENT_OPEN = '/*';
const BLOCK_COMMENT_CLOSE = '*/';
const INTERPOLATION_OPEN = '${';
const SLASH = '/';
const CLASS_OPEN = '[';
const CLASS_CLOSE = ']';
const BLANK = ' ';
const FLAGS = /[a-z]*/y;
const EXPRESSION_MAY_START = /(?:[(,=:[!&|?{};*%<>~^}]|(?<!\+)\+|(?<!-)-|\b(?:return|typeof|case|void|delete|in|of|instanceof|new|throw|yield|await|else|do))\s*$/;

/**
 * Finds where a quoted string ends.
 * @param {string} source JavaScript source.
 * @param {number} start Index of the opening quote.
 * @returns {number} Index just past the string.
 */
function endOfQuoted(source, start) {
  let index = start + 1;
  while (index < source.length && source[index] !== source[start] && source[index] !== NEWLINE) {
    index += source[index] === ESCAPE ? 2 : 1;
  }
  return index + 1;
}

/**
 * Finds where a run of template text ends.
 * @param {string} source JavaScript source.
 * @param {number} start Index of the first text character.
 * @returns {{end: number, opensExpression: boolean}} Index just past the run, and how it ended.
 */
function endOfTemplateText(source, start) {
  let index = start;
  while (index < source.length) {
    if (source.startsWith(INTERPOLATION_OPEN, index)) return { end: index + INTERPOLATION_OPEN.length, opensExpression: true };
    if (source[index] === BACKTICK) return { end: index + 1, opensExpression: false };
    index += source[index] === ESCAPE ? 2 : 1;
  }
  return { end: index, opensExpression: false };
}

/**
 * Finds where a regular expression literal ends.
 * @param {string} source JavaScript source.
 * @param {number} start Index of the opening slash.
 * @returns {number} Index just past the flags, or -1 when the line ends first: then it is a division.
 */
function endOfRegularExpression(source, start) {
  let inClass = false;
  for (let index = start + 1; index < source.length && source[index] !== NEWLINE; index += 1) {
    if (source[index] === ESCAPE) index += 1;
    else if (source[index] === CLASS_OPEN) inClass = true;
    else if (source[index] === CLASS_CLOSE) inClass = false;
    else if (source[index] === SLASH && !inClass) {
      FLAGS.lastIndex = index + 1;
      FLAGS.test(source);
      return FLAGS.lastIndex;
    }
  }
  return -1;
}

/**
 * Splits the source into runs of code and runs of text, dropping comments.
 * @param {string} source JavaScript source.
 * @returns {{isText: boolean, value: string}[]} Runs in source order; two neighbours always differ in kind.
 */
export function tokenize(source) {
  const tokens = [];
  const push = (isText, value) => {
    const last = tokens.at(-1);
    if (last?.isText === isText) last.value += value;
    else tokens.push({ isText, value });
  };
  let index = 0;
  const openBraces = [];
  const text = (from, to) => push(true, source.slice(from, to));
  const expressionMayStart = () => {
    const last = tokens.at(-1);
    if (last === undefined) return true;
    if (last.isText) return false;
    return (tokens.length === 1 && last.value.trim() === '') || EXPRESSION_MAY_START.test(last.value);
  };
  const template = (from) => {
    const { end, opensExpression } = endOfTemplateText(source, from);
    text(from, end);
    if (opensExpression) openBraces.push(0);
    return end;
  };

  while (index < source.length) {
    const character = source[index];
    const regularExpressionEnd = character === SLASH && expressionMayStart() ? endOfRegularExpression(source, index) : -1;
    if (source.startsWith(LINE_COMMENT, index)) {
      const end = source.indexOf(NEWLINE, index);
      index = end < 0 ? source.length : end;
      push(false, BLANK);
    } else if (source.startsWith(BLOCK_COMMENT_OPEN, index)) {
      const end = source.indexOf(BLOCK_COMMENT_CLOSE, index);
      index = end < 0 ? source.length : end + BLOCK_COMMENT_CLOSE.length;
      push(false, BLANK);
    } else if (regularExpressionEnd > index) {
      text(index, regularExpressionEnd);
      index = regularExpressionEnd;
    } else if (QUOTES.has(character)) {
      const end = endOfQuoted(source, index);
      text(index, end);
      index = end;
    } else if (character === BACKTICK) {
      text(index, index + 1);
      index = template(index + 1);
    } else if (character === CLOSE_BRACE && openBraces.at(-1) === 0) {
      openBraces.pop();
      text(index, index + 1);
      index = template(index + 1);
    } else {
      if (openBraces.length > 0 && character === OPEN_BRACE) openBraces[openBraces.length - 1] += 1;
      if (openBraces.length > 0 && character === CLOSE_BRACE) openBraces[openBraces.length - 1] -= 1;
      push(false, character);
      index += 1;
    }
  }
  return tokens;
}

/**
 * Removes comments and the text of strings, keeping code, including template expressions.
 * @param {string} source JavaScript source.
 * @returns {string} Code tokens only.
 */
export function stripCommentsAndStrings(source) {
  return tokenize(source).map(({ isText, value }) => (isText ? BLANK : value)).join('');
}
