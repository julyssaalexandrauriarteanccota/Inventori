"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ClipboardEvent,
  type FocusEvent,
  type HTMLAttributes,
  type KeyboardEvent,
} from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type RichDescriptionEditorProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "value" | "onChange" | "onInput" | "placeholder"
> & {
  value?: string | null;
  name?: string;
  placeholder?: string;
  onBlur?: (event: FocusEvent<HTMLTextAreaElement>) => void;
  onValueChange: (value: string) => void;
};

type BlockFormatTagName = "h2" | "h3" | "p" | "blockquote";
type EditableBlockTagName = BlockFormatTagName | "div" | "h4";

const EDITABLE_BLOCK_SELECTOR = "p,div,h2,h3,h4,blockquote,li";
const PRESERVED_BLOCK_TAGS = new Set(["P", "DIV", "H2", "H3", "H4", "BLOCKQUOTE"]);

const ALLOWED_TAGS = new Set([
  "B",
  "BLOCKQUOTE",
  "BR",
  "DIV",
  "EM",
  "H2",
  "H3",
  "H4",
  "HR",
  "I",
  "LI",
  "OL",
  "P",
  "STRONG",
  "UL",
]);

export function isRichDescriptionHtml(value?: string | null) {
  return /<\/?(p|div|h2|h3|h4|ul|ol|li|strong|b|em|i|blockquote|hr|br)\b/i.test(
    value ?? "",
  );
}

export function sanitizeRichDescriptionHtml(html: string) {
  if (typeof document === "undefined") return html;

  const template = document.createElement("template");
  template.innerHTML = html;

  template.content.querySelectorAll("script,style,iframe,object").forEach((node) => {
    node.remove();
  });

  const walk = (node: Node) => {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const element = child as HTMLElement;
        if (!ALLOWED_TAGS.has(element.tagName)) {
          const fragment = document.createDocumentFragment();
          while (element.firstChild) {
            fragment.appendChild(element.firstChild);
          }
          element.replaceWith(fragment);
          walk(fragment);
          return;
        }

        Array.from(element.attributes).forEach((attribute) => {
          element.removeAttribute(attribute.name);
        });
      }

      walk(child);
    });
  };

  walk(template.content);

  return template.innerHTML
    .replace(/\u200B/g, "")
    .replace(/<div><br><\/div>/gi, "")
    .replace(/<p><br><\/p>/gi, "")
    .trim();
}

function isRichHtmlEmpty(html: string) {
  if (!html) return true;
  if (typeof document === "undefined") return html.trim().length === 0;

  const template = document.createElement("template");
  template.innerHTML = html;
  return (template.content.textContent ?? "").replace(/\u200B/g, "").trim().length === 0;
}

function elementFromNode(node: Node | null) {
  if (!node) return null;
  return node.nodeType === Node.ELEMENT_NODE
    ? (node as HTMLElement)
    : node.parentElement;
}

function getClosestEditableBlock(node: Node, editor: HTMLElement) {
  const element = elementFromNode(node);
  const block = element?.closest(EDITABLE_BLOCK_SELECTOR);

  if (!block || block === editor || !editor.contains(block)) {
    return null;
  }

  return block as HTMLElement;
}

function nodeHasMeaningfulContent(node: Node) {
  const text = (node.textContent ?? "").replace(/\u200B/g, "").trim();
  if (text) return true;

  if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
    const parent = node as ParentNode;
    return Boolean(parent.querySelector?.("br,hr,ul,ol,li,blockquote,h2,h3,h4"));
  }

  return false;
}

function createEditableBlock(tagName: EditableBlockTagName, content: DocumentFragment) {
  const block = document.createElement(tagName);

  if (nodeHasMeaningfulContent(content)) {
    block.appendChild(content);
  } else {
    block.appendChild(document.createElement("br"));
  }

  return block;
}

function getPreservedBlockTagName(block: HTMLElement): EditableBlockTagName {
  if (!PRESERVED_BLOCK_TAGS.has(block.tagName)) return "p";
  return block.tagName.toLowerCase() as EditableBlockTagName;
}

export const RichDescriptionEditor = forwardRef<
  HTMLTextAreaElement,
  RichDescriptionEditorProps
