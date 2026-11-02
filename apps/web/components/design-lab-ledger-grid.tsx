"use client";

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { DesignLabSelect } from "@/components/design-lab-select";
import { SearchableCombobox, type OptionListMode } from "@/components/selection-controls";
import { labLedgerColumns, labLedgerColumnSpecs, labRecordInputs, type LabLedgerKey, type LabRecord } from "@/lib/design-lab-connected-data";
import { labProfiles, type LabAccount, type LabScope } from "@/lib/design-lab-fixture";
import styles from "./design-lab-connected.module.css";

type Sort = { column: number | null; direction: "asc" | "desc" };
export type LabLedgerView = {
  filter: string;
  status: string;
  profile: string;
  advanced: { bookmaker: string; strategy: string; lay: string; back: string };
  columnFilters: Record<string,string>;
  missing: "All readiness" | "Missing fields" | "Financial unavailable";
  dateFrom: string;
  dateTo: string;
  sort: Sort;
  order: number[];
  widths: Record<number, number>;
  hidden: number[];
};
export type LabEditableBet = {
  event: string; eventDate: string; offerName: string; offerText: string; bookmaker: string;
  exchange: string; strategy: string; backStake: string; backOdds: string; layOdds: string;
  requestedLayStake: string; matchedLayStake: string; commission: string;
};
export type LabLedgerRow = LabRecord & { onOpen: () => void };

const defaults = [106, 122, 190, 134, 158, 102, 125, 125, 132, 104, 76];
const relevantFilters: Record<LabLedgerKey, readonly string[]> = {
  accounts: ["type","status","counts_in_cash_total"],
  sportsbook: ["bookmaker","match_strategy","lay_status","back_bet_status"],
  freeBets: ["bookmaker","match_strategy","lay_status","status"],
  casino: ["bookmaker","offer_type","status","result"],
  extraPlace: ["bookmaker","terms"],
  cash: ["direction","adjustment_type","linked_account","calculation_state"],
};
export function defaultLabLedgerView(key: LabLedgerKey): LabLedgerView {
  return {
    filter: "", status: "All statuses", profile: "All Profiles",
    advanced: { bookmaker: "Any bookmaker", strategy: "Any strategy", lay: "Any lay state", back: "Any back state" },
    columnFilters: {}, missing: "All readiness", dateFrom: "", dateTo: "",
    sort: { column: null, direction: "asc" },
    order: labLedgerColumns[key].map((_, index) => index), widths: {}, hidden: [],
  };
}

