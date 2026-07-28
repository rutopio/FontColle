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

// Values match Lexical's node keys, so a read-back maps straight onto this list.
type BlockType = "normal" | "h1" | "h2" | "h3";
const BLOCK_OPTIONS: { value: BlockType; label: string }[] = [
  { value: "h1", label: "Heading 1" },
  { value: "h2", label: "Heading 2" },
  { value: "h3", label: "Heading 3" },
  { value: "normal", label: "Normal text" },
];

// A real rich-text editor (Lexical), deliberately independent of the shared
// usePreview() string: it mixes block styles in one document, the way the
// Google Fonts specimen does, which one plain string can't represent.
export function Tester({
  fontStyle,
  seedLines,
  instances,
  fontName,
  fontLoaded,
}: {
  // The document default; a block given a named instance overrides the axes
  // for itself. Carries no font-size, which is per block type.
  fontStyle: CSSProperties;
  // A font with nothing to continue (emoji, blank) supplies fewer lines, and
  // the extra headings are simply not created.
  seedLines: string[];
  // Also the source of the weights the family really ships, which the heading
  // defaults snap to.
  instances: FontInstance[];
  fontName: string;
  fontLoaded: boolean;
}) {
  const initialConfig = {
    namespace: "font-tester",
    nodes: TESTER_NODES,
    onError: (error: Error) => {
      throw error;
    },
    // Each heading carries the named instance matching its wanted weight rather
    // than a CSS font-weight, so the block renders a real cut instead of a
    // synthesized one, and its Instance chip reads as active when the caret
    // lands in it.
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
      // Land the caret in the first block so the toolbar has a target on
      // arrival: without this syncFromSelection bails at its !$isRangeSelection
      // guard and every control reads empty until the user clicks a line.
      //
      // selectStart(), not editor.focus(): focusing on mount would scroll the
      // editor into view and raise the software keyboard on mobile.
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

// Published as CSS custom properties and consumed by the h1/h2/h3/p rules in
// styles.css, so one document can mix block types at their own sizes.
const DEFAULT_SIZE: Record<BlockType, number> = {
  h1: 48,
  h2: 28,
  h3: 24,
  normal: 18,
};

// Only a wish: a family that doesn't ship the cut falls back to Regular below
// rather than letting the browser fake it.
const HEADING_WEIGHT: Record<"h1" | "h2" | "h3", number> = {
  h1: 700,
  h2: 600,
  h3: 500,
};

const REGULAR_WEIGHT = 400;

// `label` takes the block's direction because "left" is the start of an LTR
// line but the END of an RTL one, so the same button means opposite things to
// a screen-reader user depending on what they're editing.
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

// Lexical's unset format ("") renders as `text-align: start`, which the browser
// resolves against the block's own direction — the wanted default, so it needs
// resolving only here, at read time, to light the right button.
function alignedAs(
  format: ElementFormatType,
  rtl: boolean
): "left" | "center" | "right" | null {
  if (format === "center") return "center";
  if (format === "left" || format === "right") return format;
  if (format === "" || format === "start") return rtl ? "right" : "left";
  if (format === "end") return rtl ? "left" : "right";
  return null;
}

// Falls back to the nearest weight the family actually ships: asking for a
// missing cut leaves the browser to synthesize a fake, misrepresenting the
// typeface. Over half the catalog ships a single weight, so this is the common
// case, not an edge one.
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
  // "" is Lexical's unset format; see alignedStart for how it is displayed.
  const [align, setAlign] = useState<ElementFormatType>("");
  // Read off the DOM element Lexical rendered, which sets dir from the text's
  // first strong character. Decides which end button the unset format lights.
  const [rtl, setRtl] = useState(false);
  const [blockStyle, setBlockStyle] = useState("");
  const [activeKeys, setActiveKeys] = useState<string[]>([]);
  const [sizes, setSizes] = useState<Record<BlockType, number>>(DEFAULT_SIZE);
  const size = sizes[block];
  const setSize = (v: number) => setSizes((s) => ({ ...s, [block]: v }));

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
    // Off the rendered element, not the node: Lexical derives dir from the
    // first strong character, the same rule dir=auto uses elsewhere.
    const dom = editor.getElementByKey(element.getKey());
    setRtl(dom ? getComputedStyle(dom).direction === "rtl" : false);
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

  // A DOM attribute, NOT a Lexical node property: writing pure presentation
  // into the editor state would put a highlight in the undo history and dirty
  // the document on every click.
  useEffect(() => {
    const marked = activeKeys
      .map((key) => editor.getElementByKey(key))
      .filter((el): el is HTMLElement => el != null);
    for (const el of marked) el.dataset.pgActive = "true";
    return () => {
      for (const el of marked) delete el.dataset.pgActive;
    };
  }, [editor, activeKeys]);

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

  // Clicking the active chip again drops the block to the document default.
  const applyInstance = (inst: FontInstance) => {
    const next = instanceStyle(inst.coords, inst.italic);
    const clearing = next === blockStyle;
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      // getNodes() returns text nodes, so walk up to each one's top-level
      // element and de-duplicate to get the blocks to restyle.
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

  // Colour is left to the theme, so the document reads in both modes.
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
        <div className="flex items-center gap-2 text-xs">
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

        <div className="flex items-center gap-2 text-xs">
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
        <div className="flex items-center gap-2 text-xs">
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
          <span className="text-xs">Instance</span>
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