>(function RichDescriptionEditor(
  {
    value,
    name,
    placeholder = "Escribe la descripción del producto...",
    onBlur,
    onValueChange,
    className,
    ...props
  },
  forwardedRef,
) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const hiddenTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const htmlValue = value ?? "";
  const [placeholderVisible, setPlaceholderVisible] = useState(() =>
    isRichHtmlEmpty(htmlValue),
  );

  useImperativeHandle(
    forwardedRef,
    () => hiddenTextareaRef.current as HTMLTextAreaElement,
  );

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || document.activeElement === editor) return;
    if (editor.innerHTML !== htmlValue) {
      editor.innerHTML = htmlValue;
    }
    const frame = window.requestAnimationFrame(() => {
      setPlaceholderVisible(isRichHtmlEmpty(htmlValue));
    });

    return () => window.cancelAnimationFrame(frame);
  }, [htmlValue]);

  const saveSelection = () => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (editor.contains(range.commonAncestorContainer)) {
      savedRangeRef.current = range.cloneRange();
    }
  };

  const restoreSelection = () => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();

    if (!editor.innerHTML.trim()) {
      editor.innerHTML = "<p><br></p>";
    }

    const selection = window.getSelection();
    if (!selection) return;

    selection.removeAllRanges();
    const savedRange = savedRangeRef.current;

    if (savedRange && editor.contains(savedRange.commonAncestorContainer)) {
      selection.addRange(savedRange);
      return;
    }

    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    selection.addRange(range);
    savedRangeRef.current = range.cloneRange();
  };

  const emitCurrentValue = (sanitize = false) => {
    const editor = editorRef.current;
    if (!editor) return;

    const rawValue = editor.innerHTML.replace(/\u200B/g, "");
    const sanitized = sanitize ? sanitizeRichDescriptionHtml(rawValue) : rawValue;
    const hasEditableStructure = /<(ul|ol|li|blockquote|h2|h3|hr)\b/i.test(
      sanitized,
    );
    const isEmpty = isRichHtmlEmpty(sanitized) && !hasEditableStructure;
    setPlaceholderVisible(isEmpty);
    onValueChange(isEmpty ? "" : sanitized);
    saveSelection();
  };

  const runCommand = (command: string, commandValue?: string) => {
    restoreSelection();
    document.execCommand(command, false, commandValue);
    emitCurrentValue();
  };

  const insertTemplate = () => {
    restoreSelection();
    document.execCommand(
      "insertHTML",
      false,
      [
        "<h2>Características principales</h2>",
        "<ul>",
        "<li><strong>Ideal para:</strong> </li>",
        "<li><strong>Compatibilidad:</strong> </li>",
        "<li><strong>Incluye:</strong> </li>",
        "</ul>",
        "<h2>Observaciones</h2>",
        "<p></p>",
      ].join(""),
    );
    emitCurrentValue();
  };

  const insertParagraphAfter = (block: HTMLElement) => {
    const paragraph = document.createElement("p");
    paragraph.appendChild(document.createElement("br"));
    block.insertAdjacentElement("afterend", paragraph);

    const selection = window.getSelection();
    const range = document.createRange();
    range.setStart(paragraph, 0);
    range.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(range);
    savedRangeRef.current = range.cloneRange();
    emitCurrentValue();
  };

  const moveCursorInto = (element: HTMLElement) => {
    const selection = window.getSelection();
    const range = document.createRange();

    if (!element.textContent?.replace(/\u200B/g, "").trim()) {
      element.textContent = "\u200B";
      range.setStart(element.firstChild ?? element, 1);
    } else {
      range.selectNodeContents(element);
      range.collapse(false);
    }

    selection?.removeAllRanges();
    selection?.addRange(range);
    savedRangeRef.current = range.cloneRange();
  };

  const replaceSingleBlockSelection = (
    range: Range,
    tagName: BlockFormatTagName,
    editor: HTMLElement,
  ) => {
    const startBlock = getClosestEditableBlock(range.startContainer, editor);
    const endBlock = getClosestEditableBlock(range.endContainer, editor);

    if (!startBlock || startBlock !== endBlock || startBlock.tagName === "LI") {
      return false;
    }

    const selectedContent = range.cloneContents();
    if (!nodeHasMeaningfulContent(selectedContent)) return false;

    const beforeRange = document.createRange();
    beforeRange.setStart(startBlock, 0);
    beforeRange.setEnd(range.startContainer, range.startOffset);

    const afterRange = document.createRange();
    afterRange.setStart(range.endContainer, range.endOffset);
    afterRange.setEnd(startBlock, startBlock.childNodes.length);

    const beforeContent = beforeRange.cloneContents();
    const afterContent = afterRange.cloneContents();
    const preservedTagName = getPreservedBlockTagName(startBlock);
    const replacementBlocks: HTMLElement[] = [];

    if (nodeHasMeaningfulContent(beforeContent)) {
      replacementBlocks.push(createEditableBlock(preservedTagName, beforeContent));
    }

    const formattedBlock = createEditableBlock(tagName, selectedContent);
    replacementBlocks.push(formattedBlock);

    if (nodeHasMeaningfulContent(afterContent)) {
      replacementBlocks.push(createEditableBlock(preservedTagName, afterContent));
    }

    startBlock.replaceWith(...replacementBlocks);
    moveCursorInto(formattedBlock);
    return true;
  };

  const convertListItemToBlock = (
    range: Range,
    tagName: BlockFormatTagName,
    editor: HTMLElement,
  ) => {
    const listItem = getClosestEditableBlock(range.startContainer, editor);
    const endListItem = getClosestEditableBlock(range.endContainer, editor);

    if (
      !listItem ||
      listItem !== endListItem ||
      listItem.tagName !== "LI" ||
      !listItem.parentElement ||
      !["UL", "OL"].includes(listItem.parentElement.tagName)
    ) {
      return false;
    }

    const list = listItem.parentElement;
    const parent = list.parentNode;
    if (!parent) return false;

    const beforeList = document.createElement(list.tagName.toLowerCase());
    const afterList = document.createElement(list.tagName.toLowerCase());
    let sibling = list.firstElementChild;

    while (sibling && sibling !== listItem) {
      beforeList.appendChild(sibling.cloneNode(true));
      sibling = sibling.nextElementSibling;
    }

    sibling = listItem.nextElementSibling;
    while (sibling) {
      afterList.appendChild(sibling.cloneNode(true));
      sibling = sibling.nextElementSibling;
    }

    const blockContent = document.createDocumentFragment();
    while (listItem.firstChild) {
      blockContent.appendChild(listItem.firstChild);
    }

    const formattedBlock = createEditableBlock(tagName, blockContent);
    const replacementNodes: HTMLElement[] = [];

    if (beforeList.children.length > 0) replacementNodes.push(beforeList);
    replacementNodes.push(formattedBlock);
    if (afterList.children.length > 0) replacementNodes.push(afterList);

    list.replaceWith(...replacementNodes);
    moveCursorInto(formattedBlock);
    return true;
  };

  const applyBlockFormat = (tagName: BlockFormatTagName) => {
    restoreSelection();

    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);

    if (
      editor.contains(range.commonAncestorContainer) &&
      convertListItemToBlock(range, tagName, editor)
    ) {
      emitCurrentValue();
      setPlaceholderVisible(false);
      return;
    }

    if (
      !range.collapsed &&
      editor.contains(range.commonAncestorContainer) &&
      replaceSingleBlockSelection(range, tagName, editor)
    ) {
      emitCurrentValue();
      setPlaceholderVisible(false);
      return;
    }

    document.execCommand("formatBlock", false, `<${tagName}>`);
    emitCurrentValue();
  };

  const createListElement = (tagName: "ul" | "ol", items: string[]) => {
    const list = document.createElement(tagName);

    items.forEach((item) => {
      const li = document.createElement("li");
      if (item.trim()) {
        li.textContent = item.trim();
      } else {
        li.textContent = "\u200B";
      }
      list.appendChild(li);
    });

    return list;
  };

  const insertList = (tagName: "ul" | "ol") => {
    restoreSelection();

    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const anchorElement =
      selection.anchorNode?.nodeType === Node.ELEMENT_NODE
        ? (selection.anchorNode as HTMLElement)
        : selection.anchorNode?.parentElement;
    const currentList = anchorElement?.closest("ul,ol");
    const currentListItem = anchorElement?.closest("li");

    if (currentList instanceof HTMLElement && currentList.tagName.toLowerCase() === tagName) {
      const isNestedList = Boolean(currentList.parentElement?.closest("li"));

      if (!isNestedList && currentListItem instanceof HTMLElement) {
        convertListItemToBlock(range, "p", editor);
      } else {
        document.execCommand("outdent");
      }

      emitCurrentValue();
      return;
    }

    const selectedText = selection.toString();
    const items = selectedText
      ? selectedText.split(/\r?\n/).filter((line) => line.trim())
      : [""];

    if (!selectedText && isRichHtmlEmpty(editor.innerHTML)) {
      const cleanList = createListElement(tagName, [""]);
      editor.innerHTML = "";
      editor.appendChild(cleanList);
      const cleanFirstItem = cleanList.querySelector("li") as HTMLElement | null;
      if (cleanFirstItem) moveCursorInto(cleanFirstItem);
      setPlaceholderVisible(false);
      emitCurrentValue();
      return;
    }

    const list = createListElement(tagName, items);
    const firstItem = list.querySelector("li") as HTMLElement | null;
    const block = anchorElement?.closest(
      "p,div,h2,h3,h4,blockquote,li",
    ) as HTMLElement | null;

    if (!selectedText && block && block !== editor && editor.contains(block)) {
      const blockText = block.textContent?.trim();
      const replacementList = createListElement(tagName, [blockText ?? ""]);
      const replacementFirstItem = replacementList.querySelector("li") as HTMLElement | null;
      block.replaceWith(replacementList);
      if (replacementFirstItem) moveCursorInto(replacementFirstItem);
    } else {
      range.deleteContents();
      range.insertNode(list);
      if (firstItem) moveCursorInto(firstItem);
    }

    emitCurrentValue();
    setPlaceholderVisible(false);
  };

  const handleEditorKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter") return;

    const selection = window.getSelection();
    const node = selection?.anchorNode;
    const element =
      node?.nodeType === Node.ELEMENT_NODE
        ? (node as HTMLElement)
        : node?.parentElement;
    const block = element?.closest("blockquote,h2,h3,h4");

    const listItem = element?.closest("li");
    if (listItem instanceof HTMLElement && !listItem.textContent?.trim()) {
      const editor = editorRef.current;
      const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
      if (editor && range) {
        event.preventDefault();
        convertListItemToBlock(range, "p", editor);
        emitCurrentValue();
      }
      return;
    }

    if (block instanceof HTMLElement) {
      event.preventDefault();
      insertParagraphAfter(block);
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    restoreSelection();
    const text = event.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
    emitCurrentValue();
  };

  const toolbarButtonClass =
    "h-8 rounded-md px-2.5 text-xs text-muted-foreground hover:text-foreground";

  return (
    <div
      className="space-y-2"
      data-gramm="false"
      data-gramm_editor="false"
      data-enable-grammarly="false"
    >
      <div className="overflow-hidden rounded-xl border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        <div className="flex flex-wrap items-center gap-1 border-b bg-muted/35 px-3 py-2 select-none">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(toolbarButtonClass, "font-bold")}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => runCommand("bold")}
            title="Negrita"
          >
            B
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(toolbarButtonClass, "italic")}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => runCommand("italic")}
            title="Cursiva"
          >
            I
          </Button>
          <div className="mx-1 h-5 w-px bg-border/80" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(toolbarButtonClass, "font-semibold")}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyBlockFormat("h2")}
            title="Título"
          >
            Título
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={toolbarButtonClass}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyBlockFormat("h3")}
            title="Subtítulo"
          >
            Subtítulo
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={toolbarButtonClass}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyBlockFormat("p")}
            title="Párrafo"
          >
            Texto
          </Button>
          <div className="mx-1 h-5 w-px bg-border/80" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={toolbarButtonClass}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => insertList("ul")}
            title="Lista con viñetas"
          >
            Lista
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={toolbarButtonClass}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => insertList("ol")}
            title="Lista numerada"
          >
            1. Lista
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={toolbarButtonClass}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyBlockFormat("blockquote")}
            title="Nota destacada"
          >
            Nota
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={toolbarButtonClass}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => runCommand("insertHorizontalRule")}
            title="Separador"
          >
            Línea
          </Button>
          <div className="mx-1 h-5 w-px bg-border/80" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={toolbarButtonClass}
            onMouseDown={(event) => event.preventDefault()}
            onClick={insertTemplate}
          >
            Plantilla
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={toolbarButtonClass}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => runCommand("removeFormat")}
          >
            Limpiar
          </Button>
        </div>

        <div className="relative">
          <div
            {...props}
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            spellCheck={false}
            data-gramm="false"
            data-gramm_editor="false"
            data-enable-grammarly="false"
            data-empty={placeholderVisible}
            className={cn(
              "min-h-[190px] w-full resize-y overflow-auto px-4 py-3 text-sm leading-relaxed outline-none",
              "prose prose-sm max-w-none dark:prose-invert",
              "[&_h2]:mb-2 [&_h2]:mt-3 [&_h2]:text-base [&_h2]:font-semibold",
              "[&_h3]:mb-2 [&_h3]:mt-3 [&_h3]:text-sm [&_h3]:font-semibold",
              "[&_p]:my-1.5 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-1",
              "[&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6",
              "[&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-primary/60 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground",
              "[&_hr]:my-3 [&_hr]:border-border",
              className,
            )}
            onInput={() => emitCurrentValue()}
            onKeyDown={handleEditorKeyDown}
            onKeyUp={saveSelection}
            onMouseUp={saveSelection}
            onFocus={saveSelection}
            onPaste={handlePaste}
            onBlur={() => {
              emitCurrentValue(true);
              if (hiddenTextareaRef.current) {
                const blurEvent = {
                  target: hiddenTextareaRef.current,
                  currentTarget: hiddenTextareaRef.current,
                } as FocusEvent<HTMLTextAreaElement>;
                onBlur?.(blurEvent);
              }
            }}
          />
          {placeholderVisible ? (
            <button
              type="button"
              className="pointer-events-none absolute left-4 top-3 text-left text-sm text-muted-foreground/70"
              tabIndex={-1}
            >
              {placeholder}
            </button>
          ) : null}
        </div>
      </div>

      <textarea
        ref={hiddenTextareaRef}
        name={name}
        value={htmlValue}
        onChange={() => undefined}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        spellCheck={false}
        data-gramm="false"
        data-gramm_editor="false"
        data-enable-grammarly="false"
      />
    </div>
  );
});

