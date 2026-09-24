import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { FinancialReadValue } from "../components/financial-read-value";
vi.mock("../components/financial-motion-preference", () => ({ useFinancialMotionPreference: () => ({ enabled: false, ready: true, reducedMotion: false, replayDelayMs: 1500, durationMs: 520, staggerMs: 80 }) }));
let element: HTMLDivElement, root: Root;
beforeEach(() => { vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); element=document.createElement("div"); document.body.append(element); root=createRoot(element); });
afterEach(() => { act(() => root.unmount()); element.remove(); vi.unstubAllGlobals(); });
function render(state: "loading"|"ready"|"error", value: number|string) { act(() => root.render(createElement(FinancialReadValue,{state,subject:"Balance",value}))); }
it.each(["loading","error"] as const)("does not fabricate a financial result for %s",state => { render(state,0); expect(element.querySelector(".financial-value")).toBeNull(); expect(element.textContent).toBe(state==="loading"?"Loading Balance…":"Balance unavailable"); });
it("keeps known zero distinct from unavailable upstream money",() => { render("ready",0);expect(element.querySelector(".financial-value")?.getAttribute("aria-label")).toBe("£ -");render("ready",NaN);expect(element.querySelector(".financial-value")?.getAttribute("aria-label")).toBe("Unavailable"); });
it("preserves the same confirmed value node on unrelated readiness rerenders",() => { render("ready",-14.01);const node=element.querySelector(".financial-value");render("ready",-14.01);expect(element.querySelector(".financial-value")).toBe(node);expect(node?.getAttribute("aria-label")).toBe("£ (14.01)");expect(node?.getAttribute("aria-live")).toBeNull(); });
