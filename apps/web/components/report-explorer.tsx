"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ContextHelp } from "@/components/context-help";
import { FinancialValue } from "@/components/financial-value";
import { LedgerPagination } from "@/components/ledger-pagination";
import { ReportPointChart } from "@/components/report-point-chart";
import { buildSparklinePoints } from "@/lib/dashboard-analytics";
import { usePersistedState } from "@/lib/ledger-ui";
import {
  buildExplorerRecords, exploreRecords, explorerDimensions, explorerModules, explorerRange,
  explorerRecipes, explorerSelectionMatchesRecipe, normalizeExplorerFilters,
  type ExplorerDatePreset, type ExplorerDimension, type ExplorerFilters, type ExplorerMetric,
  type ExplorerScope,
} from "@/lib/report-explorer";

type Selection = { preset:ExplorerDatePreset; start:string; end:string; metric:ExplorerMetric;
  group:ExplorerDimension; filters:ExplorerFilters; expanded:string; point:string };
const defaults:Selection={preset:"This Week",start:"",end:"",metric:"pnl",group:"provider",filters:{},expanded:"",point:""};
const metrics:Record<ExplorerMetric,string>={pnl:"Realised betting P&L",count:"Activity count",costs:"Cash costs",withdrawals:"Withdrawals"};
const datePresets:ExplorerDatePreset[]=["Today","This Week","Last Week","This Month","Last Month","Custom"];
const boundedPage=(page:number,count:number)=>Math.min(Math.max(1,page),Math.max(1,count));

