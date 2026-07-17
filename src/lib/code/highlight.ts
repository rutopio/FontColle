// A tiny, dependency-free syntax highlighter for the Use-tab code snippets.
//
// The snippets are short, generated, and cover only four shapes: CSS (@import /
// @font-face / declarations), HTML (<link> tags), JS (an `import "..."` line),
// and Bash (a package-manager install command). A full grammar engine (Shiki,
// Prism) would be hundreds of KB of TextMate/WASM for what a handful of regexes
// covers here — so this tokenises with ordered patterns instead. Pure and
// synchronous, so it runs during SSR with no async load and no hydration flash.
//
// Each language is a list of [class, regex] rules tried in order at the current
// position; the first match wins and advances the cursor. Anything unmatched is
// emitted as a plain character. Every regex is anchored with `y` (sticky) so it
// only matches at the cursor. Token classes map to the `--syntax-*` CSS vars.

export type TokenClass =
  | "comment"
  | "tag"
  | "attr"
  | "string"
  | "keyword"
  | "atrule"
  | "property"
  | "number"
  | "punct";

export interface Token {
  text: string;
  // Undefined = plain text (no span/colour).
  cls?: TokenClass;
}

type Rule = [TokenClass, RegExp];

// Build sticky (y) versions once. Order matters: comments and strings first so
// their contents aren't re-tokenised as keywords/punctuation.
const rules: Record<string, Rule[]> = {
  css: [
    ["comment", /\/\*[\s\S]*?\*\//y],
    ["string", /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/y],
    ["atrule", /@[\w-]+/y],
    // A property name: identifier immediately before a colon.
    ["property", /[\w-]+(?=\s*:)/y],
    // url(), format(), and other CSS functions, matched as keywords by name.
    ["keyword", /\b(?:url|format|local)(?=\()/y],
    ["number", /\b\d+(?:\.\d+)?[a-z%]*\b/y],
    ["punct", /[{}:;,()]/y],
  ],
  html: [
    ["comment", /<!--[\s\S]*?-->/y],
    ["string", /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/y],
    // The tag name right after < or </.
    ["tag", /<\/?[a-zA-Z][\w-]*/y],
    ["punct", /\/?>/y],
    // An attribute name (before an = or standalone like crossorigin).
    ["attr", /[a-zA-Z-]+(?==)/y],
  ],
  js: [
    ["comment", /\/\/[^\n]*/y],
    ["string", /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/y],
    ["keyword", /\b(?:import|from|export|const|let|as)\b/y],
    ["punct", /[{};,]/y],
  ],
  bash: [
    ["comment", /#[^\n]*/y],
    ["string", /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/y],
    // The command and common package-manager subcommands.
    ["keyword", /\b(?:npm|pnpm|yarn|bun|npx|install|add|i)\b/y],
    // A --flag.
    ["attr", /--?[\w-]+/y],
  ],
};

// Tokenise `code` for `lang`. Unknown languages (or plain text) return the whole
// string as one plain token, so the caller always gets renderable output.
export function highlight(code: string, lang?: string): Token[] {
  const langRules = lang ? rules[lang] : undefined;
  if (!langRules) return [{ text: code }];

  const tokens: Token[] = [];
  let pos = 0;
  // Accumulate unmatched characters here and flush them as one plain token,
  // rather than one token per character.
  let plain = "";
  const flush = () => {
    if (plain) {
      tokens.push({ text: plain });
      plain = "";
    }
  };

  while (pos < code.length) {
    let matched = false;
    for (const [cls, re] of langRules) {
      re.lastIndex = pos;
      const m = re.exec(code);
      if (m?.[0]) {
        flush();
        tokens.push({ text: m[0], cls });
        pos += m[0].length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      plain += code[pos];
      pos += 1;
    }
  }
  flush();
  return tokens;
}
