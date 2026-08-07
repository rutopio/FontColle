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
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { ButtonGroup } from "@/components/ui/button-group";
import { EditableValue } from "@/components/ui/editable-value";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { previewStyle } from "@/lib/fonts/preview-style";
import type { FontInstance } from "@/lib/fonts/types";
import { useBlockAxes } from "@/lib/tester/block-axes";
import { cn } from "@/lib/utils";
import { SIZE_MAX, SIZE_MIN, SIZE_PRESETS } from "./detail-sidebar";
import {
  coordsFromStyle,
  instanceStyle,
  isTesterBlock,
  TESTER_NODES,
} from "./tester-nodes";

type BlockType = "normal" | "h1" | "h2" | "h3";
const BLOCK_OPTIONS: { value: BlockType; label: string }[] = [
  { value: "h1", label: "Heading 1" },
  { value: "h2", label: "Heading 2" },
  { value: "h3", label: "Heading 3" },
  { value: "normal", label: "Normal text" },
];

export function Tester({
  fontStyle,
  seedLines,
  instances,
  fontName,
  fontLoaded,
}: {
  fontStyle: CSSProperties;
  seedLines: string[];
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
      // selectStart(), not focus(): avoid scroll-into-view and mobile keyboard.
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

const DEFAULT_SIZE: Record<BlockType, number> = {
  h1: 48,
  h2: 28,
  h3: 24,
  normal: 18,
};

const HEADING_WEIGHT: Record<"h1" | "h2" | "h3", number> = {
  h1: 700,
  h2: 600,
  h3: 500,
};

const REGULAR_WEIGHT = 400;

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

// Snap to nearest shipped weight to avoid browser synthesis.
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
  const [align, setAlign] = useState<ElementFormatType>("");
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
      setBlockAxesTargetRef.current?.(null);
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
    const style = isTesterBlock(element) ? element.getStyle() : "";
    setBlockStyle(style);
    setAlign($isElementNode(element) ? element.getFormatType() : "");
    const dom = editor.getElementByKey(element.getKey());
    setRtl(dom ? getComputedStyle(dom).direction === "rtl" : false);
    const keys = Array.from(
      new Set(
        selection
          .getNodes()
          .map((n) =>
            n.getKey() === "root" ? n : n.getTopLevelElementOrThrow()
          )
          .map((n) => n.getKey())
      )
    );
    setActiveKeys(keys);
    if (setBlockAxesTargetRef.current) {
      if (keys.length === 0) {
        setBlockAxesTargetRef.current(null);
      } else {
        setBlockAxesTargetRef.current({
          coords: coordsFromStyle(style),
          setAxis: setBlockAxisRef.current,
        });
      }
    }
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

  // DOM attribute avoids polluting Lexical undo history.
  useEffect(() => {
    const marked = activeKeys
      .map((key) => editor.getElementByKey(key))
      .filter((el): el is HTMLElement => el != null);
    for (const el of marked) el.dataset.pgActive = "true";
    return () => {
      for (const el of marked) delete el.dataset.pgActive;
    };
  }, [editor, activeKeys]);

  // Rebuild full style from coords so one axis change never drops others (incl. italic).
  const setBlockAxis = useCallback(
    (tag: string, value: number) => {
      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;
        const blocks = new Set(
          selection
            .getNodes()
            .map((n) =>
              n.getKey() === "root" ? n : n.getTopLevelElementOrThrow()
            )
        );
        for (const b of blocks) {
          if (!isTesterBlock(b)) continue;
          const style = b.getStyle();
          const next = { ...coordsFromStyle(style), [tag]: value };
          b.setStyle(instanceStyle(next, /italic/.test(style)));
        }
      });
    },
    [editor]
  );

  const blockAxesCtx = useBlockAxes();
  const setBlockAxesTarget = blockAxesCtx?.setTarget;
  const setBlockAxesTargetRef = useRef(setBlockAxesTarget);
  setBlockAxesTargetRef.current = setBlockAxesTarget;
  const setBlockAxisRef = useRef(setBlockAxis);
  setBlockAxisRef.current = setBlockAxis;
  useMountEffect(() => () => setBlockAxesTargetRef.current?.(null));

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

  const applyInstance = (inst: FontInstance) => {
    const next = instanceStyle(inst.coords, inst.italic);
    const clearing = next === blockStyle;
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
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

  const editorStyle: CSSProperties = {
    ...fontStyle,
    "--pg-size-h1": `${sizes.h1}px`,
    "--pg-size-h2": `${sizes.h2}px`,
    "--pg-size-h3": `${sizes.h3}px`,
    "--pg-size-normal": `${sizes.normal}px`,
  } as CSSProperties;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
        <div className="flex items-center gap-2 text-xs">
          <span>Style</span>
          <Select
            value={block}
            onValueChange={(v) => applyBlock(v as BlockType)}
          >
            <SelectTrigger
              aria-label="Text style"
              className="h-8 w-36 min-w-0"
            />
            <SelectContent>
              {BLOCK_OPTIONS.map((o, i) => (
                <SelectItem key={o.value} index={i} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span>Size</span>
          <Slider
            label="Font size"
            min={SIZE_MIN}
            max={SIZE_MAX}
            value={size}
            onChange={(v) => setSize(v as number)}
            showValue={false}
            tooltipSide="bottom"
            className="w-32"
          />
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
                className={`rounded-md border px-3 py-1.5 text-xs transition-[color,background-color,border-color,transform] duration-fast ease-snap active:scale-[0.97] ${
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

      <Separator className="-mx-4 data-horizontal:w-auto md:-mx-6" />
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
