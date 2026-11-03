"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DesignLabSelect } from "@/components/design-lab-select";
import { ModalBoundary } from "@/components/modal-boundary";
import { DesignLabTaskState } from "@/components/design-lab-task-state";
import { DesignTodayTaskRow } from "@/components/design-today-task-row";
import { buildLabTodayTasks, labClock, labTaskDateLabel, labTaskNeedsUrgentReview, labTaskSourceType, labTaskUrgency, sortLabTodayTasks, summarizeLabToday, type LabTaskUrgency, type LabTodayTask } from "@/lib/design-lab-operations";
import { labProfiles, type LabAccount, type LabProfileId, type LabScope } from "@/lib/design-lab-fixture";
import type { LabRecord } from "@/lib/design-lab-connected-data";
import type { LabTaskWorkState } from "@/components/design-lab-operations";
import styles from "./design-lab-today.module.css";

type SourceType = ReturnType<typeof labTaskSourceType>;
type DuePeriod = "All" | "Today" | "Next 7 Days" | "No Date";
export type LabTodayViewState = { layout: "List" | "Board"; profile: "All" | LabProfileId; sourceType: "All" | SourceType; urgency: "All" | LabTaskUrgency; workState: "All" | LabTaskWorkState; provider: string; duePeriod: DuePeriod; sort: "Priority" | "Date" | "Title"; filtersOpen: boolean; suggestionsOpen: boolean; recurringOpen: boolean };
export const initialLabTodayView: LabTodayViewState = { layout: "List", profile: "All", sourceType: "All", urgency: "All", workState: "All", provider: "All", duePeriod: "All", sort: "Priority", filtersOpen: false, suggestionsOpen: false, recurringOpen: false };
const workStates: LabTaskWorkState[] = ["To Do", "In Progress", "Blocked", "Do Later", "Done"];
const urgencyGroups: LabTaskUrgency[] = ["Past Recorded Date", "Immediate Review", "Date Today", "Upcoming", "No Recorded Date"];
const sevenDaysAfterLabClock = new Date(Date.parse(`${labClock}T12:00:00Z`) + 7 * 86400000).toISOString().slice(0,10);
const profileName = (id?: LabProfileId) => id ? labProfiles.find(profile => profile.id === id)?.name ?? id : "All Profiles";
const iconFor = (task: LabTodayTask) => ({ Sportsbook: "sports_soccer", "Free Bet": "redeem", Casino: "casino", Account: "account_balance_wallet", Routine: "event_repeat", Suggestion: "lightbulb" })[labTaskSourceType(task)];

