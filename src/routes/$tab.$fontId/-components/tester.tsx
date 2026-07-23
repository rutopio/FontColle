import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { $createHeadingNode, $isHeadingNode } from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import { mergeRegister } from "@lexical/utils";
import {
  TextAlignCenterIcon,
  TextAlignLeftIcon,
  TextAlignRightIcon,
} from "@phosphor-icons/react";
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  type ElementFormatType,
  FORMAT_ELEMENT_COMMAND,
  SELECTION_CHANGE_COMMAND,
} from "lexical";
import { type CSSProperties, useCallback, useEffect, useState } from "react";
import { ButtonGroup } from "@/components/ui/button-group";
import { EditableValue } from "@/components/ui/editable-value";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { previewStyle } from "@/lib/fonts/preview-style";
import type { FontInstance } from "@/lib/fonts/types";
import { cn } from "@/lib/utils";
import { SIZE_MAX, SIZE_MIN, SIZE_PRESETS } from "./detail-sidebar";
import { instanceStyle, isTesterBlock, TESTER_NODES } from "./tester-nodes";

// Block styles the toolbar can apply to the current selection. "normal" is a
// plain paragraph; the rest are heading levels. Values match Lexical's node
// keys (paragraph / h1 / h2 / h3), so reading the selection's block back maps
// straight onto this list.
type BlockType = "normal" | "h1" | "h2" | "h3";
const BLOCK_OPTIONS: { value: BlockType; label: string }[] = [
  { value: "h1", label: "Heading 1" },
  { value: "h2", label: "Heading 2" },
  { value: "h3", label: "Heading 3" },
  { value: "normal", label: "Normal text" },
];

// The Tester is a real rich-text editor (Lexical), deliberately independent
// of the shared usePreview() string that the type tester, instance rows and
// list cards render. It lets you mix block styles in one document — select a
// line, make it Heading 2, leave the rest Normal — the way the Google Fonts
// specimen does, which a single shared plain string can't represent.
export function Tester({
  fontStyle,
  seedLines,
  instances,
  fontName,
  fontLoaded,
}: {
  // The family's base preview style (family, axis coords, italic, features).
  // It sets the document's default; a block that has been given a named
  // instance overrides the axes for itself. Size is set per-block by this
  // editor, so it's stripped here.
  fontStyle: CSSProperties;
  // First-load document text: successive lines of the family's specimen
  // passage, seeded as a Heading 1 / Heading 2 / Heading 3 stack. A font with
  // nothing to continue (emoji, deliberately blank) supplies fewer lines, and
  // the extra headings are simply not created.
  seedLines: string[];
  // The family's named instances, offered as chips that apply to the block the
  // caret is in. Empty for a static family with none. Also the source of the
  // weights the family really ships, which the heading defaults snap to.
  instances: FontInstance[];
  fontName: string;
  fontLoaded: boolean;
}) {
  const initialConfig = {
    namespace: "font-tester",
    // The subclasses that render a per-block style, plus the rules that make
    // Lexical build them in place of the stock paragraph/heading.
    nodes: TESTER_NODES,
    onError: (error: Error) => {
      throw error;
    },
    // Seed the document as Heading 1 / Heading 2 / Heading 3, matching the
    // Google Fonts specimen page. Anything past the third line (there isn't
    // normally one) falls back to a Normal paragraph.
    //
    // Each heading is seeded carrying the named instance that matches its
    // wanted weight, rather than leaning on a CSS font-weight. Two reasons:
    // the block then renders a real cut instead of a browser-synthesized one,
    // and because the style is on the node, the matching Instance chip reads as
    // active the moment the caret lands in that heading.
    editorState: () => {
      const root = $getRoot();
      if (root.getFirstChild() !== null) return;
      const tags = ["h1", "h2", "h3"] as const;
      for (const [i, line] of seedLines.entries()) {
        const tag = tags[i];
        const block = tag ? $createHeadingNode(tag) : $createParagraphNode();
        const seedInstance = tag ? headingInstance(instances, tag) : undefined;
        if (seedInstance && isTesterBlock(block)) {
          block.setStyle(
            instanceStyle(seedInstance.coords, seedInstance.italic)
          );
        }
        block.append($createTextNode(line));
        root.append(block);
      }
      // Land the caret in the first block, so the toolbar and the Instance
      // chips have a target on arrival. Without this syncFromSelection bails
      // at its !$isRangeSelection guard and setActiveKeys([]) leaves every
      // control reading empty until the user thinks to click a line — the
      // size slider, the block-type group and the chips all look inert on a
      // tab whose whole purpose is editing.
      //
      // selectStart(), not editor.focus(): this only places the selection.
      // Focusing on mount would scroll the editor into view and raise the
      // software keyboard on mobile the moment the tab opens, which is a
      // different and unwanted behaviour.
      root.getFirstChild()?.selectStart();
    },
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <TesterInner
        fontStyle={fontStyle}
        instances={instances}
        fontName={fontName}
        fontLoaded={fontLoaded}
      />
    </LexicalComposer>
  );
}

