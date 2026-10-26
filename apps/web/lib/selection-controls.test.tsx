// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PresetSelect, SearchableCombobox, type OptionListMode } from "@/components/selection-controls";

const options = [
  { id: "william-hill", name: "William Hill" },
  { id: "betfred", name: "Betfred" },
  { id: "888sport", name: "888sport" },
];

let container: HTMLDivElement;
let root: Root;

function click(element: Element) {
  act(() => (element as HTMLElement).click());
}

function type(input: HTMLInputElement, value: string) {
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function key(element: Element, value: string) {
  act(() => element.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: value })));
}

function SearchHarness() {
  const [mode, setMode] = useState<OptionListMode>("CLOSED");
  const [values, setValues] = useState<string[]>([]);
  return <SearchableCombobox id="test-bookmaker" label="Bookmakers" mode={mode} onChange={setValues} onModeChange={setMode} options={options} values={values} />;
}

function PresetHarness() {
  const [parentOpen, setParentOpen] = useState(true);
  const [childOpen, setChildOpen] = useState(false);
  const [value, setValue] = useState<"ALL" | "CUSTOM">("ALL");
  return parentOpen ? <section aria-label="Parent filters" onKeyDown={(event) => { if (event.key === "Escape") setParentOpen(false); }}>
    <PresetSelect groups={[{ label: null, options: [["ALL", "Any time"]] }, { label: "Custom", options: [["CUSTOM", "Custom range"]] }]} id="test-preset" label="Event start time" onChange={setValue} onOpenChange={setChildOpen} open={childOpen} value={value} />
    {value === "CUSTOM" ? <label>From<input type="datetime-local" /></label> : null}
  </section> : <p>Parent closed</p>;
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("SearchableCombobox interaction contract", () => {
  it("distinguishes closed, search-results and show-all states", () => {
    act(() => root.render(<SearchHarness />));
    const input = container.querySelector<HTMLInputElement>('[role="combobox"]')!;
    expect(input.getAttribute("aria-expanded")).toBe("false");
    act(() => input.focus());
    expect(container.querySelector('[role="listbox"]')).toBeNull();

    type(input, "will");
    expect(input.getAttribute("aria-expanded")).toBe("true");
    expect(container.textContent).toContain("William Hill");
    expect(container.textContent).not.toContain("Betfred");

    type(input, "missing");
    expect(container.textContent).toContain("No matches");
    type(input, "");
    expect(container.querySelector('[role="listbox"]')).toBeNull();

    const arrow = container.querySelector('[aria-label="Show all bookmakers options"]')!;
    click(arrow);
    expect(container.querySelectorAll('[role="option"]')).toHaveLength(3);
    click(container.querySelector('[aria-label="Close bookmakers options"]')!);
    expect(container.querySelector('[role="listbox"]')).toBeNull();
  });

  it("closes after selection and keeps removal, clear and Backspace closed", () => {
    act(() => root.render(<SearchHarness />));
    const input = container.querySelector<HTMLInputElement>('[role="combobox"]')!;
    act(() => input.focus());
    type(input, "will");
    click(container.querySelector('[role="option"]')!);
    expect(container.textContent).toContain("William Hill");
    expect(container.querySelector('[role="listbox"]')).toBeNull();

    click(container.querySelector('[aria-label="Show all bookmakers options"]')!);
    click(container.querySelector('[role="option"][aria-selected="true"]')!);
    expect(container.querySelectorAll('[aria-label="Remove William Hill"]')).toHaveLength(1);
    expect(container.querySelector('[role="listbox"]')).toBeNull();

    click(container.querySelector('[aria-label="Remove William Hill"]')!);
    expect(container.querySelector('[role="listbox"]')).toBeNull();
    type(input, "bet");
    key(input, "Enter");
    expect(container.textContent).toContain("Betfred");
    expect(container.querySelector('[role="listbox"]')).toBeNull();
    key(input, "Backspace");
    expect(container.textContent).not.toContain("Betfred");
    expect(container.querySelector('[role="listbox"]')).toBeNull();

    type(input, "888");
    key(input, "Enter");
    click(container.querySelector('[aria-label="Clear all bookmakers"]')!);
    expect(container.querySelector('[role="listbox"]')).toBeNull();
  });

  it("closes an open list on Escape without trapping focus", () => {
    act(() => root.render(<SearchHarness />));
    const input = container.querySelector<HTMLInputElement>('[role="combobox"]')!;
    act(() => input.focus());
    type(input, "will");
    key(input, "Escape");
    expect(input.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(input);
  });
});

describe("PresetSelect nested closing contract", () => {
  it("opens only explicitly, closes after selection and keeps the parent open", () => {
    act(() => root.render(<PresetHarness />));
    const trigger = container.querySelector('[role="combobox"]')!;
    expect(container.querySelector('[role="listbox"]')).toBeNull();
    click(trigger);
    expect(container.querySelector('[role="listbox"]')).not.toBeNull();
    click(Array.from(container.querySelectorAll('[role="option"]')).find((option) => option.textContent?.includes("Custom range"))!);
    expect(container.querySelector('[role="listbox"]')).toBeNull();
    expect(container.textContent).toContain("From");
    expect(container.querySelector('[aria-label="Parent filters"]')).not.toBeNull();
  });

  it("gives Escape to the child before the parent", () => {
    act(() => root.render(<PresetHarness />));
    const trigger = container.querySelector('[role="combobox"]')!;
    click(trigger);
    key(trigger, "Escape");
    expect(container.querySelector('[role="listbox"]')).toBeNull();
    expect(container.querySelector('[aria-label="Parent filters"]')).not.toBeNull();
    key(container.querySelector('[aria-label="Parent filters"]')!, "Escape");
    expect(container.textContent).toContain("Parent closed");
  });
});
