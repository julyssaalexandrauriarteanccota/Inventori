import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RichDescriptionEditor } from "@/components/forms/rich-description-editor";

function selectText(node: Text, start: number, end: number) {
  const selection = window.getSelection();
  const range = document.createRange();

  range.setStart(node, start);
  range.setEnd(node, end);
  selection?.removeAllRanges();
  selection?.addRange(range);
}

describe("RichDescriptionEditor", () => {
  it("formats only the selected text as a note block", async () => {
    const onValueChange = vi.fn();

    render(
      <RichDescriptionEditor
        value="<p>Alpha Beta Gamma</p>"
        onValueChange={onValueChange}
      />,
    );

    const editor = screen.getByRole("textbox");
    await waitFor(() => {
      expect(editor.querySelector("p")?.textContent).toBe("Alpha Beta Gamma");
    });

    const textNode = editor.querySelector("p")?.firstChild;
    expect(textNode?.nodeType).toBe(Node.TEXT_NODE);

    selectText(textNode as Text, 6, 10);
    fireEvent.mouseUp(editor);
    fireEvent.click(screen.getByRole("button", { name: "Nota" }));

    expect(onValueChange).toHaveBeenLastCalledWith(
      "<p>Alpha </p><blockquote>Beta</blockquote><p> Gamma</p>",
    );
  });

  it("converts the current list item into a title block", async () => {
    const onValueChange = vi.fn();

    render(
      <RichDescriptionEditor
        value="<ul><li>Uno</li><li>Dos</li><li>Tres</li></ul>"
        onValueChange={onValueChange}
      />,
    );

    const editor = screen.getByRole("textbox");
    await waitFor(() => {
      expect(editor.querySelectorAll("li")).toHaveLength(3);
    });

    const textNode = editor.querySelectorAll("li")[1]?.firstChild;
    expect(textNode?.nodeType).toBe(Node.TEXT_NODE);

    selectText(textNode as Text, 3, 3);
    fireEvent.mouseUp(editor);
    fireEvent.click(screen.getByRole("button", { name: "Título" }));

    expect(onValueChange).toHaveBeenLastCalledWith(
      "<ul><li>Uno</li></ul><h2>Dos</h2><ul><li>Tres</li></ul>",
    );
  });

  it("toggles a top-level bullet back to paragraph text", async () => {
    const onValueChange = vi.fn();

    render(
      <RichDescriptionEditor
        value="<ul><li>Alpha</li></ul>"
        onValueChange={onValueChange}
      />,
    );

    const editor = screen.getByRole("textbox");
    await waitFor(() => {
      expect(editor.querySelector("li")?.textContent).toBe("Alpha");
    });

    const textNode = editor.querySelector("li")?.firstChild;
    expect(textNode?.nodeType).toBe(Node.TEXT_NODE);

    selectText(textNode as Text, 5, 5);
    fireEvent.mouseUp(editor);
    fireEvent.click(screen.getByRole("button", { name: "Lista" }));

    expect(onValueChange).toHaveBeenLastCalledWith("<p>Alpha</p>");
  });
});