export function ReportExplorer({scopes,contextKey,state,scopeLabel}:{scopes:ExplorerScope[];contextKey:string;state:"ready"|"loading"|"error";scopeLabel?:string}) {
  const [stored,setStored]=usePersistedState<Selection>("openforge-report-explorer:"+contextKey,defaults);
  const [groupPage,setGroupPage]=useState(1),[groupPageSize,setGroupPageSize]=useState(16);
  const [recordPage,setRecordPage]=useState(1),[recordPageSize,setRecordPageSize]=useState(16);
  const [undatedPage,setUndatedPage]=useState(1),[undatedPageSize,setUndatedPageSize]=useState(16);
  const rawPreset=stored?.preset;
  const selection:Selection={...defaults,...stored,
    preset:datePresets.includes(rawPreset as ExplorerDatePreset)?rawPreset as ExplorerDatePreset:defaults.preset,
    filters:normalizeExplorerFilters(stored?.filters)};
  const resetPages=()=>{setGroupPage(1);setRecordPage(1);setUndatedPage(1);};
  const change=(patch:Partial<Selection>)=>{setStored({...selection,...patch});resetPages();};
  const rows=useMemo(()=>buildExplorerRecords(scopes),[scopes]);
  const range=explorerRange(selection.preset,new Date(),selection.start,selection.end);
  const output=exploreRecords(rows,selection.metric,range,selection.filters,selection.group);
  const count=selection.metric==="count";
  const unit=selection.filters.module?.includes("sportsbook-bets")?"Placed sportsbook records":selection.filters.module?.includes("free-bets")?"Placed Free Bet records":"Activities";
  const complete=state==="ready"&&output.valid&&!output.unknown&&!output.undated.length;
  const money=(amount:number)=><FinancialValue animate={false} value={amount}/>;
  const value=(amount:number)=>count?amount.toLocaleString("en-GB"):money(amount);
  const dates=[...new Set(output.eligibleRecords.flatMap(record=>record.date?[record.date]:[]))].sort();
  const points=dates.map(date=>{const records=output.eligibleRecords.filter(record=>record.date===date);return {key:date,label:date,
    value:records.some(record=>!Number.isFinite(record.value))?Number.NaN:records.reduce((sum,record)=>sum+Math.round(record.value*100),0)/100};});
  const graph=buildSparklinePoints(points,true),pointIndex=Math.max(0,points.findIndex(point=>point.key===selection.point));
  const groupPageCount=Math.max(1,Math.ceil(output.groups.length/groupPageSize));
  const visibleGroups=output.groups.slice((boundedPage(groupPage,groupPageCount)-1)*groupPageSize,boundedPage(groupPage,groupPageCount)*groupPageSize);
  const matchingRecords=selection.expanded?output.records.filter(record=>record[selection.group]===selection.expanded):output.records;
  const recordPageCount=Math.max(1,Math.ceil(matchingRecords.length/recordPageSize));
  const visibleRecords=matchingRecords.slice((boundedPage(recordPage,recordPageCount)-1)*recordPageSize,boundedPage(recordPage,recordPageCount)*recordPageSize);
  const undatedPageCount=Math.max(1,Math.ceil(output.undated.length/undatedPageSize));
  const visibleUndated=output.undated.slice((boundedPage(undatedPage,undatedPageCount)-1)*undatedPageSize,boundedPage(undatedPage,undatedPageCount)*undatedPageSize);
  const activeRecipe=explorerRecipes.find(recipe=>explorerSelectionMatchesRecipe(selection,recipe));
  const activeFilterEntries=(Object.keys(explorerDimensions) as ExplorerDimension[]).flatMap(dimension=>(selection.filters[dimension]??[]).map(filterValue=>({dimension,filterValue})));
  const toggleFilter=(dimension:ExplorerDimension,filterValue:string)=>{const current=selection.filters[dimension]??[];
    const next=current.includes(filterValue)?current.filter(value=>value!==filterValue):[...current,filterValue];
    change({filters:{...selection.filters,[dimension]:next},expanded:"",point:""});};
  const applyRecipe=(recipe:(typeof explorerRecipes)[number])=>change({preset:recipe.preset,start:"",end:"",filters:recipe.filters,expanded:"",point:""});
  const resetFilters=()=>change({...defaults,filters:{},expanded:"",point:""});

  return <section className="content-subpanel stack" aria-label="Reports Explorer" data-pd-id="reports.explorer">
    <div className="section-heading-row formal-report-section-heading"><h3>Trend And Activity Explorer <ContextHelp label="About Trend And Activity Explorer"
      text="Profile performance, not Fund Manager earnings. Realised betting P&L uses authoritative settled results once; funding, balances and History are excluded. Matching records can include open activity without treating it as realised profit. Cash costs and withdrawals are separate signed metrics. The date is the existing reporting date, not independently recorded placement time. Missing dates or results make totals incomplete."/></h3></div>
    <p className="field-hint">Scope: {scopeLabel??(scopes.map(scope=>scope.label).join(", ")||"No Profiles selected")}. Reporting dates · Europe/London · {range.start??"Choose start"} to {range.end??"choose end"}.</p>
    <div className="report-filter-chip-groups">
      <div aria-label="Explorer date range" className="filter-chip-list" role="group"><span className="filter-chip-label">Date</span>
        {datePresets.map(preset=><button aria-pressed={selection.preset===preset} className={`filter-chip${selection.preset===preset?" is-active":""}`}
          data-pd-id={`reports.explorer.date.${preset.toLowerCase().replaceAll(" ","-")}`} key={preset} onClick={()=>change({preset,point:""})} type="button">{preset==="This Week"?"This week":preset==="Last Week"?"Last week":preset==="This Month"?"This month":preset==="Last Month"?"Last month":preset}</button>)}
      </div>
      <div aria-label="Named report recipes" className="filter-chip-list" role="group"><span className="filter-chip-label">Recipes</span>
        {explorerRecipes.map(recipe=><button aria-pressed={activeRecipe?.id===recipe.id} className={`filter-chip${activeRecipe?.id===recipe.id?" is-active":""}`}
          data-pd-id={`reports.explorer.recipe.${recipe.id}`} key={recipe.id} onClick={()=>applyRecipe(recipe)} type="button">{recipe.label}</button>)}
      </div>
    </div>
    {selection.preset==="Custom"?<div className="compact-report-controls">
      <label className="m3-picker-field"><span className="m3-picker-label">Explorer start</span><span className="m3-picker-control"><span aria-hidden="true" className="material-symbols-outlined">date_range</span><input aria-label="Explorer start" type="date" value={selection.start} onChange={event=>change({start:event.target.value,point:""})}/></span></label>
      <label className="m3-picker-field"><span className="m3-picker-label">Explorer end</span><span className="m3-picker-control"><span aria-hidden="true" className="material-symbols-outlined">date_range</span><input aria-label="Explorer end" type="date" value={selection.end} onChange={event=>change({end:event.target.value,point:""})}/></span></label>
    </div>:null}
    <div className="compact-report-controls">
      <label className="m3-picker-field"><span className="m3-picker-label">Metric</span><span className="m3-picker-control"><span aria-hidden="true" className="material-symbols-outlined">monitoring</span><select aria-label="Explorer metric" value={selection.metric} onChange={event=>change({metric:event.target.value as ExplorerMetric,point:""})}>{Object.entries(metrics).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></span></label>
      <label className="m3-picker-field"><span className="m3-picker-label">Group by</span><span className="m3-picker-control"><span aria-hidden="true" className="material-symbols-outlined">group_work</span><select aria-label="Explorer group by" value={selection.group} onChange={event=>change({group:event.target.value as ExplorerDimension,expanded:""})}>{Object.entries(explorerDimensions).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></span></label>
    </div>
    <div className="active-filter-summary" data-pd-id="reports.explorer.active-filters"><strong>Active Filters</strong><span>{selection.preset}{activeRecipe?` · ${activeRecipe.label}`:""}</span>
      {activeFilterEntries.map(({dimension,filterValue})=><span className="table-chip" key={`${dimension}:${filterValue}`}>{explorerDimensions[dimension]}: {dimension==="module"?explorerModules[filterValue]:filterValue}</span>)}
      <button className="button-link" data-pd-id="reports.explorer.reset" onClick={resetFilters} type="button">Reset Filters</button>
    </div>
    <details className="report-filter-disclosure"><summary>Additional Filters</summary><div className="report-multi-filter-grid">
      {(Object.keys(explorerDimensions) as ExplorerDimension[]).map(dimension=><fieldset key={dimension}><legend>{explorerDimensions[dimension]}</legend>
        {[...new Set(rows.map(row=>row[dimension]))].sort().map(filterValue=><label className="filter-checkbox" key={filterValue}><input checked={(selection.filters[dimension]??[]).includes(filterValue)} onChange={()=>toggleFilter(dimension,filterValue)} type="checkbox"/><span>{dimension==="module"?explorerModules[filterValue]:filterValue}</span></label>)}
      </fieldset>)}</div></details>
    <p className="field-hint">{count?`${unit}, counted once by reporting date. Exact historical placement-date counts are unavailable where no placement date was recorded.`:"Matching records and the aggregate use the same selected range and filters. Only eligible realised results contribute to realised P&L; Placed records remain visible without becoming settled profit."}</p>
    <dl className="dashboard-focus-list"><div><dt>{count?unit:metrics[selection.metric]}</dt><dd data-pd-id="reports.explorer.total">{state!=="ready"?state==="loading"?"Loading…":"Unavailable — selected Profile data failed":!output.valid?"Choose a valid range":complete?value(output.known):"Incomplete"}</dd></div><div><dt>Matching Records</dt><dd data-pd-id="reports.explorer.match-count">{state==="ready"&&output.valid?output.records.length:"—"}</dd></div></dl>
    {state==="ready"&&output.valid&&!complete?<p role="status">Known subtotal: {value(output.known)}. {output.unknown} unavailable eligible {output.unknown===1?"result":"results"}; {output.undated.length} undated candidate {output.undated.length===1?"record":"records"}. These are not a complete selected-range total.</p>:null}
    {state==="ready"&&output.valid?<>
      <LedgerPagination ariaLabel="Explorer Groups" currentPage={boundedPage(groupPage,groupPageCount)} onPageChange={setGroupPage} onPageSizeChange={size=>{setGroupPageSize(size);setGroupPage(1);}} pageCount={groupPageCount} pageSize={groupPageSize} position="top" totalRows={output.groups.length}/>
      <div className="table-shell"><table className="data-table"><caption>{explorerDimensions[selection.group]} · {count?unit:metrics[selection.metric]}</caption><thead><tr><th scope="col">Group</th><th className="align-end" scope="col">{count?unit:metrics[selection.metric]}</th><th scope="col">Matching Records</th></tr></thead><tbody>
        {visibleGroups.map(group=><tr key={group.key}><td>{selection.group==="module"?explorerModules[group.key]:group.key}</td><td className="align-end">{group.unknown?<>Incomplete · known {value(group.known)}</>:value(group.known)}</td><td><button type="button" className="button-link" aria-expanded={selection.expanded===group.key} aria-label={`Inspect ${group.key} records`} onClick={()=>change({expanded:selection.expanded===group.key?"":group.key})}>Inspect {group.records.length} records</button></td></tr>)}
        {!output.groups.length?<tr><td colSpan={3}>No dated records match this scope and filter.</td></tr>:null}
      </tbody></table></div>
      <LedgerPagination ariaLabel="Explorer Groups" currentPage={boundedPage(groupPage,groupPageCount)} onPageChange={setGroupPage} onPageSizeChange={size=>{setGroupPageSize(size);setGroupPage(1);}} pageCount={groupPageCount} pageSize={groupPageSize} position="bottom" totalRows={output.groups.length}/>
      <section className="stack" data-pd-id="reports.explorer.sources"><div className="section-heading-row"><h4>Matching Records{selection.expanded?` · ${selection.group==="module"?explorerModules[selection.expanded]:selection.expanded}`:""}</h4>{selection.expanded?<button className="button-link" onClick={()=>change({expanded:""})} type="button">Show All Matching Records</button>:null}</div>
        <LedgerPagination ariaLabel="Explorer Matching Records" currentPage={boundedPage(recordPage,recordPageCount)} onPageChange={setRecordPage} onPageSizeChange={size=>{setRecordPageSize(size);setRecordPage(1);}} pageCount={recordPageCount} pageSize={recordPageSize} position="top" totalRows={matchingRecords.length}/>
        <div className="table-shell"><table><thead><tr><th scope="col">Record</th><th scope="col">Profile</th><th scope="col">Module</th><th scope="col">Status</th><th scope="col">Reporting Date</th><th scope="col">Value</th></tr></thead><tbody>
          {visibleRecords.map(record=><tr key={`${record.profileId}:${record.module}:${record.id}`} data-pd-id={`reports.explorer.record.${record.id}`}><td><Link href={`/profiles/${record.profileId}/tracker/${record.module}?search=${encodeURIComponent(record.id)}&source=report-explorer`}>{record.label}</Link></td><td>{record.profileLabel}</td><td>{explorerModules[record.module]}</td><td>{record.status}</td><td>{record.date}</td><td>{Number.isFinite(record.value)?money(record.value):"Unavailable"}</td></tr>)}
          {!matchingRecords.length?<tr><td colSpan={6}>No dated records match this scope and filter.</td></tr>:null}
        </tbody></table></div>
        <LedgerPagination ariaLabel="Explorer Matching Records" currentPage={boundedPage(recordPage,recordPageCount)} onPageChange={setRecordPage} onPageSizeChange={size=>{setRecordPageSize(size);setRecordPage(1);}} pageCount={recordPageCount} pageSize={recordPageSize} position="bottom" totalRows={matchingRecords.length}/>
      </section>
      {output.undated.length?<details><summary>Inspect Undated Candidates ({output.undated.length})</summary><div className="stack"><LedgerPagination ariaLabel="Explorer Undated Records" currentPage={boundedPage(undatedPage,undatedPageCount)} onPageChange={setUndatedPage} onPageSizeChange={size=>{setUndatedPageSize(size);setUndatedPage(1);}} pageCount={undatedPageCount} pageSize={undatedPageSize} position="top" totalRows={output.undated.length}/><ul>{visibleUndated.map(record=><li key={`${record.profileId}:${record.module}:${record.id}`}><Link href={`/profiles/${record.profileId}/tracker/${record.module}?search=${encodeURIComponent(record.id)}&source=report-explorer`}>{record.profileLabel} · {record.label} · reporting date not recorded</Link></li>)}</ul><LedgerPagination ariaLabel="Explorer Undated Records" currentPage={boundedPage(undatedPage,undatedPageCount)} onPageChange={setUndatedPage} onPageSizeChange={size=>{setUndatedPageSize(size);setUndatedPage(1);}} pageCount={undatedPageCount} pageSize={undatedPageSize} position="bottom" totalRows={output.undated.length}/></div></details>:null}
      {!count&&points.length?<ReportPointChart area={graph.area} line={graph.line} zeroY={graph.zeroY} label="Explorer daily values" points={points} selectedIndex={pointIndex} onSelect={index=>change({point:points[index].key})}/>:null}
    </>:null}
  </section>;
}
