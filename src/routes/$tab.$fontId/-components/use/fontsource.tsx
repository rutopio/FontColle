import { useState } from "react";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import type { FontRecord } from "@/lib/fonts/types";
import { CodeBlock } from "@/routes/$tab.$fontId/-components/code-block";
import { Panel } from "@/routes/$tab.$fontId/-components/panel";
import {
  ExternalLink,
  fallbackFor,
  fontsourceSlug,
  MethodIntro,
  Pill,
  Step,
  Steps,
  weightList,
} from "./shared";

const PACKAGE_MANAGERS: { id: string; cmd: (pkg: string) => string }[] = [
  { id: "npm", cmd: (p) => `npm install ${p}` },
  { id: "pnpm", cmd: (p) => `pnpm add ${p}` },
  { id: "yarn", cmd: (p) => `yarn add ${p}` },
  { id: "bun", cmd: (p) => `bun add ${p}` },
];

const VARIABLE_AXES = ["wght", "opsz", "slnt", "wdth", "GRAD"] as const;
const DISPLAY_VALUES = ["auto", "swap", "block", "fallback", "optional"];
const STATIC_FORMATS = ["woff2", "woff"];

export function FontsourceMethod({ font }: { font: FontRecord }) {
  const slug = fontsourceSlug(font.name);
  const hasItalic = font.instances.some((i) => i.italic);
  const [variant, setVariant] = useState<"variable" | "static">(
    font.isVariable ? "variable" : "static"
  );
  const isVariable = variant === "variable";
  const pkg = isVariable
    ? `@fontsource-variable/${slug}`
    : `@fontsource/${slug}`;
  const cssFamily = `"${font.name}${isVariable ? " Variable" : ""}", ${fallbackFor(font.category)}`;
  const subsets = font.subsets.filter((s) => s !== "menu");

  return (
    <Panel label="Self-hosted package" bodyClassName="max-w-2xl">
      <MethodIntro blurb="Install once and bundle the files with your app. No runtime request to a third party." />
      {font.isVariable && (
        <Tabs
          value={variant}
          onValueChange={(v) => setVariant(v as "variable" | "static")}
          className="mb-4"
        >
          <TabsList>
            <TabsTab value="variable">Variable</TabsTab>
            <TabsTab value="static">Static</TabsTab>
          </TabsList>
        </Tabs>
      )}
      <Steps>
        <Step n={1} label="Add the package">
          <Tabs defaultValue="npm">
            <TabsList className="mb-2">
              {PACKAGE_MANAGERS.map((m) => (
                <TabsTab key={m.id} value={m.id}>
                  {m.id}
                </TabsTab>
              ))}
              <TabsTab value="cdn">CDN</TabsTab>
            </TabsList>
            {PACKAGE_MANAGERS.map((m) => (
              <TabsPanel key={m.id} value={m.id}>
                <CodeBlock code={m.cmd(pkg)} lang="bash" />
              </TabsPanel>
            ))}
            <TabsPanel value="cdn">
              <CodeBlock code={jsdelivrLink(pkg, isVariable)} lang="html" />
              <p className="mt-1.5 text-xs">
                A no-build <code className="font-mono">&lt;link&gt;</code> off
                jsDelivr, skip steps 2-3 and apply the CSS below.
              </p>
            </TabsPanel>
          </Tabs>
        </Step>
        <Step n={2} label="Import the CSS you need">
          <Tabs defaultValue="simple">
            <TabsList className="mb-2">
              <TabsTab value="simple">Simple</TabsTab>
              <TabsTab value="advanced">Advanced</TabsTab>
            </TabsList>
            <TabsPanel value="simple">
              {isVariable ? (
                <SimpleVariableImport
                  pkg={pkg}
                  axes={font.axes}
                  hasItalic={hasItalic}
                />
              ) : (
                <SimpleStaticImport
                  pkg={pkg}
                  weights={font.weights}
                  hasItalic={hasItalic}
                />
              )}
            </TabsPanel>
            <TabsPanel value="advanced">
              <AdvancedFontFace
                slug={slug}
                isVariable={isVariable}
                cssFamily={`"${font.name}${isVariable ? " Variable" : ""}"`}
                axes={font.axes}
                weights={font.weights}
                subsets={subsets}
                hasItalic={hasItalic}
              />
            </TabsPanel>
          </Tabs>
        </Step>
        <Step n={3} label="Apply with CSS">
          <CodeBlock code={`font-family: ${cssFamily};`} lang="css" />
        </Step>
      </Steps>
      <ExternalLink
        href={`https://fontsource.org/fonts/${slug}`}
        label="Framework guides on Fontsource"
      />
    </Panel>
  );
}

function jsdelivrLink(pkg: string, isVariable: boolean): string {
  const entry = isVariable ? "wght.css" : "index.css";
  const href = `https://cdn.jsdelivr.net/npm/${pkg}@latest/${entry}`;
  return `<link href="${href}" rel="stylesheet" />`;
}