export function DesignLabToday({ scope, records, accounts, extraTasks = [], taskStates, blockedReasons, reviewDates, trackedTaskIds, onTaskState, onBlockedReason, onReviewDate, onToggleTrackTask, onBulkTrackTasks, onOpenSource, onOpenOffer, onInspectHistory, view, onViewChange, onSourceLeave, boardScrollLeft, onBoardScroll }: {
  scope: LabScope; records: LabRecord[]; accounts: LabAccount[];
  extraTasks?: LabTodayTask[];
  taskStates: Record<string,LabTaskWorkState>; blockedReasons: Record<string,string>; reviewDates: Record<string,string>; trackedTaskIds: string[];
  onTaskState: (id:string,state:LabTaskWorkState) => void; onBlockedReason: (id:string,reason:string) => void; onReviewDate: (id:string,date:string) => void; onToggleTrackTask: (id:string) => void; onBulkTrackTasks: (ids:string[], action:"track"|"untrack") => void;
  onOpenSource: (id:string) => void; onOpenOffer: () => void; onInspectHistory: () => void;
  view: LabTodayViewState; onViewChange: (view: LabTodayViewState) => void; onSourceLeave: () => void; boardScrollLeft: number; onBoardScroll: (left:number) => void;
}) {
  const tasks = useMemo(() => [...buildLabTodayTasks(records, accounts, scope), ...extraTasks.filter(task => scope === "all" || task.profileId === scope)], [records, accounts, scope, extraTasks]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [narrow, setNarrow] = useState(false);
  const rowRefs = useRef<Record<string,HTMLButtonElement | null>>({});
  const detailHeadingRef = useRef<HTMLHeadingElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const setView = (change: Partial<LabTodayViewState>) => {
    if (Object.keys(change).some(key => ["profile", "sourceType", "urgency", "workState", "provider", "duePeriod"].includes(key))) setSelectedId(null);
    onViewChange({ ...view, ...change });
  };

  useEffect(() => {
    const media = window.matchMedia("(max-width: 700px)");
    const update = () => setNarrow(media.matches);
    update(); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => { if (selectedId) requestAnimationFrame(() => detailHeadingRef.current?.focus({ preventScroll: true })); }, [selectedId, narrow]);
  useEffect(() => { if (view.layout === "Board" && boardRef.current) boardRef.current.scrollLeft = boardScrollLeft; }, [view.layout, boardScrollLeft]);
  useEffect(() => {
    if (!selectedId || view.layout !== "Board" || narrow) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); const target = returnFocusRef.current; setSelectedId(null); if (target?.isConnected) requestAnimationFrame(() => target.focus({ preventScroll: true })); } };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selectedId, view.layout, narrow]);

  const filtered = useMemo(() => sortLabTodayTasks(tasks.filter(task => {
    if (view.profile !== "All" && task.profileId !== view.profile) return false;
    if (view.sourceType !== "All" && labTaskSourceType(task) !== view.sourceType) return false;
    if (view.urgency !== "All" && labTaskUrgency(task) !== view.urgency) return false;
    if (view.workState !== "All" && (taskStates[task.id] ?? "To Do") !== view.workState) return false;
    if (view.provider !== "All" && task.provider !== view.provider) return false;
    if (view.duePeriod === "Today" && task.due !== labClock) return false;
    if (view.duePeriod === "Next 7 Days" && (!task.due || task.due < labClock || task.due > sevenDaysAfterLabClock)) return false;
    if (view.duePeriod === "No Date" && task.due) return false;
    return true;
  }), view.sort), [tasks, taskStates, view]);
  const selected = filtered.find(task => task.id === selectedId) ?? null;
  const todayCounts = summarizeLabToday(filtered, taskStates);
  const activeFilterCount = [view.profile, view.sourceType, view.urgency, view.workState, view.provider, view.duePeriod].filter(value => value !== "All").length;
  const providers = [...new Set(tasks.map(task => task.provider))].sort();

  function openDetails(task: LabTodayTask) {
    returnFocusRef.current = rowRefs.current[task.id];
    setSelectedId(task.id);
  }
  function closeDetails() {
    const target = returnFocusRef.current;
    setSelectedId(null);
    if (target?.isConnected) requestAnimationFrame(() => target.focus({ preventScroll: true }));
  }
  function sourceAction(task: LabTodayTask) {
    if (task.previewOnly) return;
    if (task.sourceId) { onSourceLeave(); onOpenSource(task.sourceId); return; }
    if (task.id === "reload") { onSourceLeave(); onOpenOffer(); return; }
    if (task.manual) { onTaskState(task.id,"Done"); return; }
    onSourceLeave(); onInspectHistory();
  }
  function changeTaskState(task: LabTodayTask, state: LabTaskWorkState) {
    if (state === "Done" && !task.manual && task.authority !== "Advisory suggestion") return;
    if (state === "Do Later" && !reviewDates[task.id]) onReviewDate(task.id, sevenDaysAfterLabClock);
    onTaskState(task.id, state);
    if (view.layout === "Board" && boardRef.current) {
      const destination = workStates.indexOf(state);
      boardRef.current.scrollTo({ left: destination * 290, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    }
  }
  function bulkTrackButton(label: string, rows: LabTodayTask[]) {
    const eligible = rows.filter(task => (taskStates[task.id] ?? "To Do") !== "Done");
    if (!eligible.length) return null;
    const allTracked = eligible.every(task => trackedTaskIds.includes(task.id));
    const count = allTracked ? eligible.length : eligible.filter(task => !trackedTaskIds.includes(task.id)).length;
    return <button aria-label={`${allTracked ? "Untrack" : "Track"} All ${label}, ${count} task${count === 1 ? "" : "s"}`} className={styles.bulkTrack} data-pd-id={`lab.today.bulk.${label.toLowerCase().replace(/[^a-z0-9]+/g,"-")}`} onClick={() => onBulkTrackTasks(eligible.map(task => task.id), allTracked ? "untrack" : "track")} type="button">{allTracked ? "Untrack All" : "Track All"} <span>{count}</span></button>;
  }
  function taskRow(task: LabTodayTask, board = false) {
    const state = taskStates[task.id] ?? "To Do";
    return <DesignTodayTaskRow accessibleName={`Inspect ${task.title} · ${profileName(task.profileId)}`} active={selectedId === task.id} board={board}
      context={<>{task.provider} · {profileName(task.profileId)}{task.group === "Opportunities / Suggestions" ? " · Advisory" : ""}</>}
      dataPdId={`lab.task.${task.id}`} date={task.due ? labTaskDateLabel(task) : undefined} dateTime={task.due}
      extraContext={<>{state === "Do Later" && reviewDates[task.id] ? <small>Review {reviewDates[task.id]}</small> : null}{state === "Blocked" && blockedReasons[task.id] ? <small>Blocked: {blockedReasons[task.id]}</small> : null}</>}
      icon={iconFor(task)} key={task.id} onClick={() => openDetails(task)} ref={node => { rowRefs.current[task.id] = node; }} selectionMode="pressed"
      state={<DesignLabTaskState state={state}/>} title={task.title} urgent={labTaskNeedsUrgentReview(task)} />;
  }
  function taskDetails(task: LabTodayTask) {
    const state = taskStates[task.id] ?? "To Do";
    return <div className={`${styles.detailContent} ${labTaskNeedsUrgentReview(task) ? styles.detailUrgent : ""}`} data-pd-id="lab.today.detail">
      <header className={styles.detailHead}><div><small>Task Details · {labTaskSourceType(task)}</small><h2 ref={detailHeadingRef} tabIndex={-1}>{task.title}</h2></div><button aria-label="Close Task Details" className={styles.closeButton} onClick={closeDetails} type="button"><span aria-hidden="true" className="material-symbols-outlined">close</span></button></header>
      <dl className={styles.properties}><div><dt>Profile</dt><dd>{profileName(task.profileId)}</dd></div><div><dt>Bookmaker / Provider</dt><dd>{task.provider}</dd></div><div><dt>Date Context</dt><dd>{labTaskDateLabel(task)}{task.dateKind === "Event Date" ? <small>Recorded event date; no settlement deadline is inferred.</small> : task.dateKind === "Expected Check" ? <small>Schedule only; promotion availability is unverified.</small> : null}</dd></div><div><dt>Work State</dt><dd><DesignLabTaskState state={state}/></dd></div>{reviewDates[task.id] ? <div><dt>Review Date</dt><dd>{reviewDates[task.id]}</dd></div> : null}{blockedReasons[task.id] ? <div><dt>Blocked Reason</dt><dd>{blockedReasons[task.id]}</dd></div> : null}<div><dt>Task Type</dt><dd>{task.authority}</dd></div><div><dt>Source</dt><dd>{task.sourceId ?? (task.group === "Recurring Work" ? "Configured routine" : "Synthetic history or preview")}</dd></div></dl>
      <p className={styles.detailText}>{task.detail}</p>
      {task.group === "Opportunities / Suggestions" ? <p className={styles.uncertainty}>Advisory only. Current offer availability is unverified.</p> : null}
      <div className={styles.stateEditor}><DesignLabSelect dataPdId={`lab.task-state.${task.id}`} label="Work State" onChange={next => changeTaskState(task,next)} options={workStates.filter(next => next !== "Done" || task.manual || task.authority === "Advisory suggestion").map(next => ({value:next,label:next}))} value={state}/>
        {state === "Blocked" ? <label>Blocked Reason<input aria-label={`${task.title} blocked reason`} onChange={event => onBlockedReason(task.id,event.target.value)} placeholder="Reason for blocked work" value={blockedReasons[task.id] ?? ""}/></label> : null}
        {state === "Do Later" ? <label>Review / Resume Date<input aria-label={`${task.title} resume date`} min={labClock} onChange={event => { if (!event.target.value || !Number.isNaN(Date.parse(`${event.target.value}T12:00:00Z`)) && event.target.value >= labClock) onReviewDate(task.id,event.target.value); }} type="date" value={reviewDates[task.id] ?? ""}/></label> : null}
      </div>
      {task.sourceId && state === "Do Later" ? <p className={styles.uncertainty}>The source alert and recorded date remain active.</p> : null}
      <div className={styles.detailActions}>{!task.previewOnly ? <button className={styles.primaryAction} data-pd-id={`lab.task-action.${task.id}`} onClick={() => sourceAction(task)} type="button">{task.action}</button> : <span>Preview Only · no source action</span>}<button aria-pressed={trackedTaskIds.includes(task.id)} data-pd-id={`lab.task-track.${task.id}`} onClick={() => onToggleTrackTask(task.id)} type="button">{trackedTaskIds.includes(task.id) ? "Untrack" : "Track Task"}</button></div>
    </div>;
  }

  return <div className={styles.today} data-pd-id="lab.today">
    <div className={styles.toolbar}><div className={styles.summary}><strong>{todayCounts.needsAttention} Needs Attention</strong><span>{todayCounts.routineChecksDue} Routine Checks Due</span><span>{todayCounts.upcoming} Upcoming</span><span>{scope === "all" ? "All Profiles" : profileName(scope)}</span></div><div className={styles.toolbarActions}><div aria-label="Task Layout" className={styles.viewToggle} role="group"><button aria-pressed={view.layout === "List"} onClick={() => setView({ layout: "List" })} type="button">List</button><button aria-pressed={view.layout === "Board"} onClick={() => setView({ layout: "Board" })} type="button">Board</button></div><button aria-expanded={view.filtersOpen} className={styles.toolButton} data-pd-id="lab.today.filter-toggle" onClick={() => setView({ filtersOpen: !view.filtersOpen })} type="button"><span aria-hidden="true" className="material-symbols-outlined">filter_list</span>Filters{activeFilterCount ? ` ${activeFilterCount}` : ""}</button><DesignLabSelect compact dataPdId="lab.today.sort" label="Sort" onChange={sort => setView({ sort })} options={(["Priority","Date","Title"] as const).map(value => ({value,label:value}))} value={view.sort}/></div></div>
    {view.filtersOpen ? <section aria-label="Task Filters" className={styles.filters} data-pd-id="lab.today.filters">
      <DesignLabSelect dataPdId="lab.today.filter.profile" label="Profile" onChange={profile => setView({ profile })} options={[{value:"All",label:"All Profiles"},...labProfiles.filter(profile => scope === "all" || scope === profile.id).map(profile => ({value:profile.id,label:profile.name}))]} value={view.profile}/>
      <DesignLabSelect dataPdId="lab.today.filter.type" label="Source Type" onChange={sourceType => setView({sourceType})} options={["All","Sportsbook","Free Bet","Account","Routine","Suggestion"].map(value => ({value:value as LabTodayViewState["sourceType"],label:value}))} value={view.sourceType}/>
      <DesignLabSelect dataPdId="lab.today.filter.urgency" label="Urgency" onChange={urgency => setView({urgency})} options={[{value:"All",label:"All"},...urgencyGroups.map(value => ({value,label:value}))]} value={view.urgency}/>
      <DesignLabSelect dataPdId="lab.today.filter.state" label="Work State" onChange={workState => setView({workState})} options={[{value:"All",label:"All"},...workStates.map(value => ({value,label:value}))]} value={view.workState}/>
      <DesignLabSelect dataPdId="lab.today.filter.provider" label="Bookmaker" onChange={provider => setView({provider})} options={["All",...providers].map(value => ({value,label:value}))} value={view.provider}/>
      <DesignLabSelect dataPdId="lab.today.filter.period" label="Recorded Date Period" onChange={duePeriod => setView({duePeriod})} options={(["All","Today","Next 7 Days","No Date"] as const).map(value => ({value,label:value}))} value={view.duePeriod}/>
      <button className={styles.clearButton} disabled={!activeFilterCount} onClick={() => setView({profile:"All",sourceType:"All",urgency:"All",workState:"All",provider:"All",duePeriod:"All"})} type="button">Clear Filters</button>
    </section> : null}
    <div className={`${styles.content} ${selected && !narrow && view.layout === "List" ? styles.withDetail : ""} ${selected && !narrow && view.layout === "Board" ? styles.boardWithDetail : ""}`}>
      <div className={styles.queue}>
        {view.layout === "List" ? <>
          <section aria-label="Needs Action" className={styles.collection}><div className={styles.collectionHeading}><h2>Needs Action <span>{filtered.filter(task => task.group === "Needs Action").length}</span></h2>{bulkTrackButton("Needs Action",filtered.filter(task => task.group === "Needs Action"))}</div>{view.sort !== "Priority" ? filtered.filter(task => task.group === "Needs Action").map(task => taskRow(task)) : urgencyGroups.map(group => {
            const rows = filtered.filter(task => task.group === "Needs Action" && labTaskUrgency(task) === group);
            return rows.length ? <div className={styles.priorityGroup} key={group}><div className={styles.collectionHeading}><h3>{group}</h3></div>{rows.map(task => taskRow(task))}</div> : null;
          })}</section>
          <section aria-label="Recurring Work" className={styles.collection}><div className={styles.collectionHeading}><h2>Recurring Work <span>{filtered.filter(task => task.group === "Recurring Work").length}</span></h2>{bulkTrackButton("Recurring Work",filtered.filter(task => task.group === "Recurring Work"))}</div>{(() => {
            const rows = filtered.filter(task => task.group === "Recurring Work");
            const daily = rows.filter(task => task.title === "Check Daily Free Spins" && task.provider === "Bookmaker C");
            const other = rows.filter(task => !daily.includes(task));
            return <>{daily.length > 1 ? <div className={styles.recurringGroup}><button aria-expanded={view.recurringOpen} className={styles.recurringTrigger} data-pd-id="lab.today.recurring-free-spins" onClick={() => setView({recurringOpen:!view.recurringOpen})} type="button"><span aria-hidden="true" className="material-symbols-outlined">{view.recurringOpen ? "expand_less" : "expand_more"}</span><strong>Check Daily Free Spins — Bookmaker C</strong><small>{daily.length} Profiles</small></button>{view.recurringOpen ? <div className={styles.recurringChildren}>{daily.map(task => taskRow(task))}</div> : null}</div> : daily.map(task => taskRow(task))}{other.map(task => taskRow(task))}</>;
          })()}</section>
          <section aria-label="Opportunities / Suggestions" className={styles.collection}><div className={styles.collectionHeading}><button aria-expanded={view.suggestionsOpen} className={styles.suggestionTrigger} onClick={() => setView({suggestionsOpen:!view.suggestionsOpen})} type="button"><span aria-hidden="true" className="material-symbols-outlined">{view.suggestionsOpen ? "expand_less" : "expand_more"}</span>Opportunities / Suggestions <small>{filtered.filter(task => task.group === "Opportunities / Suggestions").length}</small></button>{bulkTrackButton("Opportunities and Suggestions",filtered.filter(task => task.group === "Opportunities / Suggestions"))}</div>{view.suggestionsOpen ? filtered.filter(task => task.group === "Opportunities / Suggestions").map(task => taskRow(task)) : null}</section>
        </> : <><div className={styles.boardControls}><span>Scroll Board to view all states</span><div><button aria-label="Scroll Board Left" onClick={() => boardRef.current?.scrollBy({left:-290,behavior:"smooth"})} type="button"><span aria-hidden="true" className="material-symbols-outlined">chevron_left</span></button><button aria-label="Scroll Board Right" onClick={() => boardRef.current?.scrollBy({left:290,behavior:"smooth"})} type="button"><span aria-hidden="true" className="material-symbols-outlined">chevron_right</span></button></div></div><div aria-label="Task Board" className={styles.board} data-pd-id="lab.today.board" onPointerDown={event => { if (selectedId && event.target instanceof Element && !event.target.closest('[data-pd-id^="lab.task."]')) setSelectedId(null); }} onScroll={event => onBoardScroll(event.currentTarget.scrollLeft)} ref={boardRef} role="region" tabIndex={0}>{workStates.map(state => {
          const rows = filtered.filter(task => (taskStates[task.id] ?? "To Do") === state);
          return <section className={styles.boardColumn} data-lab-board-state={state} key={state}><div className={styles.collectionHeading}><h2>{state} <span>{rows.length}</span></h2>{state !== "Done" ? bulkTrackButton(state,rows) : null}</div>{rows.map(task => taskRow(task,true))}</section>;
        })}</div></>}
        {!filtered.length ? <p className={styles.empty}>No tasks match these filters. <button onClick={() => setView({profile:"All",sourceType:"All",urgency:"All",workState:"All",provider:"All",duePeriod:"All"})} type="button">Clear Filters</button></p> : null}
      </div>
      {selected && !narrow ? <aside aria-label="Task Details" className={`${styles.detailPane} ${view.layout === "Board" ? styles.boardDrawer : ""}`}>{taskDetails(selected)}</aside> : null}
    </div>
    {selected && narrow ? <ModalBoundary onDismiss={closeDetails} returnFocusRef={returnFocusRef}><div aria-label="Task Details" className={styles.mobileDetail} role="dialog">{taskDetails(selected)}</div></ModalBoundary> : null}
  </div>;
}
