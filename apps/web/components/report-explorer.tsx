"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ContextHelp } from "@/components/context-help";
import { FinancialValue } from "@/components/financial-value";
import { LedgerPagination } from "@/components/ledger-pagination";
import { ReportPointChart } from "@/components/report-point-chart";
import { buildSparklinePoints } from "@/lib/dashboard-analytics";
import { usePersistedState } from "@/lib/ledger-ui";
import { buildExplorerRecords, exploreRecords, explorerDimensions, explorerModules, explorerRange,
  type ExplorerDimension, type ExplorerMetric, type ExplorerScope } from "@/lib/report-explorer";

type Selection = { preset:string; start:string; end:string; metric:ExplorerMetric; group:ExplorerDimension;
  filters:Partial<Record<ExplorerDimension,string>>; expanded:string; point:string };
const defaults:Selection={preset:"This Week",start:"",end:"",metric:"pnl",group:"provider",filters:{},expanded:"",point:""};
const metrics:Record<ExplorerMetric,string>={pnl:"Realised betting P&L",count:"Activity count",costs:"Cash costs",withdrawals:"Withdrawals"};
export function ReportExplorer({scopes,contextKey,state,scopeLabel}:{scopes:ExplorerScope[];contextKey:string;state:"ready"|"loading"|"error";scopeLabel?:string}) {
  const [stored,setStored]=usePersistedState<Selection>("openforge-report-explorer:"+contextKey,defaults);
  const [groupPage,setGroupPage]=useState(1);
  const [groupPageSize,setGroupPageSize]=useState(16);
  const selection={...defaults,...stored};
  const change=(patch:Partial<Selection>)=>{setStored({...selection,...patch});setGroupPage(1);};
  const rows=useMemo(()=>buildExplorerRecords(scopes),[scopes]);
  const range=explorerRange(selection.preset,new Date(),selection.start,selection.end);
  const output=exploreRecords(rows,selection.metric,range,selection.filters,selection.group);
  const count=selection.metric==="count";
  const unit=selection.filters.module==="sportsbook-bets" ? "Placed sportsbook records" : selection.filters.module==="free-bets" ? "Placed Free Bet records" : "Activities";
  const complete=state==="ready"&&output.valid&&!output.unknown&&!output.undated.length;
  const money=(value:number)=><FinancialValue animate={false} value={value} />;
  const value=(n:number)=>count ? n.toLocaleString("en-GB") : money(n);
  const dates=[...new Set(output.records.flatMap(r=>r.date?[r.date]:[]))].sort();
  const points=dates.map(date=>{const records=output.records.filter(r=>r.date===date);return {key:date,label:date,
    value:records.some(r=>!Number.isFinite(r.value))?NaN:records.reduce((sum,r)=>sum+Math.round(r.value*100),0)/100};});
  const graph=buildSparklinePoints(points,true);
  const pointIndex=Math.max(0,points.findIndex(p=>p.key===selection.point));
  const groupPageCount=Math.max(1,Math.ceil(output.groups.length/groupPageSize));
  const visibleGroups=output.groups.slice((Math.min(groupPage,groupPageCount)-1)*groupPageSize,Math.min(groupPage,groupPageCount)*groupPageSize);
  const expandedRecords=selection.expanded ? output.records.filter(r=>r[selection.group]===selection.expanded) : [];
  return <section className="content-subpanel stack" aria-label="Reports explorer" data-pd-id="reports.explorer">
    <div className="section-heading-row formal-report-section-heading"><h3>Reports explorer <ContextHelp label="About Reports explorer"
      text="Profile performance, not Fund Manager earnings. Realised betting P&L uses authoritative settled results once; funding, balances and History are excluded. Cash costs and withdrawals are separate signed metrics. Counts include operational records, excluding prospecting, unplaced rewards and Void. The date is the existing reporting date, not independently recorded placement time. Missing dates or results make totals incomplete." /></h3></div>
    <p className="field-hint">Scope: {scopeLabel ?? (scopes.map(s=>s.label).join(", ")||"No Profiles selected")}. Reporting dates · Europe/London · {range.start??"Choose start"} to {range.end??"choose end"}.</p>
    <div className="form-grid">
      <label className="field-control"><span>Explorer range</span><select aria-label="Explorer range" value={selection.preset} onChange={e=>change({preset:e.target.value})}>{["Today","This Week","This Month","Custom"].map(p=><option key={p}>{p}</option>)}</select></label>
      {selection.preset==="Custom" ? <><label className="field-control"><span>Explorer start</span><input aria-label="Explorer start" type="date" value={selection.start} onChange={e=>change({start:e.target.value})}/></label><label className="field-control"><span>Explorer end</span><input aria-label="Explorer end" type="date" value={selection.end} onChange={e=>change({end:e.target.value})}/></label></> : null}
      <label className="field-control"><span>Metric</span><select aria-label="Explorer metric" value={selection.metric} onChange={e=>change({metric:e.target.value as ExplorerMetric})}>{Object.entries(metrics).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
      <label className="field-control"><span>Group by</span><select aria-label="Explorer group by" value={selection.group} onChange={e=>change({group:e.target.value as ExplorerDimension,expanded:""})}>{Object.entries(explorerDimensions).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
      {(Object.keys(explorerDimensions) as ExplorerDimension[]).map(key=><label key={key} className="field-control"><span>{explorerDimensions[key]}</span><select aria-label={`Explorer ${explorerDimensions[key]}`} value={selection.filters[key]??""} onChange={e=>change({filters:{...selection.filters,[key]:e.target.value},expanded:""})}><option value="">All</option>{[...new Set(rows.map(r=>r[key]))].sort().map(v=><option key={v} value={v}>{key==="module"?explorerModules[v]:v}</option>)}</select></label>)}
    </div>
    <p className="field-hint">{count ? `${unit}, counted once by reporting date. Exact historical placement-date counts are unavailable where no placement date was recorded.` : "Settled results retain actual commission and costs already included in the record. No additional management-fee deduction is made here."}</p>
    <dl className="dashboard-focus-list"><div><dt>{count?unit:metrics[selection.metric]}</dt><dd data-pd-id="reports.explorer.total">{state!=="ready" ? state==="loading"?"Loading…":"Unavailable — selected Profile data failed" : !output.valid ? "Choose a valid range" : complete ? value(output.known) : "Incomplete"}</dd></div></dl>
    {state==="ready"&&output.valid&&!complete ? <p role="status">Known subtotal: {value(output.known)}. {output.unknown} unavailable results; {output.undated.length} undated candidate records. These are not a complete selected-range total.</p> : null}
    {state==="ready"&&output.valid ? <>
      <LedgerPagination ariaLabel="Explorer Groups" currentPage={Math.min(groupPage,groupPageCount)} onPageChange={setGroupPage}
        onPageSizeChange={(size)=>{setGroupPageSize(size);setGroupPage(1);}} pageCount={groupPageCount} pageSize={groupPageSize}
        position="top" totalRows={output.groups.length} />
      <div className="table-scroll"><table className="data-table"><caption>{explorerDimensions[selection.group]} · {count?unit:metrics[selection.metric]}</caption><thead><tr><th>Group</th><th className="align-end">{count?unit:metrics[selection.metric]}</th><th>Source records</th></tr></thead><tbody>
        {visibleGroups.map(g=><tr key={g.key}><td>{selection.group==="module"?explorerModules[g.key]:g.key}</td><td className="align-end">{g.unknown ? <>Incomplete · known {value(g.known)}</> : value(g.known)}</td><td><button type="button" className="button-link" aria-expanded={selection.expanded===g.key} aria-label={`Inspect ${g.key} records`} onClick={()=>change({expanded:selection.expanded===g.key?"":g.key})}>Inspect {g.count} records</button></td></tr>)}
        {!output.groups.length ? <tr><td colSpan={3}>No dated records in this scope.</td></tr> : null}
      </tbody></table></div>
      <LedgerPagination ariaLabel="Explorer Groups" currentPage={Math.min(groupPage,groupPageCount)} onPageChange={setGroupPage}
        onPageSizeChange={(size)=>{setGroupPageSize(size);setGroupPage(1);}} pageCount={groupPageCount} pageSize={groupPageSize}
        position="bottom" totalRows={output.groups.length} />
      {selection.expanded ? <div className="stack" data-pd-id="reports.explorer.sources"><h4>Source records · {selection.expanded}</h4><ul>{expandedRecords.slice(0,32).map(r=><li key={`${r.profileId}:${r.module}:${r.id}`}><Link href={`/profiles/${r.profileId}/tracker/${r.module}?search=${encodeURIComponent(r.id)}&source=report-explorer`}>{r.profileLabel} · {r.label} · {r.date}</Link>{!count?<> · {money(r.value)}</>:null}</li>)}</ul>{expandedRecords.length>32?<p className="field-hint">Showing 32 of {expandedRecords.length} records. Narrow the canonical filters to inspect a smaller set.</p>:null}</div> : null}
      {output.undated.length ? <details><summary>Inspect undated candidates ({output.undated.length})</summary><ul>{output.undated.slice(0,32).map(r=><li key={`${r.profileId}:${r.module}:${r.id}`}><Link href={`/profiles/${r.profileId}/tracker/${r.module}?search=${encodeURIComponent(r.id)}&source=report-explorer`}>{r.profileLabel} · {r.label} · reporting date not recorded</Link></li>)}</ul>{output.undated.length>32?<p className="field-hint">Showing 32 of {output.undated.length} undated candidates. Narrow the canonical filters to inspect a smaller set.</p>:null}</details>:null}
      {!count&&points.length ? <ReportPointChart area={graph.area} line={graph.line} zeroY={graph.zeroY} label="Explorer daily values" points={points} selectedIndex={pointIndex} onSelect={i=>change({point:points[i].key})}/> : null}
    </>:null}
  </section>;
}