function SimpleVariableImport({
  pkg,
  axes,
  hasItalic,
}: {
  pkg: string;
  axes: FontRecord["axes"];
  hasItalic: boolean;
}) {
  const tags = axes.map((a) => a.tag);
  const available = VARIABLE_AXES.filter((t) => tags.includes(t));
  const [axis, setAxis] = useState<string>("wght");
  const [ital, setItal] = useState(false);

  const wght = axes.find((a) => a.tag === "wght");
  const comment =
    wght?.min != null && wght.max != null
      ? `// Supports weights ${wght.min}-${wght.max}\n`
      : "";
  const file = ital ? `${axis}-italic` : axis;
  const code = `${comment}import "${pkg}/${file}.css";`;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {available.map((t) => (
          <Pill key={t} active={axis === t} onClick={() => setAxis(t)}>
            {t}
          </Pill>
        ))}
        {hasItalic && (
          <Pill active={ital} onClick={() => setItal((v) => !v)}>
            ital
          </Pill>
        )}
      </div>
      <CodeBlock code={code} lang="js" />
    </div>
  );
}

function SimpleStaticImport({
  pkg,
  weights,
  hasItalic,
}: {
  pkg: string;
  weights: number[];
  hasItalic: boolean;
}) {
  const list = weightList(weights);
  const [weight, setWeight] = useState<number | null>(null);
  const [ital, setItal] = useState(false);

  let code: string;
  if (weight == null && !ital) {
    code = `import "${pkg}";`;
  } else {
    const w = weight ?? 400;
    code = `import "${pkg}/${w}${ital ? "-italic" : ""}.css";`;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {list.map((w) => (
          <Pill
            key={w}
            active={weight === w}
            onClick={() => setWeight((cur) => (cur === w ? null : w))}
          >
            {w}
          </Pill>
        ))}
        {hasItalic && (
          <Pill active={ital} onClick={() => setItal((v) => !v)}>
            italic
          </Pill>
        )}
      </div>
      <CodeBlock code={code} lang="js" />
    </div>
  );
}

// @font-face builder; bundler rewrites src urls into assets.
function AdvancedFontFace({
  slug,
  isVariable,
  cssFamily,
  axes,
  weights,
  subsets,
  hasItalic,
}: {
  slug: string;
  isVariable: boolean;
  cssFamily: string;
  axes: FontRecord["axes"];
  weights: number[];
  subsets: string[];
  hasItalic: boolean;
}) {
  const pkg = isVariable
    ? `@fontsource-variable/${slug}`
    : `@fontsource/${slug}`;
  const subsetList = subsets.length > 0 ? subsets : ["latin"];
  const tags = axes.map((a) => a.tag);
  const axisList = VARIABLE_AXES.filter((t) => tags.includes(t));
  const wghtList = weightList(weights);

  const [subset, setSubset] = useState(
    subsetList.includes("latin") ? "latin" : subsetList[0]
  );
  const [variant, setVariant] = useState(isVariable ? "wght" : "400");
  const [ital, setItal] = useState(false);
  const [display, setDisplay] = useState("swap");
  const [formats, setFormats] = useState<string[]>(["woff2", "woff"]);

  const style = ital ? "italic" : "normal";
  const wght = axes.find((a) => a.tag === "wght");
  const fontWeight =
    isVariable && wght?.min != null && wght.max != null
      ? `${wght.min} ${wght.max}`
      : variant;
  const id = `${slug}-${subset}-${variant}-${style}`;
  const srcFmts = isVariable ? ["woff2"] : formats;
  const src = srcFmts
    .map((fmt) => {
      const label = isVariable ? "woff2-variations" : fmt;
      return `url(${pkg}/files/${id}.${fmt}) format('${label}')`;
    })
    .join(",\n       ");

  const css = `/* ${id} */
@font-face {
  font-family: ${cssFamily};
  font-style: ${style};
  font-display: ${display};
  font-weight: ${fontWeight};
  src: ${src};
}`;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs leading-relaxed">
        For full control over your <code className="font-mono">@font-face</code>{" "}
        rules. Works with Vite-based bundlers that rewrite asset URLs.
      </p>

      <FilterGroup label="Subsets">
        {subsetList.map((s) => (
          <Pill key={s} active={subset === s} onClick={() => setSubset(s)}>
            {s}
          </Pill>
        ))}
      </FilterGroup>

      <FilterGroup label={isVariable ? "Variants" : "Weights"}>
        {(isVariable ? axisList : wghtList.map(String)).map((v) => (
          <Pill key={v} active={variant === v} onClick={() => setVariant(v)}>
            {v}
          </Pill>
        ))}
        {hasItalic && (
          <Pill active={ital} onClick={() => setItal((x) => !x)}>
            ital
          </Pill>
        )}
      </FilterGroup>

      <FilterGroup label="Display">
        {DISPLAY_VALUES.map((d) => (
          <Pill key={d} active={display === d} onClick={() => setDisplay(d)}>
            {d}
          </Pill>
        ))}
      </FilterGroup>

      {!isVariable && (
        <FilterGroup label="Formats">
          {STATIC_FORMATS.map((f) => (
            <Pill
              key={f}
              active={formats.includes(f)}
              onClick={() =>
                setFormats((cur) =>
                  cur.includes(f)
                    ? cur.filter((x) => x !== f)
                    : [...cur, f].sort(
                        (a, b) =>
                          STATIC_FORMATS.indexOf(a) - STATIC_FORMATS.indexOf(b)
                      )
                )
              }
            >
              {f}
            </Pill>
          ))}
        </FilterGroup>
      )}

      <CodeBlock code={css} lang="css" />
      <p className="text-xs leading-relaxed">
        Add the package's <code className="font-mono">unicode-range</code> for
        this subset to complete the rule, see the file on Fontsource.
      </p>
    </div>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-medium text-muted-foreground text-xs uppercase">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}