export function RichDescriptionViewer({
  value,
  className,
}: {
  value?: string | null;
  className?: string;
}) {
  if (!value?.trim()) return null;

  if (!isRichDescriptionHtml(value)) {
    return <p className={cn("whitespace-pre-line", className)}>{value}</p>;
  }

  return (
    <div
      className={cn(
        "space-y-2 text-sm leading-relaxed text-muted-foreground",
        "[&_strong]:font-semibold [&_strong]:text-foreground",
        "[&_b]:font-semibold [&_b]:text-foreground",
        "[&_em]:italic [&_i]:italic",
        "[&_h2]:mt-4 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground",
        "[&_h3]:mt-3 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-foreground",
        "[&_p]:my-1.5 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-1",
        "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
        "[&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-primary/60 [&_blockquote]:pl-3 [&_blockquote]:italic",
        "[&_hr]:my-3 [&_hr]:border-border",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: sanitizeRichDescriptionHtml(value) }}
    />
  );
}

export function richDescriptionToPlainTextLines(value?: string | null) {
  if (!value?.trim()) return [];
  if (!isRichDescriptionHtml(value)) return value.split(/\r?\n/);

  if (typeof document === "undefined") {
    return value
      .replace(/<li[^>]*>/gi, "\n- ")
      .replace(/<\/(p|div|h2|h3|h4|blockquote|li)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<hr\s*\/?>/gi, "\n---\n")
      .replace(/<[^>]+>/g, "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  const template = document.createElement("template");
  template.innerHTML = sanitizeRichDescriptionHtml(value);
  const lines: string[] = [];

  const pushText = (text: string, prefix = "") => {
    const normalized = text.replace(/\s+/g, " ").trim();
    if (normalized) lines.push(`${prefix}${normalized}`);
  };

  template.content.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      pushText(node.textContent ?? "");
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const element = node as HTMLElement;

    if (element.tagName === "UL" || element.tagName === "OL") {
      Array.from(element.children).forEach((child, index) => {
        pushText(
          child.textContent ?? "",
          element.tagName === "OL" ? `${index + 1}. ` : "- ",
        );
      });
      return;
    }

    if (element.tagName === "HR") {
      lines.push("");
      return;
    }

    pushText(element.textContent ?? "");
  });

  return lines;
}
