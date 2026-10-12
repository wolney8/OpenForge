import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BettingPnlReadValue } from "../components/betting-pnl-read-value";

const render = (state:"loading"|"ready"|"error", activityCount:number, value:number) =>
  renderToStaticMarkup(createElement(BettingPnlReadValue,{state,activityCount,value}));

describe("Gross betting P&L readiness",()=>{
  it("shows an explicit zero only for a successfully loaded empty range",()=>expect(render("ready",0,Number.NaN)).toContain("No betting activity in this range"));
  it("keeps malformed activity unavailable",()=>expect(render("ready",1,Number.NaN)).toContain("inspect affected betting records"));
  it("keeps source failures unavailable",()=>expect(render("error",0,0)).toContain("data could not be loaded"));
});