function numericValue(value: string): number | null {
  if (!value || /unknown|unavailable|planning|^—$|£—/i.test(value)) return null;
  const cleaned = value.replace(/current|final|settled/gi, "").replace(/[£,%\s]/g, "").replace(/[()]/g, "");
  if (!/^-?\d+(?:\.\d+)?$/.test(cleaned)) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? (value.includes("(") ? -Math.abs(parsed) : parsed) : null;
}
function financeTone(value: string): string {
  const amount = numericValue(value);
  return amount === null || amount === 0 ? "" : amount < 0 ? styles.negative : styles.positive;
}
function sortableValue(value: string, label: string, kind?: string): string | number | null {
  if (value === "—" || /unknown|unavailable|not entered/i.test(value)) return null;
  if (kind === "date" || /date|settles|expiry/i.test(label)) { const date = Date.parse(value.split("·")[0].trim()); return Number.isFinite(date) ? date : null; }
  if (kind === "money" || kind === "odds" || /value|balance|amount|odds|stake|liability|rating/i.test(label)) return numericValue(value);
  if (/^status$/i.test(label)) return ({ Prospecting: 0, Placed: 1, Pending: 2, Settled: 3 } as Record<string, number>)[value] ?? value;
  return value.toLocaleLowerCase();
}
function calendarDate(value: string): string | null {
  const iso = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
  if (iso) return iso[1];
  const parts = /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/.exec(value.trim());
  if (!parts) return null;
  const month = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].findIndex(item => item.toLowerCase() === parts[2].toLowerCase());
  return month < 0 ? null : `${parts[3]}-${String(month+1).padStart(2,"0")}-${parts[1].padStart(2,"0")}`;
}
function validMoney(value: string, allowZero = false) {
  return /^\d+(?:\.\d{1,2})?$/.test(value) && Number(value) >= (allowZero ? 0 : 0.01);
}
export function validLabDateInput(value: string, requireTime = false) {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/.exec(value);
  if (!match || (requireTime && match[4] === undefined)) return false;
  const [year,month,day] = match.slice(1,4).map(Number);
  const date = new Date(Date.UTC(year,month-1,day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month-1 && date.getUTCDate() === day
    && (match[4] === undefined || (Number(match[4]) < 24 && Number(match[5]) < 60));
}
function urgencyCue(row: LabRecord): string | null {
  const today = Date.parse("2026-11-02");
  if (row.section === "freeBets" && row.status === "Available" && row.expiresAt && Date.parse(row.expiresAt) <= today) return "Expiry Today";
  if (row.section === "sportsbook" && /partial/i.test(row.cells[6] ?? "")) return "Partial Lay Review";
  if (row.section === "sportsbook" && row.status === "Placed" && row.dueDate && Date.parse(row.dueDate) < today) return "Event Passed";
  return null;
}

export function DesignLabLedgerGrid({ ledgerKey, rows, scope, accounts, view, onViewChange, savedView, onSaveView, onOpenEntry, onOpenConcept, onOpenBalance, onOpenReview, inputOverrides, bet, onBetChange, onRowPatch, betState, onRequestPlacement, scrollPosition, onScrollPosition }: {
  ledgerKey: LabLedgerKey;
  rows: LabLedgerRow[];
  scope: LabScope;
  accounts: LabAccount[];
  view: LabLedgerView;
  onViewChange: (next: LabLedgerView) => void;
  savedView: { section: LabLedgerKey; view: LabLedgerView } | null;
  onSaveView: (next: { section: LabLedgerKey; view: LabLedgerView }) => void;
  onOpenEntry: (mode: "modal" | "page") => void;
  onOpenConcept: () => void;
  onOpenBalance: (id: string) => void;
  bet: LabEditableBet;
  onBetChange: (patch: Partial<LabEditableBet>) => void;
  onRowPatch: (id:string,column:number,value:string,source?:Record<string,string>) => void;
  onOpenReview: (row:LabLedgerRow,column:number) => void;
  inputOverrides: Record<string,Record<string,string>>;
  betState: string;
  onRequestPlacement: () => void;
  scrollPosition: { left: number; top: number };
  onScrollPosition: (position: { left: number; top: number }) => void;
}) {
  const columns = labLedgerColumns[ledgerKey];
  const specs = labLedgerColumnSpecs(ledgerKey);
  const actionIndex = columns.length - 1;
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [mobileDetail, setMobileDetail] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{ id: string; column: number } | null>(null);
  const [editing, setEditing] = useState<{ id: string; column: number; value: string; draft?: Partial<LabEditableBet> } | null>(null);
  const [cellError, setCellError] = useState("");
  const [editGate, setEditGate] = useState<{ id:string; message:string } | null>(null);
  const [accountOptionMode, setAccountOptionMode] = useState<OptionListMode>("CLOSED");
  const [dropBefore, setDropBefore] = useState<number | null>(null);
  const pointer = useRef<{ mode: "resize" | "reorder"; index: number; startX: number; width: number } | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const pan = useRef<{x:number;left:number;active:boolean;button:number} | null>(null);
  const suppressPanClick = useRef(false);
  const cellRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const clearOutsidePan = () => { pan.current = null; };
    document.addEventListener("pointerup", clearOutsidePan);
    document.addEventListener("pointercancel", clearOutsidePan);
    return () => { document.removeEventListener("pointerup", clearOutsidePan); document.removeEventListener("pointercancel", clearOutsidePan); };
  }, []);
  const update = (patch: Partial<LabLedgerView>) => onViewChange({ ...view, ...patch });
  const width = (index: number) => index === actionIndex ? 76 : view.widths[index] ?? (ledgerKey === "sportsbook" ? defaults[index] : 145);
  const active = [view.filter.trim(), view.status !== "All statuses", view.profile !== "All Profiles", ...Object.values(view.advanced).map(value => !value.startsWith("Any ")), ...Object.values(view.columnFilters).map(Boolean), view.missing !== "All readiness", view.dateFrom, view.dateTo].filter(Boolean).length;
  const clearFilters = () => update({ ...defaultLabLedgerView(ledgerKey), sort:view.sort, order:view.order, widths:view.widths, hidden:view.hidden });

  useEffect(() => { if (scroller.current) { scroller.current.scrollLeft = scrollPosition.left; scroller.current.scrollTop = scrollPosition.top; } }, [ledgerKey, scrollPosition.left, scrollPosition.top]);
  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (!pointer.current) return;
      const { mode, index, startX, width: startWidth } = pointer.current;
      if (mode === "resize") {
        onViewChange({ ...view, widths: { ...view.widths, [index]: Math.max(90, Math.min(360, startWidth + event.clientX - startX)) } });
      } else {
        const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-lab-column]");
        const next = target ? Number(target.dataset.labColumn) : null;
        setDropBefore(next === actionIndex ? null : next);
      }
    };
    const up = () => {
      const operation = pointer.current;
      if (operation?.mode === "reorder" && dropBefore !== null && operation.index !== dropBefore) {
        const order = view.order.filter(item => item !== operation.index);
        order.splice(order.indexOf(dropBefore), 0, operation.index);
        onViewChange({ ...view, order });
      }
      pointer.current = null; setDropBefore(null);
    };
    document.addEventListener("pointermove", move); document.addEventListener("pointerup", up);
    return () => { document.removeEventListener("pointermove", move); document.removeEventListener("pointerup", up); };
  }, [view, dropBefore, actionIndex, onViewChange]);

  const filtered = rows.filter(row => {
    if (scope === "all" && view.profile !== "All Profiles" && row.profileId !== view.profile) return false;
    if (view.status !== "All statuses" && row.status !== view.status) return false;
    if (view.filter.trim() && ![row.title, row.subtitle, row.status, row.profileId, ...row.cells].join(" ").toLocaleLowerCase().includes(view.filter.trim().toLocaleLowerCase())) return false;
    if (Object.entries(view.columnFilters).some(([column,value]) => value && row.cells[Number(column)] !== value)) return false;
    if (view.missing === "Missing fields" && !row.cells.some(value => /^(?:—|Unknown|Not entered|Event pending)$/i.test(value))) return false;
    if (view.missing === "Financial unavailable" && !row.cells.some((value,index) => specs[index]?.kind === "money" && /unknown|unavailable|£—|^—$/i.test(value))) return false;
    const dateColumn = ledgerKey === "freeBets" || ledgerKey === "casino" ? "expiry_datetime" : ledgerKey === "sportsbook" ? "date_settled" : ledgerKey === "extraPlace" ? "date" : ledgerKey === "cash" ? "adjustment_date" : "last_balance_update";
    const dateIndex = specs.findIndex(item => item.id === dateColumn);
    if (dateIndex >= 0 && (view.dateFrom || view.dateTo)) {
      const day = calendarDate(row.cells[dateIndex].split("·")[0]);
      if (!day || (view.dateFrom && day < view.dateFrom) || (view.dateTo && day > view.dateTo)) return false;
    }
    if (ledgerKey === "sportsbook") {
      const fields = [["bookmaker", 1], ["strategy", 5], ["lay", 6], ["back", 7]] as const;
      if (fields.some(([name, index]) => !view.advanced[name].startsWith("Any ") && row.cells[index] !== view.advanced[name])) return false;
    }
    return true;
  });
  const sorted = filtered.map((row, index) => ({ row, index })).sort((a, b) => {
    if (view.sort.column === null) return a.index - b.index;
    const label = view.sort.column === -1 ? "Profile" : columns[view.sort.column];
    const valueA = view.sort.column === -1 ? labProfiles.find(profile => profile.id === a.row.profileId)?.name ?? "" : a.row.cells[view.sort.column] ?? "";
    const valueB = view.sort.column === -1 ? labProfiles.find(profile => profile.id === b.row.profileId)?.name ?? "" : b.row.cells[view.sort.column] ?? "";
    const kind = view.sort.column === -1 ? "text" : specs[view.sort.column]?.kind;
    const parsedA = sortableValue(valueA, label, kind), parsedB = sortableValue(valueB, label, kind);
    if (parsedA === null) return parsedB === null ? a.index - b.index : 1;
    if (parsedB === null) return -1;
    const comparison = typeof parsedA === "number" && typeof parsedB === "number" ? parsedA - parsedB : String(parsedA).localeCompare(String(parsedB));
    return comparison === 0 ? a.index - b.index : comparison * (view.sort.direction === "asc" ? 1 : -1);
  }).map(item => item.row);
  const cycleSort = (column: number) => update({ sort: view.sort.column !== column ? { column, direction: "asc" } : view.sort.direction === "asc" ? { column, direction: "desc" } : { column: null, direction: "asc" } });
  const autoFit = (index: number) => {
    const table = scroller.current?.querySelector("table");
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!table || !context) return;
    context.font = getComputedStyle(table).font;
    const longest = Math.max(context.measureText(columns[index]).width + 65, ...rows.map(row => context.measureText(row.cells[index] ?? "").width + 30));
    update({widths:{...view.widths,[index]:Math.max(90,Math.min(360,Math.ceil(longest)))}});
  };
  const moveColumn = (index: number, direction: -1 | 1) => {
    const order = [...view.order], from = order.indexOf(index), to = from + direction;
    if (to < 0 || to >= order.length - 1 || index === actionIndex) return;
    [order[from], order[to]] = [order[to], order[from]];
    update({ order });
  };
  const editFields = (column: number): (keyof LabEditableBet)[] => ({
    0: ["eventDate"], 1: ["bookmaker"], 2: ["event"], 3: ["offerName"], 4: ["offerText"],
    5: ["strategy"], 6: ["exchange", "layOdds", "requestedLayStake", "matchedLayStake", "commission"], 7: ["backStake", "backOdds"], 9: [],
  } as Record<number, (keyof LabEditableBet)[]>)[column] ?? [];
  const sourceFor = (row: LabLedgerRow): Record<string,string> => row.id === "LAB-SB-NEW"
    ? {event_name:bet.event,offer_name:bet.offerName,offer_details:bet.offerText,bookmaker:bet.bookmaker,match_strategy:bet.strategy,date_settled:bet.eventDate,exchange:bet.exchange,back_stake:bet.backStake,back_odds:bet.backOdds,lay_odds:bet.layOdds,requested_lay_stake:bet.requestedLayStake,matched_lay_stake:bet.matchedLayStake,commission:bet.commission}
    : {...labRecordInputs[row.id], ...row.sourceInputs, ...inputOverrides[row.id]};
  const startEdit = (row: LabLedgerRow, column: number) => {
    setEditGate(null); setCellError("");
    const spec = specs[column];
    if (!spec || spec.edit === "actions") return;
    if (spec.edit === "balance-observation") { onOpenBalance(row.id); return; }
    if (spec.edit === "immutable" || spec.edit === "derived") {
      setEditGate({id:row.id,message:spec.edit === "immutable" ? `${spec.label} is immutable.` : `${spec.label} is calculated or observed. Review ${spec.relatedFields.join(", ")} in the source workflow.`}); return;
    }
    const financial = spec.edit === "financial-input" || spec.edit === "governed" || spec.edit === "planning-choice";
    const planning = row.status === "Prospecting" || row.status === "Draft" || (row.id === "LAB-SB-NEW" && betState === "Prospecting");
    if (financial && (!planning || spec.edit === "governed")) { onOpenReview(row,column); return; }
    if (spec.edit === "planning-date" && !planning && ledgerKey !== "extraPlace") { onOpenReview(row,column); return; }
    if (spec.edit === "planning-account" && !planning) { onOpenReview(row,column); return; }
    if (ledgerKey === "sportsbook" && spec.edit === "financial-input" && [6,7].includes(column)) {
      const source=sourceFor(row);
      setEditing({id:row.id,column,value:"",draft:Object.fromEntries(editFields(column).map(field=>[field,source[({exchange:"exchange",layOdds:"lay_odds",requestedLayStake:"requested_lay_stake",matchedLayStake:"matched_lay_stake",commission:"commission",backStake:"back_stake",backOdds:"back_odds"} as Record<string,string>)[field] ?? field] ?? ""]))});
      return;
    }
    setEditing({id:row.id,column,value:sourceFor(row)[spec.id] ?? ""});
  };
  const commitEdit = () => {
    if (!editing) return;
    const row=rows.find(item=>item.id===editing.id), spec=specs[editing.column];
    if (!row || !spec) return;
    const value=editing.value.trim();
    if (editing.draft) {
      const draft=editing.draft;
      for (const field of ["backStake","requestedLayStake","matchedLayStake","commission"] as const) if (draft[field] && !validMoney(draft[field],field==="commission")) {setCellError(`${field} must use a valid decimal with at most two places.`);return;}
      for (const field of ["backOdds","layOdds"] as const) if (draft[field] && (!/^\d+(?:\.\d{1,3})?$/.test(draft[field]) || Number(draft[field])<=1)) {setCellError(`${field} must be decimal odds above 1.`);return;}
      if (draft.matchedLayStake && (!draft.requestedLayStake || Number(draft.matchedLayStake)>Number(draft.requestedLayStake))) {setCellError("Matched Lay Stake cannot exceed requested Lay Stake.");return;}
      const source=Object.fromEntries(Object.entries(draft).map(([field,input])=>[({exchange:"exchange",layOdds:"lay_odds",requestedLayStake:"requested_lay_stake",matchedLayStake:"matched_lay_stake",commission:"commission",backStake:"back_stake",backOdds:"back_odds"} as Record<string,string>)[field] ?? field,input]));
      if (editing.id === "LAB-SB-NEW") onBetChange(draft);
      else onRowPatch(editing.id,editing.column,"Planning inputs edited",source);
    } else {
      if (spec.edit === "descriptive" && (!value || value.length>180)) {setCellError("Enter 1–180 characters.");return;}
      if (spec.kind === "odds" && value && (!/^\d+(?:\.\d{1,3})?$/.test(value) || Number(value)<=1)) {setCellError("Enter decimal odds above 1, without commas.");return;}
      if (spec.kind === "money" && value && !validMoney(value)) {setCellError("Enter a valid amount with at most two decimals, without commas.");return;}
      if (spec.kind === "date" && value && !validLabDateInput(value)) {setCellError("Enter a valid date.");return;}
      if (editing.id === "LAB-SB-NEW") onBetChange(({event_name:"event",offer_name:"offerName",offer_details:"offerText",bookmaker:"bookmaker",match_strategy:"strategy",date_settled:"eventDate"} as Record<string,string>)[spec.id] ? {[({event_name:"event",offer_name:"offerName",offer_details:"offerText",bookmaker:"bookmaker",match_strategy:"strategy",date_settled:"eventDate"} as Record<string,string>)[spec.id]]:value} : {});
      else onRowPatch(editing.id,editing.column,spec.kind==="money"&&value?`£${Number(value).toFixed(2)}`:value||"—",{[spec.id]:value});
    }
    setEditing(null);setCellError("");requestAnimationFrame(()=>cellRef.current?.focus());
  };
  const accountOptions = (type: "Bookie" | "Exchange", profileId: string) => accounts.filter(account => account.profileId === profileId && account.type === type && account.status === "Active").map(account => account.name);
  const filterIndices = relevantFilters[ledgerKey].map(id => specs.findIndex(item => item.id === id)).filter(index => index >= 0 && specs[index].id !== "status");
  const inputFor = (field: keyof LabEditableBet, row: LabLedgerRow) => {
    if (!editing) return null;
    const value = editing.draft?.[field] ?? "";
    const accountChoices = field === "bookmaker" ? accountOptions("Bookie", row.profileId) : field === "exchange" ? accountOptions("Exchange", row.profileId) : null;
    const label = ({eventDate:"Event date/time",offerName:"Offer Name",offerText:"Offer Details",backStake:"Back Stake",backOdds:"Back Odds",layOdds:"Lay Odds",requestedLayStake:"Requested Lay Stake",matchedLayStake:"Matched Lay Stake",commission:"Exchange Commission"} as Partial<Record<keyof LabEditableBet,string>>)[field] ?? field;
    if (accountChoices) return <SearchableCombobox dataPdId={`lab.cell.${field}`} id={`lab-cell-${field}`} key={field} label={label} mode={accountOptionMode} multiple={false} onChange={values => setEditing(current => current ? {...current,draft:{...current.draft,[field]:values[0] ?? ""}} : null)} onModeChange={setAccountOptionMode} options={accountChoices.map(name => ({id:name,name}))} values={value ? [value] : []}/>;
    if (field === "strategy") return <div className={styles.gridEditorField} key={field}><DesignLabSelect dataPdId="lab.cell.strategy" label="Strategy" onChange={next => setEditing(current => current ? {...current,draft:{...current.draft,strategy:next}} : null)} options={["Standard","Underlay","Overlay"].map(item => ({value:item,label:item}))} value={value}/></div>;
    return <label className={styles.gridEditorField} key={field}>{label}<input aria-label={label} autoFocus={editFields(editing.column)[0] === field} inputMode={/odds|stake|commission/i.test(field) ? "decimal" : undefined} onChange={event => setEditing(current => current ? { ...current, draft: { ...current.draft, [field]: event.target.value } } : null)} type={field === "eventDate" ? "datetime-local" : "text"} value={value}/></label>;
  };
  const renderHeader = (index: number) => {
    const label = index === -1 ? "Profile" : columns[index];
    const isAction = index === actionIndex;
    const sort = view.sort.column === index ? view.sort.direction : null;
    return <th aria-sort={sort ? sort === "asc" ? "ascending" : "descending" : undefined} className={dropBefore === index ? styles.gridDropTarget : undefined} data-lab-column={index} key={index} scope="col">
      <span className={styles.gridHeader}>{isAction ? label : <button aria-label={`Sort ${label}${sort ? ` ${sort}` : ""}`} className={styles.gridSort} onClick={() => cycleSort(index)} type="button">{label}<span aria-hidden="true">{sort === "asc" ? "↑" : sort === "desc" ? "↓" : ""}</span></button>}
        {index >= 0 && !isAction ? <><button aria-label={`Move ${label}`} className={styles.gridGrip} onPointerDown={event => { if (event.pointerType === "touch") return; event.preventDefault(); pointer.current = { mode: "reorder", index, startX: event.clientX, width: width(index) }; }} title={`Drag to reorder ${label}`} type="button"><span aria-hidden="true" className="material-symbols-outlined">drag_indicator</span></button><button aria-label={`Resize ${label}`} className={styles.gridResize} onDoubleClick={event => {event.preventDefault();event.stopPropagation();autoFit(index);}} onPointerDown={event => { if (event.pointerType === "touch") return; event.preventDefault(); pointer.current = { mode: "resize", index, startX: event.clientX, width: width(index) }; }} title={`Drag to resize ${label}; double-click to auto-fit`} type="button" /></> : null}
      </span>
    </th>;
  };
  const ordered = scope === "all" ? [-1, ...view.order.filter(index=>!view.hidden.includes(index))] : view.order.filter(index=>!view.hidden.includes(index));
  const onCellKey = (event: ReactKeyboardEvent<HTMLTableCellElement>, row: LabLedgerRow, index: number) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === "F2") { event.preventDefault(); event.stopPropagation(); startEdit(row,index); return; }
    if (event.key === "Escape") { setEditing(null); setCellError(""); return; }
    if (!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(event.key)) return;
    const rowIndex = sorted.findIndex(item => item.id === row.id);
    const columnIndex = ordered.indexOf(index);
    const targetRow = rowIndex + (event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0);
    const targetColumn = columnIndex + (event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0);
    const target = scroller.current?.querySelectorAll("tbody tr")[targetRow]?.querySelectorAll("td")[targetColumn];
    if (target instanceof HTMLElement) { event.preventDefault(); target.focus(); target.scrollIntoView({block:"nearest",inline:"nearest"}); }
  };
  const tableWidth = ordered.reduce((sum,index)=>sum+(index===-1?96:width(index)),0);
  const viewLabel = savedView?.section === ledgerKey && JSON.stringify(savedView.view) === JSON.stringify(view) ? "Saved lab view active" : JSON.stringify(view) === JSON.stringify(defaultLabLedgerView(ledgerKey)) ? "Default view" : "Custom view";
  return <section className={styles.surface} data-pd-id={`lab.ledger.${ledgerKey}`}><div className={styles.sectionHead}><div><h2>{{accounts:"Accounts",sportsbook:"Sportsbook Bets",freeBets:"Free Bets",casino:"Casino Offers",extraPlace:"Extra Place",cash:"Cash Adjustments"}[ledgerKey]}</h2><p>{sorted.length} of {rows.length} rows · {active ? `${active} active filter${active === 1 ? "" : "s"}` : "No filters"} · {scope === "all" ? "All Profiles" : labProfiles.find(profile => profile.id === scope)?.name} · {viewLabel}</p></div>{ledgerKey === "sportsbook" ? <div className={styles.actionRow}><button className={styles.secondaryButton} data-pd-id="lab.add.modal" onClick={() => onOpenEntry("modal")} type="button">Quick Capture</button><button className={styles.primaryButton} data-pd-id="lab.add.page" onClick={() => onOpenEntry("page")} type="button">Open Bet Workbench</button></div> : ledgerKey !== "accounts" ? <button className={styles.secondaryButton} data-pd-id={`lab.concept-add.${ledgerKey}`} onClick={onOpenConcept} type="button">Add {ledgerKey === "freeBets" ? "Free Bet" : ledgerKey === "casino" ? "Casino Offer" : ledgerKey === "extraPlace" ? "Extra Place" : "Cash Adjustment"} · Preview</button> : null}</div>
    <div className={styles.toolbar}><label><span aria-hidden="true" className="material-symbols-outlined">search</span><input aria-label={`Filter ${ledgerKey} rows`} onChange={event => update({ filter: event.target.value })} placeholder="Search This Ledger" type="search" value={view.filter}/></label><DesignLabSelect compact dataPdId="lab.ledger.status-filter" label="Status Filter" onChange={status => update({ status })} options={["All statuses", ...new Set(rows.map(row => row.status))].map(value => ({ value, label: value }))} value={view.status}/>{scope === "all" ? <DesignLabSelect compact dataPdId="lab.ledger.profile-filter" label="Profile Filter" onChange={profile => update({ profile })} options={[{value:"All Profiles",label:"All Profiles"},...labProfiles.map(profile => ({value:profile.id,label:profile.name}))]} value={view.profile}/> : null}<button aria-expanded={advancedOpen} className={styles.secondaryButton} onClick={() => setAdvancedOpen(value => !value)} type="button">Filters</button>{active ? <button className={styles.secondaryButton} onClick={clearFilters} type="button">Clear Filters</button> : null}<button aria-expanded={columnsOpen} className={styles.secondaryButton} onClick={() => setColumnsOpen(value => !value)} type="button">Columns</button><button className={styles.secondaryButton} onClick={() => update({ order: defaultLabLedgerView(ledgerKey).order, widths: {}, hidden: [] })} type="button">Restore Default Columns</button><button className={styles.secondaryButton} onClick={() => onSaveView({ section: ledgerKey, view: structuredClone(view) })} type="button">Save Lab View</button>{savedView?.section === ledgerKey ? <button className={styles.linkButton} onClick={() => onViewChange(structuredClone(savedView.view))} type="button">Load Saved View</button> : null}<button className={styles.secondaryButton} onClick={() => scroller.current?.scrollBy({left: -320,behavior:"smooth"})} type="button" aria-label="Scroll table left">←</button><button className={styles.secondaryButton} onClick={() => scroller.current?.scrollBy({left: 320,behavior:"smooth"})} type="button" aria-label="Scroll table right">→</button></div>
    {advancedOpen ? <div className={styles.advancedFilterGrid} data-pd-id={`lab.ledger.filters.${ledgerKey}`}>
      {filterIndices.map(index => <DesignLabSelect dataPdId={`lab.ledger.filter.${specs[index].id}`} key={specs[index].id} label={specs[index].label} onChange={value => update({ columnFilters: { ...view.columnFilters, [index]: value } })} options={[{value:"",label:`Any ${specs[index].label}`},...new Set(rows.map(row => row.cells[index]).filter(value => value && value !== "—"))].map(item => typeof item === "string" ? {value:item,label:item} : item)} value={view.columnFilters[index] ?? ""}/>)}
      <DesignLabSelect dataPdId="lab.ledger.filter.readiness" label="Readiness" onChange={missing => update({missing:missing as LabLedgerView["missing"]})} options={["All readiness","Missing fields","Financial unavailable"].map(value => ({value,label:value}))} value={view.missing}/>
      {specs.some(item => item.kind === "date") ? <><label className={styles.gridFilterDate}>{ledgerKey === "freeBets" || ledgerKey === "casino" ? "Expiry From" : "From Date"}<input aria-label={ledgerKey === "freeBets" || ledgerKey === "casino" ? "Expiry From" : "From Date"} onChange={event => update({dateFrom:event.target.value})} type="date" value={view.dateFrom}/></label><label className={styles.gridFilterDate}>{ledgerKey === "freeBets" || ledgerKey === "casino" ? "Expiry To" : "To Date"}<input aria-label={ledgerKey === "freeBets" || ledgerKey === "casino" ? "Expiry To" : "To Date"} onChange={event => update({dateTo:event.target.value})} type="date" value={view.dateTo}/></label></> : null}
    </div> : null}
    {columnsOpen ? <div aria-label="Keyboard column controls" className={styles.columnTools}>{view.order.filter(index => index !== actionIndex).map(index => <div key={index}><span>{columns[index]}</span><button aria-label={`Move ${columns[index]} left`} onClick={() => moveColumn(index,-1)} type="button">←</button><button aria-label={`Move ${columns[index]} right`} onClick={() => moveColumn(index,1)} type="button">→</button><button aria-label={`Widen ${columns[index]}`} onClick={() => update({widths:{...view.widths,[index]:Math.min(360,width(index)+20)}})} type="button">+</button><button aria-label={`Narrow ${columns[index]}`} onClick={() => update({widths:{...view.widths,[index]:Math.max(90,width(index)-20)}})} type="button">−</button>{!specs[index].required ? <button aria-label={`${view.hidden.includes(index)?"Show":"Hide"} ${columns[index]}`} onClick={()=>update({hidden:view.hidden.includes(index)?view.hidden.filter(item=>item!==index):[...view.hidden,index]})} type="button">{view.hidden.includes(index)?"Show":"Hide"}</button> : null}</div>)}</div> : null}
    <button aria-pressed={mobileDetail} className={`${styles.secondaryButton} ${styles.gridNarrowToggle}`} onClick={() => setMobileDetail(current => !current)} type="button">{mobileDetail ? "Show Full Table" : "Show Labelled Details"}</button>
    <div aria-label={`${ledgerKey} table, scroll horizontally for all columns`} className={`${styles.tableScroll} ${mobileDetail ? styles.tableHiddenForDetail : ""}`} data-pd-id={`lab.ledger-pan.${ledgerKey}`} onClickCapture={event => { if (suppressPanClick.current) { event.preventDefault(); event.stopPropagation(); suppressPanClick.current=false; } }} onPointerDown={event => { if ((event.button !== 0 && event.button !== 1) || event.pointerType === "touch" || !(event.target instanceof HTMLElement) || editing || pointer.current) return; if (event.button === 0 && event.target.tagName !== "TD") return; if (event.target.closest("button,input,[role=combobox],textarea,a")) return; if(event.button===1) {event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);} pan.current={x:event.clientX,left:event.currentTarget.scrollLeft,active:false,button:event.button}; }} onAuxClick={event=>{if(event.button===1 && (pan.current || suppressPanClick.current)) {event.preventDefault();event.stopPropagation();}}} onPointerMove={event => { if (!pan.current) return; const delta=event.clientX-pan.current.x; if (!pan.current.active && Math.abs(delta)<6) return; pan.current.active=true; event.currentTarget.scrollLeft=pan.current.left-delta; event.preventDefault(); }} onPointerUp={event => { if (pan.current?.active || pan.current?.button===1) {suppressPanClick.current=true;window.setTimeout(() => {suppressPanClick.current=false;},0);} if(event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); pan.current=null; }} onPointerCancel={event => {if(event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);pan.current=null;}} onKeyDown={event => { if (event.target !== event.currentTarget) return; if (event.key === "ArrowRight" || event.key === "ArrowLeft") {event.preventDefault();event.currentTarget.scrollLeft += event.key === "ArrowRight" ? 80 : -80;} }} onScroll={event => onScrollPosition({ left: event.currentTarget.scrollLeft, top: event.currentTarget.scrollTop })} ref={scroller} tabIndex={0}><table style={{width:tableWidth,minWidth:tableWidth,tableLayout:"fixed"}}><colgroup>{ordered.map(index => <col key={index} style={{width:index === -1 ? 96 : width(index)}}/>)}</colgroup><thead><tr>{ordered.map(renderHeader)}</tr></thead><tbody>{sorted.map(row => <tr aria-label={`Open ${row.title}, ${labProfiles.find(profile => profile.id === row.profileId)?.name}${urgencyCue(row) ? `, ${urgencyCue(row)}` : ""}`} data-status={row.status} data-lab-row-id={row.id} data-urgent={Boolean(urgencyCue(row))} key={row.id} onClick={event => { if (event.target === event.currentTarget) row.onOpen(); }} onKeyDown={event => { if (event.target === event.currentTarget && event.key === "Enter") row.onOpen(); }} tabIndex={0}>{ordered.map(index => <td className={selectedCell?.id === row.id && selectedCell.column === index ? styles.gridSelectedCell : undefined} key={`${row.id}-${index}`} onClick={event => { event.stopPropagation(); if (index === actionIndex) return; setSelectedCell({id:row.id,column:index}); }} onDoubleClick={event => { event.stopPropagation(); startEdit(row,index); }} onKeyDown={event => onCellKey(event,row,index)} ref={selectedCell?.id === row.id && selectedCell.column === index ? node => { cellRef.current = node; } : undefined} tabIndex={index === actionIndex ? -1 : 0}>
      {index === -1 ? <span className={styles.providerCell}>{labProfiles.find(profile => profile.id === row.profileId)?.name ?? row.profileId}</span> : index === actionIndex ? <button aria-label={`Open ${row.title}`} className={styles.tableAction} onClick={event => { event.stopPropagation(); row.onOpen(); }} type="button"><span aria-hidden="true" className="material-symbols-outlined">open_in_new</span></button> : editing?.id === row.id && editing.column === index ? <div className={styles.gridEditor} onClick={event => event.stopPropagation()} onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); setEditing(null); setCellError(""); requestAnimationFrame(() => cellRef.current?.focus()); } else if (event.key === "Enter" && index !== 9 && !(event.target instanceof Element && event.target.closest(".pd-combobox-field, [role=combobox]"))) { event.preventDefault(); event.stopPropagation(); commitEdit(); } }}>{editing.draft ? editFields(index).map(field => inputFor(field,row)) : specs[index].edit === "planning-choice" && ledgerKey === "sportsbook" ? <DesignLabSelect compact dataPdId="lab.cell.status" label="Status" onChange={next => { if(next === "Placed") {if(row.id==="LAB-SB-NEW") onRequestPlacement(); else onOpenReview(row,index);} setEditing(null); }} options={[{value:"Prospecting",label:"Prospecting"},{value:"Placed",label:"Placed · confirmation required"}]} value="Prospecting"/> : specs[index].kind === "account" ? <SearchableCombobox dataPdId={`lab.cell.${specs[index].id}`} id={`lab-cell-${specs[index].id}`} label={specs[index].label} mode={accountOptionMode} multiple={false} onChange={values=>setEditing(current=>current?{...current,value:values[0]??""}:null)} onModeChange={setAccountOptionMode} options={accountOptions("Bookie",row.profileId).map(name=>({id:name,name}))} values={editing.value?[editing.value]:[]}/> : specs[index].edit === "planning-choice" || specs[index].kind === "boolean" || specs[index].id === "match_strategy" ? <DesignLabSelect dataPdId={`lab.cell.${specs[index].id}`} label={specs[index].label} onChange={value=>setEditing(current=>current?{...current,value}:null)} options={(specs[index].id === "offer_type" ? ["Free Spins","Wager to earn","Fixed Spins","Deposit and Bonus Wagering"] : specs[index].id === "direction" ? ["In","Out"] : specs[index].id === "match_strategy" ? ["Standard","Underlay","Overlay","Bonus Lock-In","Custom"] : ["Yes","No"]).map(value=>({value,label:value}))} value={editing.value}/> : <label className={styles.gridEditorField}>{ledgerKey === "sportsbook" && index === 0 ? "Event date/time" : specs[index].label}<input aria-label={ledgerKey === "sportsbook" && index === 0 ? "Event date/time" : specs[index].label} autoFocus inputMode={specs[index].kind === "money" || specs[index].kind === "odds" ? "decimal" : undefined} onChange={event=>setEditing(current=>current?{...current,value:event.target.value}:null)} type={specs[index].kind === "date" ? ledgerKey === "sportsbook" ? "datetime-local" : "date" : "text"} value={editing.value}/></label>}{cellError ? <small role="alert">{cellError}</small> : null}{specs[index].edit !== "planning-choice" || ledgerKey !== "sportsbook" ? <div><button aria-label="Save cell" onClick={commitEdit} type="button">Save</button><button aria-label="Cancel cell edit" onClick={() => {setEditing(null);setCellError("");}} type="button">Cancel</button></div> : null}</div> : <span className={`${specs[index]?.kind === "money" ? styles.financeCell : ""} ${specs[index]?.kind === "status" || specs[index]?.kind === "result" ? styles.statusCell : ""} ${specs[index]?.kind === "money" ? financeTone(row.cells[index]) : ""}`} data-cell-value={specs[index]?.kind === "status" || specs[index]?.kind === "result" ? row.cells[index] : undefined}>{row.cells[index]}{index === 0 && urgencyCue(row) ? <small className={styles.gridUrgencyCue}>{urgencyCue(row)}</small> : null}{index === 2 && ledgerKey === "sportsbook" ? <small className={styles.cellMeta}>{row.id}</small> : null}{(ledgerKey === "accounts" && index === 1 || ledgerKey === "sportsbook" && index === 1) ? <button aria-label={`Observe balance for ${row.cells[index]}, ${labProfiles.find(profile => profile.id === row.profileId)?.name}`} className={styles.gridAccountAction} onClick={event => { event.stopPropagation(); const account = ledgerKey === "accounts" ? accounts.find(item => item.id === row.id) : accounts.find(item => item.profileId === row.profileId && item.name === row.cells[index]); if (account) onOpenBalance(account.id); else setEditGate({id:row.id,message:"No eligible synthetic Account balance observation is linked to this provider."}); }} type="button"><span aria-hidden="true" className="material-symbols-outlined">account_balance_wallet</span></button> : null}</span>}</td>)}</tr>)}</tbody></table></div>
    {editGate ? <div className={styles.gridEditGate} role="status"><span aria-hidden="true" className="material-symbols-outlined">lock</span><span>{editGate.message}</span><button className={styles.secondaryButton} onClick={() => { const row=rows.find(item => item.id === editGate.id); row?.onOpen(); }} type="button">Open Full Record</button></div> : null}
    <div className={`${styles.mobileRows} ${mobileDetail ? styles.mobileDetailVisible : ""}`}>{sorted.map(row => <article key={row.id}><div><strong>{row.title}</strong><span className={styles.status}>{row.status}</span></div><p>{labProfiles.find(profile => profile.id === row.profileId)?.name} · {row.subtitle}</p><dl className={styles.detailGrid}>{specs.filter(item => item.id !== "actions").map(item => <div key={item.id}><dt>{item.label}</dt><dd>{row.cells[item.position] ?? "—"}</dd></div>)}</dl><button className={styles.secondaryButton} onClick={row.onOpen} type="button">Open Full Record</button>{ledgerKey === "accounts" ? <button className={styles.secondaryButton} onClick={() => onOpenBalance(row.id)} type="button">Observe Balance</button> : null}</article>)}</div>
    {!sorted.length ? <div className={styles.gridEmpty}><p>No rows match this view.</p>{active ? <button className={styles.secondaryButton} onClick={clearFilters} type="button">Clear Filters</button> : null}</div> : null}<p className={styles.tableNote}>Full table and labelled narrow detail retain every approved display field. Narrow presentation remains lab-only.</p>
  </section>;
}
