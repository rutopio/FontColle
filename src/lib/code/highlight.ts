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
  cls?: TokenClass;
}

type Rule = [TokenClass, RegExp];

const rules: Record<string, Rule[]> = {
  css: [
    ["comment", /\/\*[\s\S]*?\*\//y],
    ["string", /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/y],
    ["atrule", /@[\w-]+/y],
    ["property", /[\w-]+(?=\s*:)/y],
    ["keyword", /\b(?:url|format|local)(?=\()/y],
    ["number", /\b\d+(?:\.\d+)?[a-z%]*\b/y],
    ["punct", /[{}:;,()]/y],
  ],
  html: [
    ["comment", /<!--[\s\S]*?-->/y],
    ["string", /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/y],
    ["tag", /<\/?[a-zA-Z][\w-]*/y],
    ["punct", /\/?>/y],
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
    ["keyword", /\b(?:npm|pnpm|yarn|bun|npx|install|add|i)\b/y],
    ["attr", /--?[\w-]+/y],
  ],
};

export function highlight(code: string, lang?: string): Token[] {
  const langRules = lang ? rules[lang] : undefined;
  if (!langRules) return [{ text: code }];

  const tokens: Token[] = [];
  let pos = 0;
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
