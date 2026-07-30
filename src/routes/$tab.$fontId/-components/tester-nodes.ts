import { HeadingNode } from "@lexical/rich-text";
import {
  type EditorConfig,
  type LexicalNode,
  type LexicalUpdateJSON,
  ParagraphNode,
  type SerializedElementNode,
} from "lexical";

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

// Must override all inherited properties (mirrors previewStyle).
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