// Default size per block type. Because one document mixes several block types
// at once, each level carries its own value (not a single editor font-size):
// they're published as CSS custom properties on the editor root and consumed by
// the h1/h2/h3/p rules in styles.css, so a Heading 2 and a Normal paragraph
// render at their own sizes side by side. Line height is a fixed 1.2 for every
// level, set in styles.css rather than here.
const DEFAULT_SIZE: Record<BlockType, number> = {
  h1: 48,
  h2: 28,
  h3: 24,
  normal: 18,
};

// The weight each heading level wants. Only a wish: a family that doesn't ship
// the cut falls back to Regular below rather than letting the browser fake it.
const HEADING_WEIGHT: Record<"h1" | "h2" | "h3", number> = {
  h1: 700,
  h2: 600,
  h3: 500,
};

// Regular, the fallback when a family has no cut at the wanted weight.
const REGULAR_WEIGHT = 400;

// The alignment buttons, in visual order. `label` takes the block's direction
// because "left" is the natural start of an LTR line but the *end* of an RTL
// one, so the same button means opposite things to a screen-reader user
// depending on what they're editing.
const ALIGNMENTS: {
  id: Exclude<ElementFormatType, "" | "justify" | "start" | "end">;
  icon: typeof TextAlignLeftIcon;
  label: (rtl: boolean) => string;
}[] = [
  {
    id: "left",
    icon: TextAlignLeftIcon,
    label: (rtl) => (rtl ? "Align left (end of line)" : "Align left"),
  },
  { id: "center", icon: TextAlignCenterIcon, label: () => "Align center" },
  {
    id: "right",
    icon: TextAlignRightIcon,
    label: (rtl) => (rtl ? "Align right" : "Align right (end of line)"),
  },
];

// Which button to light up for a block's stored format.
//
// Lexical's unset format ("") renders as `text-align: start`, which the browser
// resolves against the block's own direction: left for LTR, right for RTL. That
// is exactly the requested default, so it needs no special-casing at write
// time — only at read time, to show the user which end their text is actually
// sitting at. "start"/"end" resolve the same way.
function alignedAs(
  format: ElementFormatType,
  rtl: boolean
): "left" | "center" | "right" | null {
  if (format === "center") return "center";
  if (format === "left" || format === "right") return format;
  if (format === "" || format === "start") return rtl ? "right" : "left";
  if (format === "end") return rtl ? "left" : "right";
  // justify has no button of its own.
  return null;
}

// The named instance a heading level is seeded with: the upright cut at the
// wanted weight (Bold for h1, SemiBold for h2, Medium for h3).
//
// Falls back to the upright cut nearest that weight, so a family that stops at
// Medium seeds its h1 with Medium rather than a weight it cannot draw. Asking
// for a cut the family doesn't ship would leave the browser to synthesize a
// fake one, which misrepresents the typeface on a page whose job is to show it
// honestly — and over half the catalog ships a single weight, so that is the
// common case. Returns undefined only when the family has no upright instance
// at all, in which case the heading keeps the document default.
function headingInstance(
  instances: FontInstance[],
  tag: "h1" | "h2" | "h3"
): FontInstance | undefined {
  const want = HEADING_WEIGHT[tag];
  const upright = instances.filter((i) => !i.italic);
  if (upright.length === 0) return undefined;
  const weightOf = (i: FontInstance) => i.coords.wght ?? REGULAR_WEIGHT;
  return upright.reduce((best, i) =>
    Math.abs(weightOf(i) - want) < Math.abs(weightOf(best) - want) ? i : best
  );
}

