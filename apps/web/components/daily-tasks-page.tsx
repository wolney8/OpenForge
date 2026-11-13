"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LedgerLoadingIndicator } from "@/components/ledger-loading-indicator";
import { LedgerPagination } from "@/components/ledger-pagination";
import { DesignTodayBoard, DesignTodayDetail, DesignTodayFilters, DesignTodayTaskRow, DesignTodayToolbar, DesignTodayViewToggle, designTodayBoardColumnClass, designTodayBoardControlsClass, designTodayBoardDrawerClass, designTodayBoardWithDetailClass, designTodayBulkTrackClass, designTodayCollectionFooterClass, designTodayCollectionHeadingClass, designTodayContentClass, designTodayDetailActionsClass, designTodayDetailPaneClass, designTodayDetailTextClass, designTodayMobileDetailClass, designTodayOpportunitySummaryClass, designTodayPaginationClass, designTodayPrimaryActionClass, designTodayPriorityGroupClass, designTodayPropertiesClass, designTodayQueueClass, designTodayRootClass, designTodayStateEditorClass, designTodaySuggestionTriggerClass, designTodayTaskCollectionClass, designTodayTaskListClass, designTodayTaskWithActionClass, designTodayToolButtonClass, designTodayWithDetailClass } from "@/components/design-today-task-row";
import { BookmakerIdentity } from "@/components/bookmaker-identity";
import type { MasterAccountCatalogue, MasterAccountCatalogueRecord } from "@/lib/bookmaker-catalogue";
import { DesignLabTaskState } from "@/components/design-lab-task-state";
import { DesignLabSelect } from "@/components/design-lab-select";
import { DesignPageHead, designPageHeadClasses } from "@/components/design-ledger-screen";
import { ModalBoundary } from "@/components/modal-boundary";
import { OpportunityPersonalReview, type OpportunityPersonalReviewHandle } from "@/components/opportunity-personal-review";
import { apiBaseUrl } from "@/lib/api";
import {
  currentDailyTasks,
  deriveDailyTaskView,
  emptyDailyTaskSourceIndex,
  dismissNotificationIds,
  emptyNotificationViewState,
  filterAndSortDailyTasks,
  isActionableDailyTask,
  filterFundManagerNotificationsForViewer,
  FUND_MANAGER_NOTIFICATIONS_REFRESH_EVENT,
  FUND_MANAGER_NOTIFICATIONS_STORAGE_KEY,
  TODAY_ACTIONABLE_NAVIGATION_EVENT,
  loadPersistedNotificationPreferences,
  loadDailyTaskSourceIndex,
  loadPersistedNotificationState,
  orderedTaskGroups,
  taskDateGroup,
  markNotificationsRead,
  normalizeNotificationViewState,
  persistNotificationState,
  restoreNotificationIds,
  type DailyTaskDueState,
  type DailyTaskView,
  type DailyTaskSort,
  type DailyTaskSource,
  type DailyTaskSourceIndex,
  type FundManagerNotification,
  type NotificationViewState,
} from "@/lib/notifications";
import { beginRouteTransition, endRouteTransition } from "@/lib/shell-loading";
import { loadAuthorizedProfileOpportunities, opportunityAnnotationOccurrence, opportunityReviewGuidance, opportunityReviewTitle, opportunityViewKey, type OwnedOpportunity } from "@/lib/profile-opportunities";
import { loadTaskAnnotations, patchTaskAnnotations, TASK_ANNOTATIONS_REFRESH_EVENT, type TaskAnnotation, type TaskAnnotationChange, type TaskWorkState } from "@/lib/task-annotations";

const dueViews: { id: DailyTaskDueState; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "upcoming", label: "Upcoming" },
  { id: "overdue", label: "Overdue" },
  { id: "completed", label: "Completed" },
];

function loadViewState(): NotificationViewState {
  if (typeof window === "undefined") return emptyNotificationViewState;
  try {
    const stored = window.localStorage.getItem(FUND_MANAGER_NOTIFICATIONS_STORAGE_KEY);
    return stored ? normalizeNotificationViewState(JSON.parse(stored) as unknown) : emptyNotificationViewState;
  } catch {
    return emptyNotificationViewState;
  }
}

