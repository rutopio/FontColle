import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_FILE = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../src/data/axes.json"
);

const API_URL =
  "https://api.github.com/repos/googlefonts/axisregistry/contents/Lib/axisregistry/data";
const RAW_BASE =
  "https://raw.githubusercontent.com/googlefonts/axisregistry/main/Lib/axisregistry/data/";

function unescapeProtoString(s) {
  return s.replace(/\\(.)/g, "$1");
}

function parseTextproto(text) {
  const tagMatch = text.match(/^tag:\s*"((?:\\.|[^"\\])*)"/m);
  const nameMatch = text.match(/^display_name:\s*"((?:\\.|[^"\\])*)"/m);
  if (!tagMatch || !nameMatch) return null;

  const descMatch = text.match(
    /^description:[ \t]*\n?[ \t]*((?:"(?:\\.|[^"\\])*"[ \t]*\n?[ \t]*)+)/m
  );
  let description = "";
  if (descMatch) {
    const fragments = [...descMatch[1].matchAll(/"((?:\\.|[^"\\])*)"/g)].map(
      (m) => unescapeProtoString(m[1])
    );
    description = fragments.join("");
  }

  const num = (field) => {
    const m = text.match(new RegExp(`^${field}:\\s*(-?[\\d.]+)`, "m"));
    return m ? Number(m[1]) : null;
  };

  const fallbacks = [];
  for (const blk of text.matchAll(/fallback\s*\{([^}]*)\}/g)) {
    const body = blk[1];
    const fn = body.match(/name:\s*"((?:\\.|[^"\\])*)"/);
    const fv = body.match(/value:\s*(-?[\d.]+)/);
    if (fn && fv) {
      fallbacks.push({
        name: unescapeProtoString(fn[1]),
        value: Number(fv[1]),
      });
    }
  }

  return {
    tag: unescapeProtoString(tagMatch[1]),
    name: unescapeProtoString(nameMatch[1]),
    description,
    min: num("min_value"),
    default: num("default_value"),
    max: num("max_value"),
    fallbacks,
  };
}

async function main() {
  const files = await fetch(API_URL).then((r) => {
    if (!r.ok) throw new Error(`GitHub API ${r.status} for ${API_URL}`);
    return r.json();
  });
  const textprotoFiles = files.filter((f) => f.name.endsWith(".textproto"));

  const axes = {};
  for (const f of textprotoFiles) {
    const text = await fetch(RAW_BASE + f.name).then((r) => {
      if (!r.ok) throw new Error(`fetch failed (${r.status}) for ${f.name}`);
      return r.text();
    });
    const parsed = parseTextproto(text);
    if (!parsed?.description) {
      console.warn(`  skip ${f.name}: missing tag/display_name/description`);
      continue;
    }
    axes[parsed.tag] = {
      name: parsed.name,
      description: parsed.description,
      min: parsed.min,
      default: parsed.default,
      max: parsed.max,
      fallbacks: parsed.fallbacks,
    };
  }

  const sorted = Object.fromEntries(
    Object.entries(axes).sort(([a], [b]) => a.localeCompare(b))
  );

  mkdirSync(dirname(OUT_FILE), { recursive: true });
  writeFileSync(OUT_FILE, `${JSON.stringify(sorted, null, 2)}\n`);
  console.log(`Wrote ${Object.keys(sorted).length} axes to ${OUT_FILE}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