function TesterInner({
  fontStyle,
  instances,
  fontName,
  fontLoaded,
}: {
  fontStyle: CSSProperties;
  instances: FontInstance[];
  fontName: string;
  fontLoaded: boolean;
}) {
  const [editor] = useLexicalComposerContext();
  const [block, setBlock] = useState<BlockType>("normal");
  // Alignment of the block the caret is in. "" is Lexical's unset format, which
  // renders as `text-align: start` — i.e. left in an LTR block and right in an
  // RTL one, which is why the default needs no per-script special-casing. The
  // toolbar shows it as whichever end-aligned button matches the block's own
  // direction (see alignedStart below).
  const [align, setAlign] = useState<ElementFormatType>("");
  // Direction of the block the caret is in, read off the DOM element Lexical
  // rendered (it sets dir from the text's first strong character). Decides
  // which of the two end buttons the unset format lights up.
  const [rtl, setRtl] = useState(false);
  // The style string on the block the caret sits in, so the active chip can be
  // highlighted. Empty when that block has no instance of its own (it renders
  // at the document default).
  const [blockStyle, setBlockStyle] = useState("");
  // Node keys of the block(s) the selection covers, used only to tint them.
  const [activeKeys, setActiveKeys] = useState<string[]>([]);
  // Per-block-type size. The slider edits whichever block type is currently
  // selected; every block of that type updates together.
  const [sizes, setSizes] = useState<Record<BlockType, number>>(DEFAULT_SIZE);
  const size = sizes[block];
  // Both the slider and the editable readout write the size of whichever block
  // type is currently selected.
  const setSize = (v: number) => setSizes((s) => ({ ...s, [block]: v }));

  // Reflect the selection's current block into the toolbar, so moving the caret
  // into a Heading 2 line shows "Heading 2", and into a block carrying a named
  // instance lights that chip. Also records which block that is, so it can be
  // tinted below.
  const syncFromSelection = useCallback(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) {
      setActiveKeys([]);
      return;
    }
    const anchorNode = selection.anchor.getNode();
    const element =
      anchorNode.getKey() === "root"
        ? anchorNode
        : anchorNode.getTopLevelElementOrThrow();
    const next: BlockType = $isHeadingNode(element)
      ? (element.getTag() as BlockType)
      : "normal";
    setBlock(next);
    setBlockStyle(isTesterBlock(element) ? element.getStyle() : "");
    setAlign($isElementNode(element) ? element.getFormatType() : "");
    // Read the direction off the rendered element rather than the node: Lexical
    // derives it from the text's first strong character, the same rule dir=auto
    // uses everywhere else in the app.
    const dom = editor.getElementByKey(element.getKey());
    setRtl(dom ? getComputedStyle(dom).direction === "rtl" : false);
    // Every block the selection touches, matching the scope the toolbar and
    // the instance chips actually write to: a caret marks one, a drag across
    // paragraphs marks each of them.
    setActiveKeys(
      Array.from(
        new Set(
          selection
            .getNodes()
            .map((n) =>
              n.getKey() === "root" ? n : n.getTopLevelElementOrThrow()
            )
            .map((n) => n.getKey())
        )
      )
    );
  }, [editor]);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(syncFromSelection);
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          syncFromSelection();
          return false;
        },
        1
      )
    );
  }, [editor, syncFromSelection]);

  // Tint the block(s) the caret is in, so it's visible that the toolbar and the
  // instance chips act on the whole paragraph rather than the selected word.
  //
  // Marked as a DOM attribute rather than a Lexical node property: the tint is
  // pure presentation, and writing it into the editor state would put a
  // highlight in the undo history and dirty the document on every click.
  // `getElementByKey` is the supported way to reach a node's rendered element.
  useEffect(() => {
    const marked = activeKeys
      .map((key) => editor.getElementByKey(key))
      .filter((el): el is HTMLElement => el != null);
    for (const el of marked) el.dataset.pgActive = "true";
    return () => {
      for (const el of marked) delete el.dataset.pgActive;
    };
  }, [editor, activeKeys]);

  // Apply a block style to every block the selection touches. The slider below
  // then edits that type's shared size.
  const applyBlock = (value: BlockType) => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      $setBlocksType(selection, () =>
        value === "normal" ? $createParagraphNode() : $createHeadingNode(value)
      );
    });
    setBlock(value);
  };

  // Apply a named instance to every block the selection touches, so clicking a
  // chip restyles just the paragraph the caret is in rather than the document.
  // Clicking the active chip again clears the style, dropping that block back
  // to the document default.
  const applyInstance = (inst: FontInstance) => {
    const next = instanceStyle(inst.coords, inst.italic);
    const clearing = next === blockStyle;
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      // getNodes() returns the text nodes in range; walking up to each one's
      // top-level element and de-duplicating gives the blocks to restyle. A
      // collapsed caret yields exactly one, which is the common case.
      const blocks = new Set(
        selection
          .getNodes()
          .map((n) =>
            n.getKey() === "root" ? n : n.getTopLevelElementOrThrow()
          )
      );
      for (const b of blocks) {
        if (isTesterBlock(b)) b.setStyle(clearing ? "" : next);
      }
    });
    setBlockStyle(clearing ? "" : next);
  };

  // Font sizes for every block type, exposed as CSS variables the stylesheet
  // maps onto h1/h2/h3/p, plus the shared font (family/axes/italic/features).
  // Colour is left to the theme so the document reads correctly in both light
  // and dark mode.
  const editorStyle: CSSProperties = {
    ...fontStyle,
    "--pg-size-h1": `${sizes.h1}px`,
    "--pg-size-h2": `${sizes.h2}px`,
    "--pg-size-h3": `${sizes.h3}px`,
    "--pg-size-normal": `${sizes.normal}px`,
  } as CSSProperties;

  return (
    <div className="flex flex-col gap-3">
      {/* TOOLBAR: block style, size. */}
      <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
        {/* Slider and Select render their own controls (not native
            input/select), so these are plain <div>s with an aria-label on the
            control, not <label>s. */}
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          <span>Style</span>
          <Select
            value={block}
            onValueChange={(v) => applyBlock(v as BlockType)}
          >
            <SelectTrigger aria-label="Text style" className="h-8 w-36">
              <SelectValue>
                {BLOCK_OPTIONS.find((o) => o.value === block)?.label}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {BLOCK_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          <span>Size</span>
          <Slider
            aria-label="Font size"
            min={SIZE_MIN}
            max={SIZE_MAX}
            value={size}
            onValueChange={(v) => setSize(v as number)}
            className="w-32"
          />
          {/* Click-to-edit readout with the same presets as the sidebar's Font
              Size, so a heading can be typed straight to 48 instead of dragged
              there. Fixed width so the slider doesn't shift as digits change. */}
          <span className="flex w-8 shrink-0 justify-end">
            <EditableValue
              value={size}
              min={SIZE_MIN}
              max={SIZE_MAX}
              suffix="px"
              presets={SIZE_PRESETS}
              onChange={setSize}
              ariaLabel={`${block} font size`}
            />
          </span>
        </div>

        {/* ALIGNMENT: applies to the block(s) the selection touches, the same
            scope as Style. The two end buttons are labelled by the block's own
            direction, so an RTL paragraph reads "Align right" on the button
            that keeps its text at the start of the line. */}
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          <span>Align</span>
          <ButtonGroup>
            {ALIGNMENTS.map(({ id, icon: Icon, label }) => {
              const on = alignedAs(align, rtl) === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() =>
                    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, id)
                  }
                  aria-label={label(rtl)}
                  aria-pressed={on}
                  className={cn(
                    "flex size-8 items-center justify-center border border-input transition-colors first:rounded-l-md last:rounded-r-md",
                    on
                      ? "border-primary bg-muted text-foreground"
                      : "hover:bg-muted hover:text-primary"
                  )}
                >
                  <Icon className="size-4" />
                </button>
              );
            })}
          </ButtonGroup>
        </div>
      </div>

      {/* INSTANCE CHIPS: apply a named instance to the block the caret is in,
          the same scope the Style dropdown works on. Clicking the lit chip
          again clears it, so a block can go back to the document default. */}
      {instances.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-xs">Instance</span>
          {instances.map((inst) => {
            const style = instanceStyle(inst.coords, inst.italic);
            const active = style === blockStyle;
            return (
              <button
                key={`pg-chip:${inst.italic ? "i" : "u"}:${inst.name}`}
                type="button"
                onClick={() => applyInstance(inst)}
                aria-pressed={active}
                className={`rounded-md border px-3 py-1.5 text-xs transition-[color,background-color,border-color,transform] active:scale-[0.97] ${
                  active
                    ? "border-primary bg-muted text-foreground"
                    : "hover:border-foreground"
                }`}
                style={previewStyle({
                  name: fontName,
                  loaded: fontLoaded,
                  coords: inst.coords,
                  italic: inst.italic,
                })}
              >
                {inst.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Full-bleed: negative margins cancel the Column body's own padding
          (p-4, md:p-6) so the rule spans the whole column instead of stopping
          at the text edge. The values have to track that padding at both
          breakpoints, hence the md: variant. */}
      <Separator className="-mx-4 data-horizontal:w-auto md:-mx-6" />
      {/* EDITOR: the document surface. Only vertical padding: the toolbar and
          the document share the column's left edge, so an inset here would
          make the text hang off it. Colour comes from the theme. */}
      <div className="py-2">
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              aria-label="Tester editor"
              className="tester-editor w-full break-words outline-none"
              style={editorStyle}
            />
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
      </div>
      <HistoryPlugin />
    </div>
  );
}
