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
  weightLabel,
  weightList,
} from "./shared";

// METHOD 3, Bunny Fonts: a privacy-first, GDPR-compliant drop-in for the Google
// Fonts API. It serves the same open-source families from its own CDN without
// logging IPs or setting cookies. Bunny ships static weights only (no variable
// fonts), with its own `css?family=<slug>:<weights>` grammar, italic weights
// carry an `i` suffix. So this panel is a weight + style picker driving the URL.
export function BunnyMethod({ font }: { font: FontRecord }) {
  const slug = fontsourceSlug(font.name);
  const weights = weightList(font.weights);
  const hasItalic = font.instances.some((i) => i.italic);
  const cssFamily = `"${font.name}", ${fallbackFor(font.category)}`;

  const [weight, setWeight] = useState(
    weights.includes(400) ? 400 : weights[0]
  );
  const [italic, setItalic] = useState(false);

  const href = bunnyHref(slug, weight, italic);
  const linkTags = `<link href="${href}" rel="stylesheet" />`;
  const importRule = `@import url('${href}');`;
  const cssRule = `.selector {
  font-family: ${cssFamily};
  font-weight: ${weight};
  font-style: ${italic ? "italic" : "normal"};
}`;

  return (
    <Panel label="Privacy-first & GDPR-friendly CDN" bodyClassName="max-w-2xl">
      <MethodIntro blurb="A drop-in for the Google Fonts API that serves the same families without logging IPs or setting cookies." />
      {font.isVariable && (
        // Bunny serves static instances only, so a variable family's axes aren't
        // available here, say so rather than silently offering just weights.
        <p className="mb-3 rounded-md bg-muted/50 px-2.5 py-1.5 text-muted-foreground text-xs">
          Bunny serves static weights only, this variable family's axes aren't
          available here. Use the Google Fonts method above for the full axes.
        </p>
      )}
      <Steps>
        <Step n={1} label="Pick a style">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-1.5">
              {weights.map((w) => (
                <Pill
                  key={w}
                  active={weight === w}
                  onClick={() => setWeight(w)}
                >
                  {weightLabel(w)} {w}
                </Pill>
              ))}
            </div>
            {hasItalic && (
              <div className="flex items-center gap-2">
                <span className="text-sm">Style</span>
                <Pill active={!italic} onClick={() => setItalic(false)}>
                  Roman
                </Pill>
                <Pill active={italic} onClick={() => setItalic(true)}>
                  Italic
                </Pill>
              </div>
            )}
          </div>
        </Step>
        <Step n={2} label="Embed the stylesheet">
          <Tabs defaultValue="link">
            <TabsList className="mb-2">
              <TabsTab value="link">&lt;link&gt;</TabsTab>
              <TabsTab value="import">@import</TabsTab>
            </TabsList>
            <TabsPanel value="link">
              <CodeBlock code={linkTags} lang="html" />
              <p className="mt-1.5 text-muted-foreground text-xs">
                Paste inside your document{" "}
                <code className="font-mono">&lt;head&gt;</code>.
              </p>
            </TabsPanel>
            <TabsPanel value="import">
              <CodeBlock code={importRule} lang="css" />
              <p className="mt-1.5 text-muted-foreground text-xs">
                Place at the very top of a CSS file, before other rules.
              </p>
            </TabsPanel>
          </Tabs>
        </Step>
        <Step n={3} label="Apply with CSS">
          <CodeBlock code={cssRule} lang="css" />
        </Step>
      </Steps>
      <ExternalLink
        href={`https://fonts.bunny.net/family/${slug}`}
        label="This family on Bunny Fonts"
      />
    </Panel>
  );
}

// Bunny Fonts stylesheet URL for one weight/style. Bunny's grammar is
// `css?family=<slug>:<weight>` with an `i` suffix for italic (e.g. `700i`).
function bunnyHref(slug: string, weight: number, italic: boolean): string {
  return `https://fonts.bunny.net/css?family=${slug}:${weight}${
    italic ? "i" : ""
  }&display=swap`;
}