function taskTypeLabel(type: string): string {
  return type.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function priorityLabel(priority: "high" | "medium" | "low"): string {
  if (priority === "low") return "Routine";
  return priority[0].toUpperCase() + priority.slice(1);
}

function sourceActionLabel(ledger: string, href: string): string {
  if (href.includes("/tracker/settings")) return "Open Profile Settings";
  if (ledger === "Sportsbook Bets") return "Open Bet";
  if (ledger === "Free Bets") return "Open Free Bet";
  if (ledger === "Casino Offers") return "Open Casino Offer";
  if (ledger === "Extra Place") return "Open Extra Place";
  if (ledger === "Cash Adjustments") return "Open Cash Adjustment";
  if (ledger === "Accounts" || ledger === "Profile Accounts") return "Open Account";
  return "Open Source";
}

function sourceIcon(ledger: string): string {
  if (ledger === "Sportsbook Bets") return "sports_soccer";
  if (ledger === "Free Bets") return "award_star";
  if (ledger === "Casino Offers") return "casino";
  if (ledger === "Extra Place") return "emoji_events";
  if (ledger === "Cash Adjustments") return "account_balance";
  if (ledger === "Accounts") return "account_balance_wallet";
  return "task_alt";
}

type WorkIntent = { work_state: TaskWorkState; blocked_reason: string | null; review_date: string | null };
type WorkQueue = { task: DailyTaskView; desired: WorkIntent; revision: number; running: boolean; lastRow: TaskAnnotation | null };
const opportunityAnnotationExtensionEnabled = process.env.NEXT_PUBLIC_OPENFORGE_OPPORTUNITY_TASK_ANNOTATIONS_ENABLED === "true";
const opportunityPersonalReviewEnabled = process.env.NEXT_PUBLIC_OPENFORGE_OPPORTUNITY_PERSONAL_REVIEW_ENABLED === "true";

export function DailyTasksPage({ uxV2 = false }: { uxV2?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const globalProfileScope = searchParams.get("scope");
  const deepLinkedOpportunity = searchParams.get("opportunity") ?? "";
  const initialCollection = searchParams.get("collection") === "tracked" ? "tracked" : "all";
  const refreshVersionRef = useRef(0);
  const stateRequestVersionRef = useRef(0);
  const stateMutationPendingRef = useRef(false);
  const [initialViewState] = useState<NotificationViewState>(loadViewState);
  const viewStateRef = useRef<NotificationViewState>(initialViewState);
  const [notifications, setNotifications] = useState<FundManagerNotification[]>([]);
  const [sourceIndex, setSourceIndex] = useState<DailyTaskSourceIndex>(emptyDailyTaskSourceIndex);
  const [bookmakerCatalogue, setBookmakerCatalogue] = useState<MasterAccountCatalogueRecord[]>([]);
  const [viewState, setViewState] = useState(initialViewState);
  const [now, setNow] = useState(() => new Date());
  const [dueState, setDueState] = useState<DailyTaskDueState>("today");
  const [query, setQuery] = useState("");
  const [profileId, setProfileId] = useState("all");
  const [bookmaker, setBookmaker] = useState("all");
  const [notificationType, setNotificationType] = useState("all");
  const [source, setSource] = useState<DailyTaskSource | "all">("all");
  const [sort, setSort] = useState<DailyTaskSort>("priority");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(uxV2 ? 8 : 16);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isPersistingState, setIsPersistingState] = useState(false);
  const [openingId, setOpeningId] = useState("");
  const [actionError, setActionError] = useState("");
  const [inspectedTaskId, setInspectedTaskId] = useState("");
  const [inspectedOpportunityKey, setInspectedOpportunityKey] = useState(() => searchParams.get("opportunity") ?? "");
  const [layout, setLayout] = useState<"List" | "Board">("List");
  const [collection, setCollection] = useState<"all" | "tracked">("all");
  const [annotations, setAnnotations] = useState<TaskAnnotation[] | null>(null);
  const [trackingPending, setTrackingPending] = useState(false);
  const [sourceHistoryOpen, setSourceHistoryOpen] = useState<boolean | null>(null);
  const [draftState, setDraftState] = useState<TaskWorkState>("To Do");
  const [draftBlockedReason, setDraftBlockedReason] = useState("");
  const [draftReviewDate, setDraftReviewDate] = useState("");
  const [workSaveStatus, setWorkSaveStatus] = useState<"idle" | "saving" | "saved" | "failed" | "needs-date">("idle");
  const [workSaveError, setWorkSaveError] = useState("");
  const workQueuesRef = useRef(new Map<string, WorkQueue>());
  const annotationsRef = useRef<TaskAnnotation[] | null>(null);
  const annotationsWriteEpochRef = useRef(0);
  const annotationsReadIdRef = useRef(0);
  const activeTaskIdRef = useRef("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [opportunityLimit, setOpportunityLimit] = useState(5);
  const [opportunityState, setOpportunityState] = useState<{ status: "loading" | "ready" | "error"; rows: OwnedOpportunity[]; failed: string[]; error: string }>({ status: "loading", rows: [], failed: [], error: "" });
  const [narrow, setNarrow] = useState(false);
  const taskRowRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const detailHeadingRef = useRef<HTMLHeadingElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const opportunityReviewRef = useRef<OpportunityPersonalReviewHandle | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 700px)");
    const update = () => setNarrow(media.matches);
    update(); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => { if (inspectedTaskId || inspectedOpportunityKey) window.requestAnimationFrame(() => detailHeadingRef.current?.focus({ preventScroll: true })); }, [inspectedTaskId, inspectedOpportunityKey, narrow]);
  useEffect(() => { annotationsRef.current = annotations; }, [annotations]);
  useEffect(() => {
    if (!uxV2) return;
    let active = true;
    const timer = window.setTimeout(() => {
      setOpportunityState({ status: "loading", rows: [], failed: [], error: "" });
      void loadAuthorizedProfileOpportunities(globalProfileScope).then(result => {
        if (active) setOpportunityState({ status: "ready", rows: result.rows, failed: result.failed, error: "" });
      }).catch(error => {
        if (active) setOpportunityState({ status: "error", rows: [], failed: [], error: error instanceof Error ? error.message : "Opportunities could not be loaded." });
      });
    }, 0);
    return () => { active = false; clearTimeout(timer); };
  }, [globalProfileScope, uxV2]);
  useEffect(() => {
    if (!uxV2) return;
    let active = true;
    void fetch(`${apiBaseUrl}/account-catalogue/source`, { cache: "no-store", credentials: "include" })
      .then(async response => response.ok ? (await response.json() as MasterAccountCatalogue).records : [])
      .then(records => { if (active) setBookmakerCatalogue(records); })
      .catch(() => { if (active) setBookmakerCatalogue([]); });
    return () => { active = false; };
  }, [uxV2]);
  useEffect(() => {
    if (!uxV2) return;
    let active = true;
    const refreshAnnotations = () => {
      if ([...workQueuesRef.current.values()].some(queue => queue.running)) return;
      const readId = ++annotationsReadIdRef.current;
      const writeEpoch = annotationsWriteEpochRef.current;
      void loadTaskAnnotations().then(rows => {
        if (active && readId === annotationsReadIdRef.current && writeEpoch === annotationsWriteEpochRef.current && ![...workQueuesRef.current.values()].some(queue => queue.running)) {
          annotationsRef.current = rows;
          setAnnotations(rows);
        }
      });
    };
    refreshAnnotations();
    window.addEventListener(TASK_ANNOTATIONS_REFRESH_EVENT, refreshAnnotations);
    return () => { active = false; window.removeEventListener(TASK_ANNOTATIONS_REFRESH_EVENT, refreshAnnotations); };
  }, [uxV2]);
  useEffect(() => {
    if (!uxV2) return;
    const frame = requestAnimationFrame(() => { setCollection(initialCollection); setPage(1); setInspectedTaskId(""); setInspectedOpportunityKey(deepLinkedOpportunity); });
    return () => cancelAnimationFrame(frame);
  }, [deepLinkedOpportunity, initialCollection, uxV2]);
  useEffect(() => {
    if (!uxV2) return;
    const frame = requestAnimationFrame(() => { setProfileId(globalProfileScope ?? "all"); setPage(1); setInspectedTaskId(""); setInspectedOpportunityKey(deepLinkedOpportunity); });
    return () => cancelAnimationFrame(frame);
  }, [deepLinkedOpportunity, globalProfileScope, uxV2]);
  useEffect(() => {
    const showActionable = () => {
      setDueState("today"); setQuery(""); setProfileId(globalProfileScope ?? "all"); setBookmaker("all");
      setNotificationType("all"); setSource("all"); setSort("priority");
      setPage(1); setInspectedTaskId(""); setInspectedOpportunityKey(""); setLayout("List"); setCollection("all"); window.scrollTo({ top: 0 });
    };
    window.addEventListener(TODAY_ACTIONABLE_NAVIGATION_EVENT, showActionable);
    return () => window.removeEventListener(TODAY_ACTIONABLE_NAVIGATION_EVENT, showActionable);
  }, [globalProfileScope]);

  const applyViewState = useCallback((next: NotificationViewState) => {
    viewStateRef.current = next;
    setViewState(next);
    try {
      window.localStorage.setItem(FUND_MANAGER_NOTIFICATIONS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Server persistence remains authoritative when browser storage is unavailable.
    }
  }, []);

  const refresh = useCallback(async (showLoading = true) => {
    const requestVersion = ++refreshVersionRef.current;
    const stateRequestVersion = stateRequestVersionRef.current;
    if (showLoading) setIsLoading(true);
    setNow(new Date());
    try {
      const [response, persistedState, preferences, persistedAnnotations] = await Promise.all([
        fetch(`${apiBaseUrl}/fund-manager/notifications`, { cache: "no-store", credentials: "include" }),
        loadPersistedNotificationState(),
        loadPersistedNotificationPreferences(),
        uxV2 ? loadTaskAnnotations() : Promise.resolve(null),
      ]);
      if (!response.ok || !persistedState || !preferences) throw new Error("Task evidence unavailable");
      const remote = currentDailyTasks(await response.json() as FundManagerNotification[]);
      const verifiedSources = uxV2 ? await loadDailyTaskSourceIndex(remote) : emptyDailyTaskSourceIndex();
      if (requestVersion !== refreshVersionRef.current) return;
      if (stateRequestVersion === stateRequestVersionRef.current) applyViewState(persistedState);
      setNotifications(filterFundManagerNotificationsForViewer(remote, preferences));
      setSourceIndex(verifiedSources);
      if (uxV2) setAnnotations(persistedAnnotations);
      setLoadFailed(false);
    } catch {
      if (requestVersion !== refreshVersionRef.current) return;
      setNotifications([]);
      setSourceIndex(emptyDailyTaskSourceIndex());
      setLoadFailed(true);
    } finally {
      if (requestVersion === refreshVersionRef.current) setIsLoading(false);
    }
  }, [applyViewState, uxV2]);

  useEffect(() => {
    let active = true;
    const handleRefresh = (event: Event) => {
      if (!active) return;
      if (event instanceof CustomEvent && event.detail?.scope === "notification-state") {
        const persisted = normalizeNotificationViewState(event.detail.state);
        stateRequestVersionRef.current += 1;
        applyViewState(persisted);
      }
      void refresh(false);
    };
    const initialRefresh = window.setTimeout(() => void refresh(), 0);
    window.addEventListener(FUND_MANAGER_NOTIFICATIONS_REFRESH_EVENT, handleRefresh);
    return () => {
      active = false;
      window.clearTimeout(initialRefresh);
      window.removeEventListener(FUND_MANAGER_NOTIFICATIONS_REFRESH_EVENT, handleRefresh);
    };
  }, [applyViewState, refresh]);

  const persistState = async (next: NotificationViewState, failureMessage: string) => {
    if (stateMutationPendingRef.current) return false;
    stateMutationPendingRef.current = true;
    setIsPersistingState(true);
    setActionError("");
    const mutationVersion = stateRequestVersionRef.current + 1;
    stateRequestVersionRef.current = mutationVersion;
    try {
      const persisted = await persistNotificationState(next);
      if (!persisted) {
        setActionError(failureMessage);
        return false;
      }
      if (mutationVersion === stateRequestVersionRef.current) applyViewState(persisted);
      window.dispatchEvent(new CustomEvent(FUND_MANAGER_NOTIFICATIONS_REFRESH_EVENT, {
        detail: { scope: "notification-state", state: persisted },
      }));
      return true;
    } finally {
      stateMutationPendingRef.current = false;
      setIsPersistingState(false);
    }
  };

  const taskViews = useMemo(
    () => notifications.map((item) => deriveDailyTaskView(item, viewState, now, sourceIndex, uxV2 ? "v2" : "legacy")),
    [notifications, now, sourceIndex, uxV2, viewState]
  );
  const scopedTaskViews = useMemo(() => uxV2 && globalProfileScope ? taskViews.filter(task => task.notification.profile_id === globalProfileScope) : taskViews, [globalProfileScope, taskViews, uxV2]);
  const profiles = useMemo(
    () => [...new Map(notifications.map((item) => [item.profile_id, item.profile_name])).entries()]
      .sort((a, b) => a[1].localeCompare(b[1])),
    [notifications]
  );
  const bookmakers = useMemo(
    () => [...new Set(notifications.map((item) => item.bookmaker_label).filter(Boolean))].sort(),
    [notifications]
  );
  const types = useMemo(
    () => [...new Set(notifications.map((item) => item.notification_type))].sort(),
    [notifications]
  );
  const counts = useMemo(() => dueViews.reduce<Record<DailyTaskDueState, number>>(
    (result, view) => ({ ...result, [view.id]: scopedTaskViews.filter((task) => task.dueState === view.id).length }),
    { today: 0, upcoming: 0, overdue: 0, completed: 0 }
  ), [scopedTaskViews]);
  const actionableCount = useMemo(() => scopedTaskViews.filter(isActionableDailyTask).length, [scopedTaskViews]);
  const activeFilterCount = [query.trim(), !globalProfileScope && profileId !== "all", bookmaker !== "all", notificationType !== "all", source !== "all", dueState !== "today"].filter(Boolean).length;
  const filtered = useMemo(() => {
    const options = { profileId, bookmaker, notificationType, source, query, sort, legacySort: !uxV2 };
    const rows = filterAndSortDailyTasks(scopedTaskViews, { ...options, dueState: uxV2 && collection === "tracked" ? undefined : uxV2 && dueState === "today" ? "actionable" : dueState });
    return collection === "tracked" ? rows.filter(task => annotations?.some(item => item.tracked && item.source_status === "active" && !item.reviewed_at && item.occurrence_key === task.notification.notification_id)) : rows;
  }, [annotations, bookmaker, collection, dueState, notificationType, profileId, query, sort, source, scopedTaskViews, uxV2]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const pageDateGroups = sort === "priority" ? orderedTaskGroups(paginated) : [];
  const matchedOpportunities = opportunityState.rows.map(item => ({ item, task: scopedTaskViews.find(task => task.notification.notification_type === "profile_opportunity_reminder" && task.notification.profile_id === item.profileId && task.notification.record_id === item.opportunity_key) })).filter(entry => entry.task);
  const opportunityTargets = opportunityState.rows.flatMap(item => {
    const task = matchedOpportunities.find(entry => entry.item.profileId === item.profileId && entry.item.opportunity_key === item.opportunity_key)?.task;
    const occurrenceKey = task?.notification.notification_id ?? (opportunityAnnotationExtensionEnabled ? opportunityAnnotationOccurrence(item) : null);
    return occurrenceKey ? [{ item, occurrenceKey }] : [];
  });
  const untrackedOpportunityTargets = opportunityTargets.filter(target => !annotations?.some(row => row.profile_id === target.item.profileId && row.occurrence_key === target.occurrenceKey && (row.tracked || row.reviewed_at)));
  const opportunityViewAllHref = globalProfileScope ? `/opportunities?scope=${encodeURIComponent(globalProfileScope)}` : "/opportunities";
  useEffect(() => {
    const target = searchParams.get("task");
    if (!uxV2 || collection !== "tracked" || !target) return;
    const index = filtered.findIndex(task => task.notification.notification_id === target);
    if (index >= 0) {
      const frame = requestAnimationFrame(() => { setPage(Math.floor(index / pageSize) + 1); setInspectedTaskId(target); });
      return () => cancelAnimationFrame(frame);
    }
  }, [collection, filtered, pageSize, searchParams, uxV2]);
  const inspectedTask = uxV2 ? paginated.find((task) => task.notification.notification_id === inspectedTaskId) ?? matchedOpportunities.find(entry => entry.task?.notification.notification_id === inspectedTaskId)?.task : undefined;
  const inspectedOpportunity = uxV2 ? opportunityState.rows.find(item => opportunityViewKey(item) === inspectedOpportunityKey) : undefined;
  const inspectedOpportunityAnnotation = annotations?.find(item => item.occurrence_key === inspectedOpportunityKey && (!globalProfileScope || item.profile_id === globalProfileScope));
  const opportunityInspectorOpen = Boolean(inspectedOpportunity || inspectedOpportunityAnnotation);
  const annotationFor = (task: DailyTaskView) => annotations?.find(item => item.occurrence_key === task.notification.notification_id && item.profile_id === task.notification.profile_id);
  const workKey = (task: DailyTaskView) => `${task.notification.profile_id}:${task.notification.notification_id}`;
  const mergeAcknowledgedAnnotations = (rows: TaskAnnotation[]) => {
    const next = [...(annotationsRef.current ?? annotations ?? []).filter(item => !rows.some(row => row.profile_id === item.profile_id && row.occurrence_key === item.occurrence_key)), ...rows];
    annotationsWriteEpochRef.current += 1;
    annotationsRef.current = next;
    setAnnotations(next);
  };
  const flushWorkQueue = async (key: string) => {
    const queue = workQueuesRef.current.get(key);
    if (!queue || queue.running) return;
    queue.running = true;
    setTrackingPending(true);
    let completedRevision: number | null = null;
    while (true) {
      const revision = queue.revision;
      const intent = queue.desired;
      const task = queue.task;
      if (intent.work_state === "Do Later" && !/^\d{4}-\d{2}-\d{2}$/.test(intent.review_date ?? "")) {
        if (activeTaskIdRef.current === task.notification.notification_id) setWorkSaveStatus("needs-date");
        break;
      }
      const result = await patchTaskAnnotations([{ profile_id: task.notification.profile_id, occurrence_key: task.notification.notification_id,
        tracked: queue.lastRow?.tracked ?? false, ...intent, expected_version: queue.lastRow?.version ?? 0 }]);
      if (result.error || !result.rows) {
        if (activeTaskIdRef.current === task.notification.notification_id) {
          setWorkSaveStatus("failed");
          setWorkSaveError(result.error ?? "Unable to save work state. Retry.");
        }
        break;
      }
      const saved = result.rows.find(row => row.profile_id === task.notification.profile_id && row.occurrence_key === task.notification.notification_id);
      if (!saved) {
        if (activeTaskIdRef.current === task.notification.notification_id) { setWorkSaveStatus("failed"); setWorkSaveError("Saved work state could not be confirmed. Retry."); }
        break;
      }
      queue.lastRow = saved;
      mergeAcknowledgedAnnotations([saved]);
      if (queue.revision === revision) {
        if (activeTaskIdRef.current === task.notification.notification_id) { setWorkSaveStatus("saved"); setWorkSaveError(""); }
        completedRevision = revision;
        break;
      }
    }
    queue.running = false;
    if (completedRevision !== null && queue.revision === completedRevision && workQueuesRef.current.get(key) === queue) workQueuesRef.current.delete(key);
    if (![...workQueuesRef.current.values()].some(item => item.running)) setTrackingPending(false);
  };
  const queueWorkSave = (task: DailyTaskView, desired: WorkIntent) => {
    const key = workKey(task);
    const current = workQueuesRef.current.get(key);
    const row = annotationsRef.current?.find(item => item.profile_id === task.notification.profile_id && item.occurrence_key === task.notification.notification_id) ?? null;
    const queue = current ?? { task, desired, revision: 0, running: false, lastRow: row };
    if (current && !current.running) queue.lastRow = row;
    queue.task = task;
    queue.desired = desired;
    queue.revision += 1;
    workQueuesRef.current.set(key, queue);
    setWorkSaveStatus("saving");
    setWorkSaveError("");
    void flushWorkQueue(key);
  };
  const retryWorkSave = async (task: DailyTaskView) => {
    const queue = workQueuesRef.current.get(workKey(task));
    if (!queue || queue.running) return;
    setWorkSaveStatus("saving");
    const latest = await loadTaskAnnotations();
    if (!latest) { setWorkSaveStatus("failed"); setWorkSaveError("Work state could not be reloaded. Retry."); return; }
    annotationsWriteEpochRef.current += 1;
    annotationsRef.current = latest;
    setAnnotations(latest);
    queue.lastRow = latest.find(row => row.profile_id === task.notification.profile_id && row.occurrence_key === task.notification.notification_id) ?? null;
    void flushWorkQueue(workKey(task));
  };
  const trackedCount = annotations?.filter(item => item.tracked && item.source_status === "active" && !item.reviewed_at && (!globalProfileScope || item.profile_id === globalProfileScope)).length ?? 0;
  const trackedHistory = annotations?.filter(item => item.tracked && item.source_status !== "active" && !item.reviewed_at && (!globalProfileScope || item.profile_id === globalProfileScope)) ?? [];
  const reviewedHistory = annotations?.filter(item => item.reviewed_at && item.occurrence_key.startsWith("profile-opportunity:") && (!globalProfileScope || item.profile_id === globalProfileScope)) ?? [];
  const savedTrackedCount = trackedCount + trackedHistory.length;

  const saveAnnotationTargets = async (targets: Array<{ profileId: string; occurrenceKey: string }>, tracked: boolean, override?: { work_state: TaskWorkState; blocked_reason: string | null; review_date: string | null }) => {
    if (!annotations || trackingPending || !targets.length) return;
    setTrackingPending(true); setActionError("");
    const distinct = [...new Map(targets.map(target => [`${target.profileId}:${target.occurrenceKey}`, target])).values()];
    let acknowledged = 0;
    for (let offset = 0; offset < distinct.length; offset += 32) {
      const batch: TaskAnnotationChange[] = distinct.slice(offset, offset + 32).map(target => {
        const item = annotationsRef.current?.find(row => row.profile_id === target.profileId && row.occurrence_key === target.occurrenceKey);
        return { profile_id: target.profileId, occurrence_key: target.occurrenceKey,
          tracked, work_state: override?.work_state ?? item?.work_state ?? "To Do",
          blocked_reason: override ? override.blocked_reason : item?.blocked_reason ?? null,
          review_date: override ? override.review_date : item?.review_date ?? null,
          expected_version: item?.version ?? 0 };
      });
      const result = await patchTaskAnnotations(batch);
      if (result.error || !result.rows) { setActionError(`${acknowledged} of ${distinct.length} task changes confirmed. ${result.error ?? "Refresh and retry the remaining tasks."}`); break; }
      mergeAcknowledgedAnnotations(result.rows);
      acknowledged += result.rows.length;
    }
    setTrackingPending(false);
  };
  const saveAnnotations = (rows: DailyTaskView[], tracked: boolean, override?: { work_state: TaskWorkState; blocked_reason: string | null; review_date: string | null }) =>
    saveAnnotationTargets(rows.map(task => ({ profileId: task.notification.profile_id, occurrenceKey: task.notification.notification_id })), tracked, override);
  const untrackHistory = async (item: TaskAnnotation) => {
    if (trackingPending) return;
    setTrackingPending(true); setActionError("");
    const result = await patchTaskAnnotations([{ profile_id: item.profile_id, occurrence_key: item.occurrence_key, tracked: false,
      work_state: item.work_state, blocked_reason: item.blocked_reason, review_date: item.review_date,
      expected_version: item.version }]);
    if (result.error) setActionError(result.error);
    else if (result.rows) mergeAcknowledgedAnnotations(result.rows);
    setTrackingPending(false);
  };
  const flushOpportunityReview = async () => opportunityReviewRef.current?.flush() ?? true;
  const inspectTask = async (task: DailyTaskView) => {
    if (!(await flushOpportunityReview())) return;
    setInspectedOpportunityKey("");
    const item = annotationFor(task);
    setDraftState(item?.work_state ?? "To Do");
    setDraftBlockedReason(item?.blocked_reason ?? "");
    setDraftReviewDate(item?.review_date ?? "");
    activeTaskIdRef.current = task.notification.notification_id;
    setWorkSaveStatus("idle"); setWorkSaveError("");
    returnFocusRef.current = taskRowRefs.current.get(task.notification.notification_id) ?? null;
    setInspectedTaskId(task.notification.notification_id);
  };

  const inspectOpportunity = async (item: OwnedOpportunity) => {
    const key = opportunityViewKey(item);
    if (key === inspectedOpportunityKey) return;
    if (!(await flushOpportunityReview())) return;
    activeTaskIdRef.current = "";
    setInspectedTaskId("");
    returnFocusRef.current = taskRowRefs.current.get(key) ?? null;
    setInspectedOpportunityKey(key);
  };

  const closeInspector = async () => {
    if (!(await flushOpportunityReview())) return;
    const returnId = inspectedOpportunityKey || inspectedTaskId;
    activeTaskIdRef.current = "";
    setInspectedTaskId("");
    setInspectedOpportunityKey("");
    window.requestAnimationFrame(() => (returnFocusRef.current?.isConnected ? returnFocusRef.current : taskRowRefs.current.get(returnId))?.focus({ preventScroll: true }));
  };

  const changeControls = (change: () => void) => {
    change();
    setPage(1);
  };

  const openTask = async (item: FundManagerNotification) => {
    if (openingId || isLoading) return;
    const requestVersion = ++refreshVersionRef.current;
    setOpeningId(item.notification_id);
    setActionError("");
    try {
      const response = await fetch(`${apiBaseUrl}/fund-manager/notifications`, { cache: "no-store", credentials: "include" });
      if (!response.ok) throw new Error("Unable to recheck task access. Refresh and retry.");
      const current = currentDailyTasks(await response.json() as FundManagerNotification[]);
      if (requestVersion !== refreshVersionRef.current) return;
      setNotifications(current);
      const fresh = current.find((candidate) => candidate.notification_id === item.notification_id);
      if (!fresh) {
        setActionError("This task changed or is no longer available to you. The list has refreshed.");
        return;
      }
      void persistState(markNotificationsRead(viewStateRef.current, [fresh], new Date()), "Unable to mark this task as read.");
      beginRouteTransition();
      router.push(fresh.href);
    } catch (error) {
      if (requestVersion === refreshVersionRef.current) {
        setNotifications([]);
        setLoadFailed(true);
        setActionError(error instanceof Error ? error.message : "Unable to open task.");
      }
    } finally {
      setOpeningId("");
    }
  };

  const taskRow = (task: DailyTaskView, board = false) => {
    const item = task.notification;
    const annotation = annotationFor(task);
    return <div className={designTodayTaskWithActionClass} data-inspector-open={Boolean(inspectedTask || opportunityInspectorOpen)} data-pd-id={`tasks.item.${item.notification_id}`} key={item.notification_id} role="listitem">
      <DesignTodayTaskRow accessibleName={`Inspect ${item.title} · ${item.profile_name}`} active={inspectedTaskId === item.notification_id}
        board={board} context={<>{item.bookmaker_label || item.ledger_label} · {item.profile_name}</>}
        controls="tasks-v2-inspector" dataPdId={`tasks.v2.row.${item.notification_id}`}
        date={task.dueLabel} dateTime={task.dateContext?.kind !== "unknown" ? item.notification_type === "profile_opportunity_reminder" ? item.settles_at : item.due_at : undefined} icon={sourceIcon(item.ledger_label)}
        onClick={() => void inspectTask(task)}
        ref={(node) => { if (node) taskRowRefs.current.set(item.notification_id, node); else taskRowRefs.current.delete(item.notification_id); }}
        selectionMode="expanded" state={annotation?.tracked ? <DesignLabTaskState state={annotation.work_state} /> : board ? priorityLabel(task.priority) : undefined}
        title={item.title} urgent={task.priority === "high"} />
      {annotations && !inspectedTask && !opportunityInspectorOpen ? <button aria-label={`${annotation?.tracked ? "Untrack" : "Track"} ${item.title} · ${item.profile_name}`} aria-pressed={Boolean(annotation?.tracked)} className={designTodayBulkTrackClass} data-pd-id={`tasks.v2.track.${item.notification_id}`} disabled={trackingPending || annotation?.source_status === "resolved"} onClick={() => void saveAnnotations([task], !annotation?.tracked)} type="button">{annotation?.tracked ? "Untrack" : "Track"}</button> : null}
    </div>;
  };

  const taskDetails = inspectedTask ? <DesignTodayDetail
    dataPdId="tasks.v2.detail" eyebrow={<>Task Details · {taskTypeLabel(inspectedTask.notification.notification_type)}</>}
    headingRef={detailHeadingRef} onClose={() => void closeInspector()} title={inspectedTask.notification.title}
    urgent={inspectedTask.priority === "high"}>
    <dl className={designTodayPropertiesClass}>
      <div><dt>Profile</dt><dd>{inspectedTask.notification.profile_name}</dd></div>
      <div><dt>Bookmaker / Provider</dt><dd><BookmakerIdentity bookmaker={inspectedTask.notification.bookmaker_label || inspectedTask.notification.ledger_label} catalogue={bookmakerCatalogue} mode="Brand badge" /></dd></div>
      <div><dt>Date Context</dt><dd>{inspectedTask.dueLabel}{inspectedTask.dateContext ? <small title={inspectedTask.dateContext.exact}>{inspectedTask.dateContext.clarification} {inspectedTask.dateContext.kind !== "unknown" ? inspectedTask.dateContext.exact : ""}</small> : null}</dd></div>
      {(() => { const source = inspectedTask.notification.ledger_label === "Sportsbook Bets" ? sourceIndex.sportsbook.get(`${inspectedTask.notification.profile_id}:${inspectedTask.notification.record_id}`) : inspectedTask.notification.ledger_label === "Free Bets" ? sourceIndex.freeBets.get(`${inspectedTask.notification.profile_id}:${inspectedTask.notification.record_id}`) : undefined; return source ? <><div><dt>Recorded Status</dt><dd><span className={`table-chip${["Placed", "Settled"].includes(source.status ?? "") ? ` table-chip-status-${source.status!.toLowerCase()}` : ""}`}>{source.status || "Not recorded"}</span></dd></div><div><dt>Recorded Result</dt><dd>{source.result || "Not recorded"}</dd></div>{inspectedTask.notification.notification_type === "settlement_review" ? <div><dt>Settlement</dt><dd>Not yet recorded</dd></div> : null}</> : null; })()}
      <div><dt>Task Type</dt><dd>{taskTypeLabel(inspectedTask.notification.notification_type)}</dd></div>
      <div><dt>Priority</dt><dd>{inspectedTask.priorityReason}</dd></div>
      {annotations ? <div><dt>Work State</dt><dd><DesignLabTaskState state={annotationFor(inspectedTask)?.work_state ?? "To Do"} /></dd></div> : null}
      <div><dt>Source</dt><dd>{inspectedTask.notification.ledger_label} · {inspectedTask.notification.record_id}</dd></div>
    </dl>
    <p className={designTodayDetailTextClass}>{inspectedTask.evidence}</p>
    {actionError ? <p className="notification-action-error" role="alert">{actionError}</p> : null}
    {annotations ? <div className={designTodayStateEditorClass}>
      <DesignLabSelect dataPdId={`tasks.v2.work-state.${inspectedTask.notification.notification_id}`} label="Work State" onChange={next => {
        const state = next as TaskWorkState;
        setDraftState(state);
        queueWorkSave(inspectedTask, { work_state: state, blocked_reason: state === "Blocked" ? draftBlockedReason.trim() || null : null, review_date: state === "Do Later" ? draftReviewDate : null });
      }} options={(["To Do", "In Progress", "Blocked", "Do Later"] as TaskWorkState[]).map(value => ({ value, label: value }))} value={draftState} />
      {draftState === "Blocked" ? <label>Blocked Reason<input aria-label={`${inspectedTask.notification.title} blocked reason`} maxLength={500} onBlur={() => queueWorkSave(inspectedTask, { work_state: "Blocked", blocked_reason: draftBlockedReason.trim() || null, review_date: null })} onChange={event => setDraftBlockedReason(event.target.value)} value={draftBlockedReason} /></label> : null}
      {draftState === "Do Later" ? <label>Review / Resume Date<input aria-label={`${inspectedTask.notification.title} review date`} onChange={event => { const date = event.target.value; setDraftReviewDate(date); queueWorkSave(inspectedTask, { work_state: "Do Later", blocked_reason: null, review_date: date || null }); }} type="date" value={draftReviewDate} /></label> : null}
      <p aria-live="polite" data-pd-id="tasks.v2.work-save-status" role="status">{workSaveStatus === "saving" ? "Saving work state…" : workSaveStatus === "saved" ? "Work state saved" : workSaveStatus === "needs-date" ? "Choose a valid review date to save Do Later." : workSaveStatus === "failed" ? "Work state was not saved." : ""}</p>
      {workSaveStatus === "failed" ? <div role="alert"><span>{workSaveError}</span><button onClick={() => void retryWorkSave(inspectedTask)} type="button">Retry Work State</button></div> : null}
    </div> : <p>Tracking is temporarily unavailable. Refresh or sign in again.</p>}
    <div className={designTodayDetailActionsClass}>
      <Link aria-busy={openingId === inspectedTask.notification.notification_id} className={designTodayPrimaryActionClass} href={inspectedTask.notification.href}
        onClick={(event) => { event.preventDefault(); endRouteTransition(); void openTask(inspectedTask.notification); }} prefetch={false}>
        {openingId === inspectedTask.notification.notification_id ? "Checking Access…" : sourceActionLabel(inspectedTask.notification.ledger_label, inspectedTask.notification.href)}
      </Link>
      {annotations ? <button aria-pressed={Boolean(annotationFor(inspectedTask)?.tracked)} disabled={trackingPending} onClick={() => void saveAnnotations([inspectedTask], !annotationFor(inspectedTask)?.tracked)} type="button">{annotationFor(inspectedTask)?.tracked ? "Untrack" : "Track Task"}</button> : null}
      <details><summary>More task actions</summary><button disabled={isPersistingState} onClick={() => void persistState(inspectedTask.dueState === "completed" ? restoreNotificationIds(viewStateRef.current, [inspectedTask.notification.notification_id]) : dismissNotificationIds(viewStateRef.current, [inspectedTask.notification.notification_id]), "Unable to update this task.")} type="button">
        {inspectedTask.dueState === "completed" ? "Restore To Tasks" : "Clear From Tasks"}
      </button></details>
    </div>
    <small>Clearing changes this work list only. The source record and notification history remain.</small>
  </DesignTodayDetail> : null;

  const opportunityDetails = inspectedOpportunity || inspectedOpportunityAnnotation ? <DesignTodayDetail
    closeLabel="Close Opportunity Details" dataPdId="tasks.v2.opportunity-detail" eyebrow="Advisory opportunity"
    headingRef={detailHeadingRef} onClose={() => void closeInspector()} title="Opportunity Details">
    <h3>{opportunityReviewTitle(inspectedOpportunity?.label ?? inspectedOpportunityAnnotation?.title ?? "Opportunity")}</h3>
    <dl className={designTodayPropertiesClass}>
      <div><dt>Profile</dt><dd>{inspectedOpportunity?.profileName ?? inspectedOpportunityAnnotation?.profile_name}</dd></div>
      <div><dt>Bookmaker / Provider</dt><dd>{inspectedOpportunity?.bookmaker ? <BookmakerIdentity bookmaker={inspectedOpportunity.bookmaker} catalogue={bookmakerCatalogue} mode="Brand badge" /> : "Not available from the current source"}</dd></div>
      {inspectedOpportunity?.source ? <div><dt>Recorded source</dt><dd>{inspectedOpportunity.source === "signup_account" ? "Profile Account signup status" : "Saved Profile quick action"}</dd></div> : null}
      {inspectedOpportunity?.ledger_type ? <div><dt>Source ledger</dt><dd>{inspectedOpportunity.ledger_type}</dd></div> : null}
      {inspectedOpportunity?.recurrence ? <div><dt>Recorded recurrence</dt><dd>{inspectedOpportunity.recurrence}</dd></div> : null}
      {inspectedOpportunity?.already_created ? <div><dt>Linked record</dt><dd>A Prospecting record is recorded; check its current state in Accounts.</dd></div> : null}
      {inspectedOpportunityAnnotation ? <div><dt>Personal work state</dt><dd><DesignLabTaskState state={inspectedOpportunityAnnotation.work_state} /></dd></div> : <div><dt>Personal work state</dt><dd>Not tracked</dd></div>}
      {inspectedOpportunityAnnotation?.reviewed_at ? <div><dt>Personal review</dt><dd>Reviewed · {new Date(inspectedOpportunityAnnotation.reviewed_at).toLocaleString("en-GB", { timeZone: "Europe/London" })}</dd></div> : null}
      {inspectedOpportunityAnnotation?.source_status && inspectedOpportunityAnnotation.source_status !== "active" ? <div><dt>Source state</dt><dd>{inspectedOpportunityAnnotation.source_status === "resolved" ? "A source record has been created; personal review remains separate." : inspectedOpportunityAnnotation.source_status === "changed" ? "Source changed; review its current details." : "Source unavailable; saved personal history is retained."}</dd></div> : null}
    </dl>
    {inspectedOpportunity?.risk_warnings?.length ? <section aria-label="Recorded restrictions"><h3>Recorded restrictions</h3><ul>{inspectedOpportunity.risk_warnings.map((warning, index) => <li key={`${index}:${warning}`}>{warning}</li>)}</ul></section> : null}
    <p className={designTodayDetailTextClass}>{inspectedOpportunity ? opportunityReviewGuidance(inspectedOpportunity) : "This source is unavailable. The saved opportunity identity remains in your personal task history."}</p>
    <p className={designTodayDetailTextClass}>This is advisory work. Tracking or reviewing it does not confirm an offer, create a bet or settle a financial source.</p>
    {opportunityPersonalReviewEnabled && inspectedOpportunityKey.startsWith("profile-opportunity:") ? <OpportunityPersonalReview annotation={inspectedOpportunityAnnotation ?? null} key={inspectedOpportunityKey} occurrenceKey={inspectedOpportunityKey} onAcknowledged={mergeAcknowledgedAnnotations} profileId={inspectedOpportunity?.profileId ?? inspectedOpportunityAnnotation?.profile_id ?? ""} ref={opportunityReviewRef} sourceAvailable={Boolean(inspectedOpportunity)} /> : <p className={designTodayDetailTextClass}>Personal Next action, Notes and Mark reviewed await a separately approved annotation extension. Existing Track / Untrack remains available.</p>}
    <div className={designTodayDetailActionsClass}>
      <Link className={designTodayPrimaryActionClass} href={`/profiles/${encodeURIComponent(inspectedOpportunity?.profileId ?? inspectedOpportunityAnnotation?.profile_id ?? "")}/tracker/accounts#profile-opportunities`} onClick={event => { event.preventDefault(); const href = event.currentTarget.href; void (async () => { if (await flushOpportunityReview()) router.push(href); })(); }}>Open Accounts</Link>
      {!opportunityPersonalReviewEnabled && annotations && (inspectedOpportunityAnnotation?.tracked || inspectedOpportunity && opportunityAnnotationOccurrence(inspectedOpportunity)) ? <button aria-pressed={Boolean(inspectedOpportunityAnnotation?.tracked)} disabled={trackingPending} onClick={() => void saveAnnotationTargets([{ profileId: inspectedOpportunity?.profileId ?? inspectedOpportunityAnnotation!.profile_id, occurrenceKey: inspectedOpportunityKey }], !inspectedOpportunityAnnotation?.tracked)} type="button">{inspectedOpportunityAnnotation?.tracked ? "Untrack" : "Track"}</button> : null}
    </div>
  </DesignTodayDetail> : null;

  return (
    <main className={`page-shell stack daily-tasks-page${uxV2 ? " ux-v2-today" : ""}`} data-pd-id="tasks.page">
      {uxV2 ? <DesignPageHead dataPdId="tasks.page-header">
        <div><h1>Today</h1></div>
        <div className={designPageHeadClasses.actions}>
          <span title="Needs Action retains unresolved urgent work regardless of its recorded date; other views use source task dates.">
            <DesignLabSelect dataPdId="tasks.v2.date-view" label="Task date view" onChange={value => changeControls(() => setDueState(value as DailyTaskDueState))} options={dueViews.map(view => ({ value: view.id, label: view.id === "today" ? "Needs Action · all dates" : view.label }))} value={dueState} />
          </span>
          <Link className="text-link" href="/notifications">Notifications</Link>
        </div>
      </DesignPageHead> : <section className="hero-panel split-hero" data-pd-id="tasks.page-header">
        <div className="stack">
          <span className="eyebrow">Fund Manager</span>
          <h1>Daily Tasks</h1>
          <p>Prioritised actions from recorded Plum Duff evidence. Completing a task changes this work list only; its source record and Notification History remain intact.</p>
          <Link className="text-link" href="/notifications">Notification History</Link>
        </div>
        <aside className="shell-note stack" aria-label="Daily Task summary">
          <span className="eyebrow">Actionable Now</span>
          <strong aria-hidden={isLoading}>{isLoading || loadFailed ? "—" : actionableCount}</strong>
        </aside>
      </section>}

      <section aria-label="Daily Tasks" className={uxV2 ? designTodayRootClass : "content-panel stack"} data-pd-id="tasks.workspace">
        {uxV2 ? <>
          <nav aria-label="Today collections" className={designTodayDetailActionsClass} data-pd-id="tasks.v2.collections">
            <button aria-current={collection === "all" ? "page" : undefined} onClick={() => void (async () => { if (!(await flushOpportunityReview())) return; setCollection("all"); setDueState("today"); setPage(1); setInspectedTaskId(""); setInspectedOpportunityKey(""); router.replace(globalProfileScope ? `/tasks?scope=${encodeURIComponent(globalProfileScope)}` : "/tasks"); })()} type="button">All Tasks</button>
            <button aria-current={collection === "tracked" ? "page" : undefined} disabled={!annotations} onClick={() => void (async () => { if (!(await flushOpportunityReview())) return; setCollection("tracked"); setDueState("today"); setPage(1); setInspectedTaskId(""); setInspectedOpportunityKey(""); router.replace(globalProfileScope ? `/tasks?scope=${encodeURIComponent(globalProfileScope)}&collection=tracked` : "/tasks?collection=tracked"); })()} type="button">Tracked Tasks{annotations ? ` (${savedTrackedCount})` : ""}</button>
            {!annotations ? <small>Tracking is temporarily unavailable. Refresh or sign in again.</small> : null}
          </nav>
          <DesignTodayToolbar dataPdId="tasks.v2.toolbar" summary={<><strong>{isLoading || loadFailed ? "—" : actionableCount} Needs Attention</strong><span>{counts.upcoming} Upcoming</span><span>{counts.completed} Completed</span></>} actions={<>
            <DesignTodayViewToggle dataPdId="tasks.v2.layout-toggle" layout={layout} onChange={(next) => void (async () => { if (!(await flushOpportunityReview())) return; setLayout(next); setInspectedTaskId(""); setInspectedOpportunityKey(""); })()} />
            <button aria-expanded={filtersOpen} className={designTodayToolButtonClass} data-pd-id="tasks.v2.filter-toggle" onClick={() => setFiltersOpen(value => !value)} type="button"><span aria-hidden="true" className="material-symbols-outlined">filter_list</span>Filters{activeFilterCount ? ` ${activeFilterCount}` : ""}</button>
            <span title="Recommended priority, then due time, with stable source tie-breakers"><DesignLabSelect compact dataPdId="tasks.sort" label="Sort Daily Tasks by priority, then due time" onChange={value => changeControls(() => setSort(value))} options={[{ value: "priority", label: "Priority" }, { value: "due", label: "Due Time" }, { value: "profile", label: "Profile" }, { value: "bookmaker", label: "Bookmaker" }]} value={sort} /></span>
          </>} />
          {filtersOpen ? <DesignTodayFilters dataPdId="tasks.v2.filters">
            <label className="field-control table-search-field"><span>Search Tasks</span><input aria-label="Search Daily Tasks" data-pd-id="tasks.search" onChange={(event) => changeControls(() => setQuery(event.target.value))} placeholder="Task, Profile, bookmaker or record" type="search" value={query} /></label>
            {!globalProfileScope ? <label className="field-control table-filter-field"><span>Profile</span><select aria-label="Filter Tasks By Profile" onChange={(event) => changeControls(() => setProfileId(event.target.value))} value={profileId}><option value="all">All Authorised Active Profiles</option>{profiles.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label> : null}
            <label className="field-control table-filter-field"><span>Bookmaker</span><select aria-label="Filter Tasks By Bookmaker" onChange={(event) => changeControls(() => setBookmaker(event.target.value))} value={bookmaker}><option value="all">All Bookmakers</option>{bookmakers.map(value => <option key={value}>{value}</option>)}</select></label>
            <label className="field-control table-filter-field"><span>Task Type</span><select aria-label="Filter Tasks By Type" onChange={(event) => changeControls(() => setNotificationType(event.target.value))} value={notificationType}><option value="all">All Task Types</option>{types.map(value => <option key={value} value={value}>{taskTypeLabel(value)}</option>)}</select></label>
            <label className="field-control table-filter-field"><span>Source</span><select aria-label="Filter Tasks By Source" onChange={(event) => changeControls(() => setSource(event.target.value as DailyTaskSource | "all"))} value={source}><option value="all">All Sources</option><option value="deterministic">Deterministic</option><option value="recurring" disabled>Recurring — Not Active</option><option value="ai" disabled>AI — Not Active</option></select></label>
            <label className="field-control table-filter-field"><span>Tasks per page</span><select aria-label="Tasks per page" data-pd-id="tasks.v2.page-size" onChange={event => changeControls(() => setPageSize(Number(event.target.value)))} value={pageSize}><option value={8}>8</option><option value={16}>16</option><option value={32}>32</option></select></label>
            <button className={designTodayToolButtonClass} disabled={!activeFilterCount} onClick={() => changeControls(() => { setQuery(""); setProfileId(globalProfileScope ?? "all"); setBookmaker("all"); setNotificationType("all"); setSource("all"); setDueState("today"); })} type="button">Clear Filters</button>
            <button className={designTodayToolButtonClass} data-pd-id="tasks.refresh" disabled={isLoading || isPersistingState} onClick={() => void refresh()} type="button"><span aria-hidden="true" className="material-symbols-outlined">refresh</span>Refresh Tasks</button>
          </DesignTodayFilters> : null}
        </> : <>
        <div aria-label="Task lifecycle views" className="analytics-tab-list daily-task-tabs" data-pd-id="tasks.tabs" role="tablist">
          {dueViews.map((view) => (
            <button
              aria-controls="daily-task-panel"
              aria-selected={dueState === view.id}
              className={dueState === view.id ? "is-active" : ""}
              data-pd-id={`tasks.tabs.${view.id}`}
              id={`daily-task-tab-${view.id}`}
              key={view.id}
              onClick={() => changeControls(() => setDueState(view.id))}
              role="tab"
              type="button"
            >
              {uxV2 && view.id === "today" ? "Needs Action" : view.label}<span>{uxV2 && view.id === "today" ? counts.today + counts.overdue : counts[view.id]}</span>
            </button>
          ))}
        </div>

        <div className="table-toolbar settings-table-toolbar daily-task-toolbar" data-pd-id="tasks.table-toolbar">
          <label className="field-control table-search-field">
            <span>Search Tasks</span>
            <input aria-label="Search Daily Tasks" data-pd-id="tasks.search" onChange={(event) => changeControls(() => setQuery(event.target.value))} placeholder="Task, Profile, bookmaker or record" type="search" value={query} />
          </label>
          <div className="settings-table-filter-group daily-task-primary-controls">
            <label className="field-control table-filter-field"><span>Sort By</span><select aria-label="Sort Daily Tasks" data-pd-id="tasks.sort" onChange={(event) => changeControls(() => setSort(event.target.value as DailyTaskSort))} value={sort}><option value="priority">Priority And Due Time</option><option value="due">Due Time</option><option value="profile">Profile</option><option value="bookmaker">Bookmaker</option></select></label>
            <button className="button-link" data-pd-id="tasks.refresh" disabled={isLoading || isPersistingState} onClick={() => void refresh()} type="button"><span aria-hidden="true" className="material-symbols-outlined">refresh</span>Refresh Tasks</button>
          </div>
        </div>

        <details className="content-subpanel daily-task-filter-disclosure" data-pd-id="tasks.filters">
          <summary>More Filters</summary>
          <div className="daily-task-filter-grid">
            <label className="field-control table-filter-field"><span>Profile</span><select aria-label="Filter Tasks By Profile" onChange={(event) => changeControls(() => setProfileId(event.target.value))} value={profileId}><option value="all">All Authorised Active Profiles</option>{profiles.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
            <label className="field-control table-filter-field"><span>Bookmaker</span><select aria-label="Filter Tasks By Bookmaker" onChange={(event) => changeControls(() => setBookmaker(event.target.value))} value={bookmaker}><option value="all">All Bookmakers</option>{bookmakers.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label className="field-control table-filter-field"><span>Task Type</span><select aria-label="Filter Tasks By Type" onChange={(event) => changeControls(() => setNotificationType(event.target.value))} value={notificationType}><option value="all">All Task Types</option>{types.map((value) => <option key={value} value={value}>{taskTypeLabel(value)}</option>)}</select></label>
            <label className="field-control table-filter-field"><span>Source</span><select aria-label="Filter Tasks By Source" onChange={(event) => changeControls(() => setSource(event.target.value as DailyTaskSource | "all"))} value={source}><option value="all">All Sources</option><option value="deterministic">Deterministic</option><option value="recurring" disabled>Recurring — Not Active</option><option value="ai" disabled>AI — Not Active</option></select></label>
          </div>
        </details>
        </>}

        {actionError ? <div className="notification-action-error" role="alert">{actionError}</div> : null}
        {isLoading ? (
          <section aria-busy="true" className="tracker-summary-shell sportsbook-page-shell" data-pd-id="tasks.loading-shell"><LedgerLoadingIndicator dataPdId="tasks.loading" label="Loading Daily Tasks" /></section>
        ) : loadFailed ? (
          <div className="notification-action-error" role="alert">Daily Tasks are temporarily unavailable. Use Refresh Tasks to retry.</div>
        ) : (
          <section aria-label={uxV2 ? "Source Tasks" : undefined} aria-labelledby={uxV2 ? undefined : `daily-task-tab-${dueState}`} id="daily-task-panel" role={uxV2 ? undefined : "tabpanel"}>
            {!uxV2 ? <p aria-live="polite" className="notification-history-count" role="status">{filtered.length} {dueViews.find((view) => view.id === dueState)?.label.toLocaleLowerCase()} task{filtered.length === 1 ? "" : "s"}</p> : null}
            {!uxV2 ? <LedgerPagination ariaLabel="Daily Tasks" currentPage={currentPage} onPageChange={setPage} onPageSizeChange={(next) => { setPageSize(next); setPage(1); }} pageCount={pageCount} pageSize={pageSize} position="top" totalRows={filtered.length} /> : null}
            {uxV2 ? <>
              <div className={`${designTodayContentClass}${(inspectedTask || opportunityInspectorOpen) && !narrow ? ` ${layout === "Board" ? designTodayBoardWithDetailClass : designTodayWithDetailClass}` : ""}`} data-pd-id="tasks.v2.layout">
                <div className={designTodayQueueClass}>
                  {layout === "List" ? <section aria-label={collection === "tracked" ? "Tracked Tasks" : "Needs Action"} className={designTodayTaskCollectionClass} data-pd-id="tasks.v2.collection">
                    <div className={designTodayCollectionHeadingClass}><h2>{collection === "tracked" ? "Tracked Tasks" : dueState === "today" ? "Needs Action" : dueViews.find(view => view.id === dueState)?.label} <span>{paginated.length}</span></h2>{annotations && paginated.length ? <button aria-label={`${paginated.every(task => annotationFor(task)?.tracked) ? "Untrack" : "Track"} all ${paginated.length} tasks on this page only`} className={designTodayBulkTrackClass} data-pd-id="tasks.v2.bulk-track" disabled={trackingPending} onClick={() => void saveAnnotations(paginated, !paginated.every(task => annotationFor(task)?.tracked))} type="button">{paginated.every(task => annotationFor(task)?.tracked) ? "Untrack All" : "Track All"} · This page ({paginated.length})</button> : null}</div>
                    <div aria-label="Tasks" className={designTodayTaskListClass} role="list">{pageDateGroups.length ? pageDateGroups.map(group => <section aria-label={group} className={designTodayPriorityGroupClass} data-pd-id={`tasks.v2.date-group.${group.toLowerCase().replaceAll(" ", "-")}`} key={group}><h3>{group}</h3>{paginated.filter(task => taskDateGroup(task) === group).map(task => taskRow(task))}</section>) : paginated.map(task => taskRow(task))}</div>
                    {collection === "tracked" && trackedHistory.length ? <details data-pd-id="tasks.v2.tracked-history" onToggle={event => setSourceHistoryOpen(event.currentTarget.open)} open={sourceHistoryOpen ?? filtered.length === 0}><summary>Source history and unavailable tasks ({trackedHistory.length})</summary>{trackedHistory.map(item => <p key={`${item.profile_id}:${item.occurrence_key}`}>{item.title} · {item.source_status === "resolved" ? "Source Resolved" : item.source_status === "changed" ? "Source Changed" : "Source Unavailable"} <button aria-label={`Untrack ${item.title} from history`} disabled={trackingPending} onClick={() => void untrackHistory(item)} type="button">Untrack</button></p>)}</details> : null}
                    {collection === "tracked" && reviewedHistory.length ? <details data-pd-id="tasks.v2.reviewed-history"><summary>Completed / Reviewed history ({reviewedHistory.length})</summary>{reviewedHistory.map(item => <p key={`${item.profile_id}:${item.occurrence_key}`}>{opportunityReviewTitle(item.title)} · {item.profile_name} · {item.source_status === "active" ? "Personal review complete" : `Source ${item.source_status}`} <button onClick={event => { returnFocusRef.current = event.currentTarget; setInspectedOpportunityKey(item.occurrence_key); }} type="button">View details</button></p>)}</details> : null}
                    {!paginated.length ? <p className="ux-v2-task-empty">No tasks match these controls.</p> : null}
                  </section> : <>
                    <div className={designTodayBoardControlsClass}><span>Board grouped by source priority</span><div>
                      <button aria-label="Scroll Task Board Left" onClick={() => boardRef.current?.scrollBy({ left: -290, behavior: "smooth" })} type="button"><span aria-hidden="true" className="material-symbols-outlined">chevron_left</span></button>
                      <button aria-label="Scroll Task Board Right" onClick={() => boardRef.current?.scrollBy({ left: 290, behavior: "smooth" })} type="button"><span aria-hidden="true" className="material-symbols-outlined">chevron_right</span></button>
                    </div></div>
                    <DesignTodayBoard dataPdId="tasks.v2.board" ref={boardRef}>
                      {(["high", "medium", "low"] as const).map(priority => {
                        const rows = paginated.filter(task => task.priority === priority);
                        return <section aria-label={`${priorityLabel(priority)} Priority`} className={designTodayBoardColumnClass} data-empty={rows.length === 0} key={priority}>
                          <div className={designTodayCollectionHeadingClass}><h2>{priorityLabel(priority)} Priority <span>{rows.length}</span></h2>{annotations && rows.length ? <button aria-label={`${rows.every(task => annotationFor(task)?.tracked) ? "Untrack" : "Track"} all ${rows.length} visible ${priorityLabel(priority)} Priority tasks on this page only`} className={designTodayBulkTrackClass} disabled={trackingPending} onClick={() => void saveAnnotations(rows, !rows.every(task => annotationFor(task)?.tracked))} type="button">{rows.every(task => annotationFor(task)?.tracked) ? "Untrack All" : "Track All"} · This group ({rows.length})</button> : null}</div>
                          <div role="list">{rows.map(task => taskRow(task, true))}</div>
                        </section>;
                      })}
                    </DesignTodayBoard>
                  </>}
                  {collection === "all" ? <>
                    <section aria-label="Recurring Work" className={designTodayTaskCollectionClass} data-pd-id="tasks.v2.recurring">
                      <div className={designTodayCollectionHeadingClass}><h2>Recurring Work</h2></div>
                      <p className="ux-v2-task-empty">Recurring scheduling is not connected. Configured routines require a separate production scheduling authority.</p>
                    </section>
                    <section aria-label="Opportunities / Suggestions" className={designTodayTaskCollectionClass} data-pd-id="tasks.v2.suggestions">
                      <div className={designTodayCollectionHeadingClass}>
                        <button aria-expanded={suggestionsOpen} className={designTodaySuggestionTriggerClass} onClick={() => setSuggestionsOpen(value => !value)} type="button"><span aria-hidden="true" className="material-symbols-outlined">{suggestionsOpen ? "expand_less" : "expand_more"}</span>Opportunities / Suggestions</button>
                        <div className={designTodayOpportunitySummaryClass} data-pd-id="tasks.v2.opportunity-summary">
                          <span>{opportunityState.status === "ready" ? `${opportunityState.rows.length} advisory · ${Math.min(opportunityState.rows.length, opportunityLimit)} shown · ${opportunityTargets.length} eligible · ${opportunityTargets.filter(target => annotations?.some(row => row.profile_id === target.item.profileId && row.occurrence_key === target.occurrenceKey && row.tracked && !row.reviewed_at)).length} tracked${reviewedHistory.length ? ` · ${reviewedHistory.length} reviewed` : ""}` : "Source status pending"}</span>
                          <button aria-label={`Track all ${untrackedOpportunityTargets.length} eligible untracked opportunities in ${globalProfileScope ? "the selected Profile" : "all authorised Profiles"}`} className={designTodayBulkTrackClass} disabled={!annotations || trackingPending || !untrackedOpportunityTargets.length} onClick={() => void saveAnnotationTargets(untrackedOpportunityTargets.map(target => ({ profileId: target.item.profileId, occurrenceKey: target.occurrenceKey })), true)} title={!opportunityAnnotationExtensionEnabled && opportunityTargets.length < opportunityState.rows.length ? "Some opportunities await normal API tracking activation." : undefined} type="button">Track All · {untrackedOpportunityTargets.length} to track</button>
                        </div>
                      </div>
                      {suggestionsOpen ? <div>
                        {opportunityState.status === "loading" ? <p role="status">Loading Profile opportunities…</p> : null}
                        {opportunityState.status === "error" ? <p role="alert">{opportunityState.error}</p> : null}
                        {opportunityState.failed.length ? <p role="alert">Partial read: {opportunityState.failed.join(", ")} unavailable. Loaded Profiles only.</p> : null}
                        {opportunityState.status === "ready" && !opportunityState.rows.length && !opportunityState.failed.length ? <p className="ux-v2-task-empty">No recorded Profile opportunities in this scope.</p> : null}
                        {opportunityState.rows.slice(0, opportunityLimit).map(item => { const key = opportunityViewKey(item); const target = opportunityTargets.find(entry => entry.item.profileId === item.profileId && entry.item.opportunity_key === item.opportunity_key)?.occurrenceKey; const annotation = target ? annotations?.find(row => row.profile_id === item.profileId && row.occurrence_key === target) : null; return <div className={designTodayTaskWithActionClass} data-inspector-open={Boolean(inspectedTask || opportunityInspectorOpen)} key={key}><DesignTodayTaskRow accessibleName={`Inspect ${item.label} · ${item.profileName}`} active={inspectedOpportunityKey === key} context={<>{item.bookmaker} · {item.profileName} · Advisory; availability unverified{annotation?.reviewed_at ? " · Reviewed" : ""}</>} controls="tasks-v2-inspector" dataPdId={`opportunities.item.${item.profileId}.${item.opportunity_key}`} icon="lightbulb" onClick={() => void inspectOpportunity(item)} ref={node => { if (node) taskRowRefs.current.set(key, node); else taskRowRefs.current.delete(key); }} selectionMode="expanded" title={opportunityReviewTitle(item.label)} />{target && annotations && !inspectedTask && !opportunityInspectorOpen ? <button aria-label={`${annotation?.tracked ? "Untrack" : "Track"} ${item.label} · ${item.profileName}`} aria-pressed={Boolean(annotation?.tracked)} className={designTodayBulkTrackClass} disabled={trackingPending || annotation?.source_status === "resolved" || Boolean(annotation?.reviewed_at)} onClick={() => void saveAnnotationTargets([{ profileId: item.profileId, occurrenceKey: target }], !annotation?.tracked)} type="button">{annotation?.reviewed_at ? "Reviewed" : annotation?.tracked ? "Untrack" : "Track"}</button> : null}</div>; })}
                        {opportunityState.status === "ready" && opportunityTargets.length < opportunityState.rows.length ? <p className="ux-v2-task-empty">{opportunityState.rows.length - opportunityTargets.length} loaded opportunities cannot yet be tracked. Normal opportunity annotation activation is pending; their source links remain available.</p> : null}
                        <div className={designTodayCollectionFooterClass}>
                          {opportunityState.rows.length > opportunityLimit ? <button className={designTodayToolButtonClass} onClick={() => setOpportunityLimit(limit => Math.min(limit + 5, opportunityState.rows.length))} type="button">Show 5 more</button> : null}
                          {opportunityState.rows.length ? <Link href={opportunityViewAllHref}>View All Opportunities ({opportunityState.rows.length})</Link> : null}
                        </div>
                      </div> : null}
                    </section>
                  </> : null}
                </div>
                {(inspectedTask || opportunityInspectorOpen) && !narrow ? <aside aria-label={opportunityInspectorOpen ? "Opportunity Details" : "Task Details"} className={`${designTodayDetailPaneClass}${layout === "Board" ? ` ${designTodayBoardDrawerClass}` : ""}`} data-pd-id="tasks.v2.inspector" id="tasks-v2-inspector">{opportunityInspectorOpen ? opportunityDetails : taskDetails}</aside> : null}
              </div>
              {(inspectedTask || opportunityInspectorOpen) && narrow ? <ModalBoundary onDismiss={() => void closeInspector()} returnFocusRef={returnFocusRef}><div aria-label={opportunityInspectorOpen ? "Opportunity Details" : "Task Details"} className={designTodayMobileDetailClass} data-pd-id="tasks.v2.inspector" id="tasks-v2-inspector" role="dialog">{opportunityInspectorOpen ? opportunityDetails : taskDetails}</div></ModalBoundary> : null}
            </> : <div className="table-scroll daily-task-table-scroll" data-pd-id="tasks.table-scroll">
              <table className="data-table daily-task-table">
                <thead><tr><th>Priority</th><th>Task</th><th>Profile</th><th>Bookmaker</th><th>Due</th><th>Type</th><th>Source</th><th>Action</th></tr></thead>
                <tbody>
                  {paginated.map((task) => {
                    const item = task.notification;
                    const completed = task.dueState === "completed";
                    return (
                      <tr data-pd-id={`tasks.item.${item.notification_id}`} key={item.notification_id}>
                        <td data-label="Priority"><span className={`table-chip daily-task-priority daily-task-priority-${task.priority}`}>{priorityLabel(task.priority)}</span></td>
                        <td data-label="Task"><div className="daily-task-name"><strong>{item.title}</strong><small>{item.ledger_label} · {item.record_id}</small><details><summary>Evidence</summary><p>{task.evidence}</p></details></div></td>
                        <td data-label="Profile">{item.profile_name}</td>
                        <td data-label="Bookmaker">{item.bookmaker_label || "Not Applicable"}</td>
                        <td data-label="Due"><span className={`table-chip daily-task-due daily-task-due-${task.dueState}`}>{task.dueLabel}</span></td>
                        <td data-label="Type">{taskTypeLabel(item.notification_type)}</td>
                        <td data-label="Source">Deterministic</td>
                        <td data-label="Action"><div className="daily-task-actions"><Link aria-busy={openingId === item.notification_id} className="button-link" href={item.href} onClick={(event) => { event.preventDefault(); endRouteTransition(); void openTask(item); }} prefetch={false}>{openingId === item.notification_id ? "Checking Access…" : "Open"}</Link><button aria-label={`${completed ? "Restore" : "Complete"} ${item.title}`} className="icon-button" disabled={isPersistingState} onClick={() => void persistState(completed ? restoreNotificationIds(viewStateRef.current, [item.notification_id]) : dismissNotificationIds(viewStateRef.current, [item.notification_id]), `Unable to ${completed ? "restore" : "complete"} this task.`)} type="button"><span aria-hidden="true" className="material-symbols-outlined">{completed ? "restore" : "check"}</span></button></div></td>
                      </tr>
                    );
                  })}
                  {!paginated.length ? <tr><td className="dialog-table-empty-cell" colSpan={8}>No {dueViews.find((view) => view.id === dueState)?.label.toLocaleLowerCase()} tasks match these controls.</td></tr> : null}
                </tbody>
              </table>
            </div>}
            {uxV2 ? <nav aria-label="Today pages" className={designTodayPaginationClass} data-pd-id="tasks.v2.pagination"><span aria-live="polite">Showing {filtered.length ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length}</span><button aria-label="Previous Today page" disabled={currentPage <= 1} onClick={() => { setPage(currentPage - 1); setInspectedTaskId(""); }} type="button">Previous</button><button aria-label="Next Today page" disabled={currentPage >= pageCount} onClick={() => { setPage(currentPage + 1); setInspectedTaskId(""); }} type="button">Next</button></nav> : <LedgerPagination ariaLabel="Daily Tasks" currentPage={currentPage} onPageChange={setPage} onPageSizeChange={(next) => { setPageSize(next); setPage(1); }} pageCount={pageCount} pageSize={pageSize} position="bottom" totalRows={filtered.length} />}
          </section>
        )}
      </section>
    </main>
  );
}
