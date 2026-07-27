import { HeadingNode } from "@lexical/rich-text";
import {
  type EditorConfig,
  type LexicalNode,
  type LexicalUpdateJSON,
  ParagraphNode,
  type SerializedElementNode,
} from "lexical";

// Lexical's ElementNode already stores a per-node `__style` string (setStyle /
// getStyle), but the stock ParagraphNode and HeadingNode never write it to the
// DOM: their createDOM only emits text-align. These two subclasses close that
// gap, so a single paragraph can carry its own font-variation-settings and
// font-style while its siblings keep the document's.
//
// They're registered through initialConfig's `replace`/`with`, which swaps them
// in wherever Lexical itself would construct the stock node (typing Enter,
// $setBlocksType, paste), so nothing else in the editor has to know they exist.

// cssText is assigned, not appended: the style is the node's full declaration,
// and appending would let stale properties from an earlier instance survive.
// super's own output (text-align) runs first, so it is captured and re-applied.
function applyNodeStyle(dom: HTMLElement, style: string): void {
  const { textAlign } = dom.style;
  dom.style.cssText = style;
  if (textAlign) dom.style.textAlign = textAlign;
}

export class TesterParagraphNode extends ParagraphNode {
  static getType(): string {
    return "tester-paragraph";
  }

  static clone(node: TesterParagraphNode): TesterParagraphNode {
    const clone = new TesterParagraphNode(node.__key);
    // __style isn't part of the constructor, so carry it across by hand;
    // without this every reconcile would drop the paragraph's instance.
    clone.__style = node.__style;
    return clone;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    applyNodeStyle(dom, this.__style);
    return dom;
  }

  updateDOM(prevNode: this, dom: HTMLElement, config: EditorConfig): boolean {
    const needsReplace = super.updateDOM(prevNode, dom, config);
    if (needsReplace) return true;
    if (prevNode.__style !== this.__style) applyNodeStyle(dom, this.__style);
    return false;
  }

  // The base class serializes __style already; these two overrides only exist
  // to keep the type tag ours, so a reloaded document rebuilds the subclass.
  static importJSON(serialized: SerializedElementNode): TesterParagraphNode {
    return new TesterParagraphNode().updateFromJSON(serialized);
  }

  updateFromJSON(serialized: LexicalUpdateJSON<SerializedElementNode>): this {
    return super.updateFromJSON(serialized);
  }
}

export class TesterHeadingNode extends HeadingNode {
  static getType(): string {
    return "tester-heading";
  }

  static clone(node: TesterHeadingNode): TesterHeadingNode {
    const clone = new TesterHeadingNode(node.__tag, node.__key);
    clone.__style = node.__style;
    return clone;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    applyNodeStyle(dom, this.__style);
    return dom;
  }

  updateDOM(prevNode: this, dom: HTMLElement): boolean {
    // HeadingNode's own updateDOM returns false unconditionally (a tag change
    // recreates the node), so there's no super result worth forwarding.
    if (prevNode.__style !== this.__style) applyNodeStyle(dom, this.__style);
    return false;
  }
}

export const TESTER_NODES = [
  TesterParagraphNode,
  TesterHeadingNode,
  {
    replace: ParagraphNode,
    with: (): TesterParagraphNode => new TesterParagraphNode(),
    withKlass: TesterParagraphNode,
  },
  {
    replace: HeadingNode,
    with: (node: HeadingNode): TesterHeadingNode =>
      new TesterHeadingNode(node.__tag),
    withKlass: TesterHeadingNode,
  },
];

// The CSS a named instance renders as. It must OVERRIDE everything the editor
// root's preview style sets, not add to it: anything left out here is inherited
// from the root instead of coming from the instance. So it mirrors
// previewStyle's mapping deliberately:
//  - wght goes to font-weight as well as the variation settings, so the browser
//    picks the right named face and the heading rules' font-weight:700 doesn't
//    win by default;
//  - font-style is explicit because italic is a separate cut on most families
//    rather than an axis, so the coords alone would never slant the text;
//  - font-optical-sizing, because an explicit opsz coord is inert while the
//    browser's default `auto` drives the axis from font-size.
export function instanceStyle(
  coords: Record<string, number>,
  italic: boolean
): string {
  const entries = Object.entries(coords);
  const parts: string[] = [];
  if (entries.length > 0) {
    const fvs = entries.map(([tag, value]) => `"${tag}" ${value}`).join(", ");
    parts.push(`font-variation-settings: ${fvs}`);
  }
  if (coords.wght != null) {
    parts.push(`font-weight: ${Math.round(coords.wght)}`);
  }
  if (coords.opsz != null) parts.push("font-optical-sizing: none");
  parts.push(`font-style: ${italic ? "italic" : "normal"}`);
  return `${parts.join("; ")};`;
}

export function isTesterBlock(
  node: LexicalNode
): node is TesterParagraphNode | TesterHeadingNode {
  return (
    node instanceof TesterParagraphNode || node instanceof TesterHeadingNode
  );
}
