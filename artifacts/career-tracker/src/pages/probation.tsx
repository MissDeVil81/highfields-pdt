import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListProbationItems,
  useListProbationAssessments,
  useUpsertProbationAssessment,
  getListProbationAssessmentsQueryKey,
  useListProbationReflections,
  useUpsertProbationReflection,
  getListProbationReflectionsQueryKey,
  useListProbationActions,
  useCreateProbationAction,
  useUpdateProbationAction,
  useDeleteProbationAction,
  getListProbationActionsQueryKey,
  useListProbationManagerReviews,
  useUpsertProbationManagerReview,
  getListProbationManagerReviewsQueryKey,
} from "@workspace/api-client-react";
import type { ProbationItem, ProbationAssessment, ProbationAction } from "@workspace/api-client-react";
import { useSessionStore } from "@/lib/session";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  FileText,
  Plus,
  Trash2,
  MessageSquare,
  CalendarDays,
} from "lucide-react";

// ─── Types & constants ────────────────────────────────────────────────────────

type ReviewPeriod = "month1" | "month3" | "month5" | "month6";
type TabId = "overview" | ReviewPeriod;

interface PeriodConfig {
  id: ReviewPeriod;
  label: string;
  shortLabel: string;
  prevPeriod?: ReviewPeriod;
  prevLabel?: string;
  nextLabel?: string;
}

const PERIODS: PeriodConfig[] = [
  { id: "month1", label: "Month 1 Review", shortLabel: "Month 1", nextLabel: "Month 3" },
  { id: "month3", label: "Month 3 Review", shortLabel: "Month 3", prevPeriod: "month1", prevLabel: "Month 1", nextLabel: "Month 5" },
  { id: "month5", label: "Month 5 Review", shortLabel: "Month 5", prevPeriod: "month3", prevLabel: "Month 3", nextLabel: "Month 6" },
  { id: "month6", label: "Month 6 Probation Review", shortLabel: "Month 6", prevPeriod: "month5", prevLabel: "Month 5" },
];

type YNPRating = "yes" | "no" | "in_progress";
type ValuesRating = "rarely" | "some" | "most";
type AnyRating = YNPRating | ValuesRating;

interface ItemState { rating: string | null; note: string; }
interface ManagerItemState { rating: string | null; comment: string; }

interface ReflectionState {
  wentWell: string;
  learned: string;
  moreSupport: string;
  focusNext: string;
  confidence: string;
  biggestAchievements: string;
  mostProudOf: string;
  stillDevelop: string;
  readyToPass: string;
}

interface ManagerReviewState {
  goingWell: string;
  developmentAreas: string;
  reviewStatus: string;
  reviewDate: string;
}

const emptyReflection: ReflectionState = {
  wentWell: "", learned: "", moreSupport: "", focusNext: "",
  confidence: "", biggestAchievements: "", mostProudOf: "",
  stillDevelop: "", readyToPass: "",
};

const emptyManagerReview: ManagerReviewState = {
  goingWell: "", developmentAreas: "", reviewStatus: "", reviewDate: "",
};

const YNP_OPTIONS = [
  { value: "yes" as YNPRating, label: "Yes", icon: <CheckCircle2 className="h-4 w-4" />, activeClass: "bg-green-500 text-white border-green-500", inactiveClass: "border-border text-muted-foreground hover:border-green-400 hover:text-green-600" },
  { value: "in_progress" as YNPRating, label: "In Progress", icon: <Clock className="h-4 w-4" />, activeClass: "bg-amber-500 text-white border-amber-500", inactiveClass: "border-border text-muted-foreground hover:border-amber-400 hover:text-amber-600" },
  { value: "no" as YNPRating, label: "Not Yet", icon: <XCircle className="h-4 w-4" />, activeClass: "bg-red-500 text-white border-red-500", inactiveClass: "border-border text-muted-foreground hover:border-red-400 hover:text-red-500" },
];

const VALUES_OPTIONS = [
  { value: "rarely" as ValuesRating, label: "Rarely", stars: 1, activeClass: "bg-red-500 text-white border-red-500", inactiveClass: "border-border text-muted-foreground hover:border-red-400 hover:text-red-500" },
  { value: "some" as ValuesRating, label: "Some of the time", stars: 2, activeClass: "bg-amber-500 text-white border-amber-500", inactiveClass: "border-border text-muted-foreground hover:border-amber-400 hover:text-amber-600" },
  { value: "most" as ValuesRating, label: "Most of the time", stars: 3, activeClass: "bg-green-500 text-white border-green-500", inactiveClass: "border-border text-muted-foreground hover:border-green-400 hover:text-green-600" },
];

const ACTION_STATUS = [
  { value: "not_started", label: "Not Started", active: "bg-slate-400 text-white border-slate-400", inactive: "border-border text-muted-foreground hover:border-slate-400" },
  { value: "in_progress", label: "In Progress", active: "bg-amber-500 text-white border-amber-500", inactive: "border-border text-muted-foreground hover:border-amber-400 hover:text-amber-600" },
  { value: "complete", label: "Complete", active: "bg-green-500 text-white border-green-500", inactive: "border-border text-muted-foreground hover:border-green-400 hover:text-green-600" },
];

const CONFIDENCE_OPTIONS = [
  { value: "green", label: "Feeling good", active: "bg-green-500 text-white border-green-500", inactive: "border-border text-muted-foreground hover:border-green-400 hover:text-green-600" },
  { value: "amber", label: "Getting there", active: "bg-amber-500 text-white border-amber-500", inactive: "border-border text-muted-foreground hover:border-amber-400 hover:text-amber-600" },
  { value: "red", label: "Need support", active: "bg-red-500 text-white border-red-500", inactive: "border-border text-muted-foreground hover:border-red-400 hover:text-red-500" },
];

const REVIEW_STATUS_OPTIONS = [
  { value: "on_track", label: "On Track", active: "bg-green-500 text-white border-green-500", inactive: "border-border/50 text-muted-foreground/50" },
  { value: "needs_support", label: "Needs Support", active: "bg-amber-500 text-white border-amber-500", inactive: "border-border/50 text-muted-foreground/50" },
  { value: "at_risk", label: "At Risk", active: "bg-red-500 text-white border-red-500", inactive: "border-border/50 text-muted-foreground/50" },
];

// ─── Helper functions ─────────────────────────────────────────────────────────

function calcStats(items: ProbationItem[], stateMap: Record<number, ItemState>) {
  const total = items.length;
  let yesCount = 0, inProgressCount = 0, noCount = 0, unratedCount = 0;
  for (const item of items) {
    const r = stateMap[item.id]?.rating ?? null;
    if (r === "yes" || r === "most") yesCount++;
    else if (r === "in_progress" || r === "some") inProgressCount++;
    else if (r === "no" || r === "rarely") noCount++;
    else unratedCount++;
  }
  const pct = total > 0 ? Math.round(((yesCount + inProgressCount * 0.5) / total) * 100) : 0;
  const noRatio = total > 0 ? noCount / total : 0;
  const yesRatio = total > 0 ? yesCount / total : 0;
  let color: "green" | "amber" | "red" | "gray" = "gray";
  let label = "Not yet started";
  if (unratedCount === total) { color = "gray"; label = "Not yet started"; }
  else if (noRatio >= 0.3) { color = "red"; label = "Some areas need attention"; }
  else if (yesRatio >= 0.7) { color = "green"; label = "Looking great — well on track!"; }
  else { color = "amber"; label = "Making progress — keep going!"; }
  return { yesCount, inProgressCount, noCount, unratedCount, total, pct, color, label };
}

// ─── ReviewDateField ──────────────────────────────────────────────────────────

function ReviewDateField({ sessionId, reviewPeriod }: { sessionId: string; reviewPeriod: ReviewPeriod }) {
  const [date, setDate] = useState("");
  const [initialized, setInitialized] = useState(false);

  const params = { sessionId, reviewPeriod };
  const { data: reviews = [], isLoading } = useListProbationManagerReviews(
    params,
    { query: { queryKey: getListProbationManagerReviewsQueryKey(params), enabled: !!sessionId } }
  );

  const upsert = useUpsertProbationManagerReview();

  useEffect(() => {
    if (!isLoading && !initialized) {
      const r = reviews[0];
      if (r) setDate(r.reviewDate ?? "");
      setInitialized(true);
    }
  }, [reviews, isLoading, initialized]);

  function save() {
    upsert.mutate({ data: { sessionId, reviewPeriod, reviewDate: date || null } });
  }

  return (
    <div className="flex items-center gap-2.5 mb-6 p-3 rounded-xl border border-border bg-muted/20">
      <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
      <label htmlFor={`review-date-${reviewPeriod}`} className="text-sm font-medium text-foreground shrink-0">
        Date of Review
      </label>
      <input
        id={`review-date-${reviewPeriod}`}
        type="date"
        value={date}
        onChange={e => setDate(e.target.value)}
        onBlur={save}
        className="text-sm px-2.5 py-1 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}

// ─── Shared components ────────────────────────────────────────────────────────

function ProbationItemRow({
  item,
  state,
  managerState,
  onRate,
  onNote,
  onBlur,
}: {
  item: ProbationItem;
  state: ItemState;
  managerState: ManagerItemState;
  onRate: (rating: AnyRating) => void;
  onNote: (note: string) => void;
  onBlur: () => void;
}) {
  const [showNote, setShowNote] = useState(false);
  const [showMgrComment, setShowMgrComment] = useState(false);
  const isValues = item.ratingType === "values_rating";
  const options = isValues ? VALUES_OPTIONS : YNP_OPTIONS;
  const rating = state.rating as AnyRating | null;
  const mgrRating = managerState.rating as AnyRating | null;
  const hasMgrComment = !!managerState.comment;

  return (
    <div className="border border-border rounded-xl p-4 bg-card">
      {/* Item text */}
      <p className="text-sm text-foreground leading-snug mb-3">{item.itemText}</p>

      {/* Assessment rows — same sizing for both */}
      <div className="space-y-2">
        {/* Employee row — editable */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-muted-foreground shrink-0 w-36">My Assessment</span>
          <div className="flex gap-1.5 flex-wrap">
            {options.map(opt => (
              <button
                key={opt.value}
                onClick={() => onRate(opt.value as AnyRating)}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all duration-150 whitespace-nowrap",
                  rating === opt.value ? opt.activeClass : opt.inactiveClass
                )}
              >
                {"icon" in opt ? opt.icon : <span>{"★".repeat(opt.stars)}</span>}
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Manager row — read-only display, same size */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-medium text-foreground shrink-0 w-36">Manager Rating</span>
          <div className="flex gap-1.5 flex-wrap">
            {mgrRating == null ? (
              <span className="text-xs text-muted-foreground/60 italic">Not yet rated</span>
            ) : (
              options.map(opt => (
                <span
                  key={opt.value}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap",
                    mgrRating === opt.value ? opt.activeClass : "border-border/30 text-muted-foreground/30"
                  )}
                >
                  {"icon" in opt ? opt.icon : <span>{"★".repeat(opt.stars)}</span>}
                  {opt.label}
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Toggles */}
      <div className="mt-3 flex gap-5 flex-wrap">
        <button
          onClick={() => setShowNote(s => !s)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <FileText className="h-3 w-3" />
          {state.note ? "Edit my note" : "Add my note"}
          {showNote ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        <button
          onClick={() => setShowMgrComment(s => !s)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <MessageSquare className="h-3 w-3" />
          {hasMgrComment ? "View manager comment" : "Manager comment"}
          {showMgrComment ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {showNote && (
        <textarea
          value={state.note}
          onChange={e => onNote(e.target.value)}
          onBlur={onBlur}
          placeholder="Add a note or example to support this rating…"
          rows={2}
          className="mt-2 w-full text-sm px-3 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      )}

      {showMgrComment && (
        <div className="mt-2">
          {hasMgrComment ? (
            <p className="text-sm px-3 py-2 rounded-lg border border-border/50 bg-muted/30 text-foreground leading-relaxed">
              {managerState.comment}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground/60 italic px-3 py-2">
              No manager comment recorded yet.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function SectionBlock({
  section,
  items,
  stateMap,
  managerStateMap,
  onRate,
  onNote,
  onBlur,
}: {
  section: string;
  items: ProbationItem[];
  stateMap: Record<number, ItemState>;
  managerStateMap: Record<number, ManagerItemState>;
  onRate: (itemId: number, rating: AnyRating) => void;
  onNote: (itemId: number, note: string) => void;
  onBlur: (itemId: number) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const yesCount = items.filter(i => { const r = stateMap[i.id]?.rating; return r === "yes" || r === "most"; }).length;
  const allDone = items.every(i => stateMap[i.id]?.rating != null);
  const anyRated = items.some(i => stateMap[i.id]?.rating != null);
  const mgrYesCount = items.filter(i => { const r = managerStateMap[i.id]?.rating; return r === "yes" || r === "most"; }).length;
  const mgrAnyRated = items.some(i => managerStateMap[i.id]?.rating != null);

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setCollapsed(s => !s)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-semibold text-sm text-foreground">{section}</span>
          {anyRated && (
            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium",
              allDone ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400"
                : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
            )}>
              Me: {yesCount}/{items.length} ✓
            </span>
          )}
          {mgrAnyRated && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-primary/10 text-primary dark:bg-primary/20">
              Mgr: {mgrYesCount}/{items.length} ✓
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="text-xs">{items.length} item{items.length !== 1 ? "s" : ""}</span>
          {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </div>
      </button>
      {!collapsed && (
        <div className="p-3 space-y-2.5">
          {items.map(item => (
            <ProbationItemRow
              key={item.id}
              item={item}
              state={stateMap[item.id] ?? { rating: null, note: "" }}
              managerState={managerStateMap[item.id] ?? { rating: null, comment: "" }}
              onRate={r => onRate(item.id, r)}
              onNote={n => onNote(item.id, n)}
              onBlur={() => onBlur(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProgressSummary({ items, stateMap }: { items: ProbationItem[]; stateMap: Record<number, ItemState> }) {
  const stats = calcStats(items, stateMap);
  const barColors = { green: "bg-green-500", amber: "bg-amber-500", red: "bg-red-500", gray: "bg-muted-foreground/30" };
  const cardColors = {
    green: "border bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800",
    amber: "border bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800",
    red: "border bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800",
    gray: "border border-border bg-muted/30",
  };

  return (
    <div className={cn("rounded-xl p-5", cardColors[stats.color])}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-sm">My overall progress</span>
            <span className="font-bold text-sm">{stats.pct}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
            <div className={cn(barColors[stats.color], "h-full rounded-full transition-all duration-500")} style={{ width: `${stats.pct}%` }} />
          </div>
          <p className="mt-2 text-xs font-medium opacity-80">{stats.label}</p>
        </div>
        <div className="flex gap-4 sm:gap-5 text-center shrink-0">
          <div><div className="text-xl font-bold text-green-600 dark:text-green-400">{stats.yesCount}</div><div className="text-xs opacity-70">Yes / Most</div></div>
          <div><div className="text-xl font-bold text-amber-600 dark:text-amber-400">{stats.inProgressCount}</div><div className="text-xs opacity-70">In Progress</div></div>
          <div><div className="text-xl font-bold text-red-600 dark:text-red-400">{stats.noCount}</div><div className="text-xs opacity-70">Not Yet</div></div>
          <div><div className="text-xl font-bold text-muted-foreground">{stats.unratedCount}</div><div className="text-xs opacity-70">Unrated</div></div>
        </div>
      </div>
    </div>
  );
}

// ─── Action item ──────────────────────────────────────────────────────────────

function ActionItem({ action, showDelete, onDelete, onStatusChange }: {
  action: ProbationAction;
  showDelete: boolean;
  onDelete: (id: number) => void;
  onStatusChange: (id: number, status: string) => void;
}) {
  return (
    <div className="border border-border rounded-xl p-4 bg-card">
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="text-sm text-foreground flex-1 leading-snug">{action.actionText}</p>
        {showDelete && (
          <button onClick={() => onDelete(action.id)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0 mt-0.5">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {ACTION_STATUS.map(opt => (
          <button
            key={opt.value}
            onClick={() => onStatusChange(action.id, opt.value)}
            className={cn("px-2.5 py-1 rounded-lg border text-xs font-medium transition-all",
              action.status === opt.value ? opt.active : opt.inactive
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── ActionsSection ───────────────────────────────────────────────────────────

function ActionsSection({ sessionId, reviewPeriod, prevPeriod, prevLabel, nextLabel }: {
  sessionId: string;
  reviewPeriod: ReviewPeriod;
  prevPeriod?: ReviewPeriod;
  prevLabel?: string;
  nextLabel?: string;
}) {
  const queryClient = useQueryClient();
  const [newActionText, setNewActionText] = useState("");

  const currentActionsParams = { sessionId, reviewPeriod };
  const { data: currentActions = [] } = useListProbationActions(
    currentActionsParams,
    { query: { queryKey: getListProbationActionsQueryKey(currentActionsParams), enabled: !!sessionId } }
  );

  const prevActionsParams = { sessionId, reviewPeriod: prevPeriod ?? "month1" };
  const { data: prevActions = [] } = useListProbationActions(
    prevActionsParams,
    { query: { queryKey: getListProbationActionsQueryKey(prevActionsParams), enabled: !!sessionId && !!prevPeriod } }
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListProbationActionsQueryKey() });
  const createAction = useCreateProbationAction({ mutation: { onSuccess: invalidate } });
  const updateAction = useUpdateProbationAction({ mutation: { onSuccess: invalidate } });
  const deleteAction = useDeleteProbationAction({ mutation: { onSuccess: invalidate } });

  function handleAdd() {
    const text = newActionText.trim();
    if (!text) return;
    createAction.mutate({ data: { sessionId, reviewPeriod, actionText: text } });
    setNewActionText("");
  }

  return (
    <div className="space-y-6">
      {prevPeriod && (
        <div>
          <h3 className="text-base font-semibold text-foreground mb-1">Actions agreed at {prevLabel}</h3>
          <p className="text-sm text-muted-foreground mb-3">Update the status of your actions from last review.</p>
          {prevActions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-3 px-4 border border-border rounded-xl bg-muted/20">
              No actions were recorded at {prevLabel}.
            </p>
          ) : (
            <div className="space-y-2">
              {prevActions.map(a => (
                <ActionItem key={a.id} action={a} showDelete={false} onDelete={() => {}}
                  onStatusChange={(id, status) => updateAction.mutate({ id, data: { status: status as "not_started" | "in_progress" | "complete" } })}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div>
        <h3 className="text-base font-semibold text-foreground mb-1">
          {nextLabel ? `My actions before ${nextLabel} Review` : "My actions for this review"}
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Add the actions you want to focus on. These will be carried forward into your next review.
        </p>
        {currentActions.length > 0 && (
          <div className="space-y-2 mb-3">
            {currentActions.map(a => (
              <ActionItem key={a.id} action={a} showDelete
                onDelete={id => deleteAction.mutate({ id })}
                onStatusChange={(id, status) => updateAction.mutate({ id, data: { status: status as "not_started" | "in_progress" | "complete" } })}
              />
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={newActionText}
            onChange={e => setNewActionText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleAdd(); }}
            placeholder="Type an action and press Enter or click Add…"
            className="flex-1 text-sm px-3 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={handleAdd}
            disabled={!newActionText.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors shrink-0"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ReflectionSection ────────────────────────────────────────────────────────

function ReflectionSection({ sessionId, reviewPeriod, isMonth6 }: {
  sessionId: string;
  reviewPeriod: ReviewPeriod;
  isMonth6: boolean;
}) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<ReflectionState>(emptyReflection);
  const [initialized, setInitialized] = useState(false);

  const reflectionsParams = { sessionId, reviewPeriod };
  const { data: reflections = [], isLoading } = useListProbationReflections(
    reflectionsParams,
    { query: { queryKey: getListProbationReflectionsQueryKey(reflectionsParams), enabled: !!sessionId } }
  );

  const upsert = useUpsertProbationReflection({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListProbationReflectionsQueryKey() }),
    },
  });

  useEffect(() => {
    if (!isLoading && !initialized) {
      const r = reflections[0];
      if (r) {
        setState({
          wentWell: r.wentWell ?? "",
          learned: r.learned ?? "",
          moreSupport: r.moreSupport ?? "",
          focusNext: r.focusNext ?? "",
          confidence: r.confidence ?? "",
          biggestAchievements: r.biggestAchievements ?? "",
          mostProudOf: r.mostProudOf ?? "",
          stillDevelop: r.stillDevelop ?? "",
          readyToPass: r.readyToPass ?? "",
        });
      }
      setInitialized(true);
    }
  }, [reflections, isLoading, initialized]);

  function save(override?: Partial<ReflectionState>) {
    const s = override ? { ...state, ...override } : state;
    upsert.mutate({ data: { sessionId, reviewPeriod, ...s } });
  }

  function field(key: keyof ReflectionState, label: string, placeholder = "Share your thoughts…") {
    return (
      <div key={key}>
        <label className="text-sm font-medium text-foreground mb-1.5 block">{label}</label>
        <textarea
          value={state[key]}
          onChange={e => setState(prev => ({ ...prev, [key]: e.target.value }))}
          onBlur={() => save()}
          placeholder={placeholder}
          rows={3}
          className="w-full text-sm px-3 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-foreground mb-1">My Reflection</h3>
      <p className="text-sm text-muted-foreground mb-5">Take a moment to reflect on your progress since the last review.</p>
      <div className="space-y-4">
        {field("wentWell", "What has gone well?")}
        {field("learned", "What have I learned?")}
        {field("moreSupport", "Where do I need more support?")}
        {field("focusNext", "What am I focusing on before my next review?")}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">How confident do I feel in my role?</label>
          <div className="flex gap-2 flex-wrap">
            {CONFIDENCE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => {
                  const val = state.confidence === opt.value ? "" : opt.value;
                  setState(prev => ({ ...prev, confidence: val }));
                  save({ confidence: val });
                }}
                className={cn("px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                  state.confidence === opt.value ? opt.active : opt.inactive
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        {isMonth6 && (
          <div className="pt-6 mt-2 border-t border-border">
            <h4 className="text-base font-semibold text-foreground mb-1">Preparing for Probation Review</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Use these questions to prepare for your manager-led probation discussion.
            </p>
            <div className="space-y-4">
              {field("biggestAchievements", "What are your biggest achievements during probation?")}
              {field("mostProudOf", "What are you most proud of?")}
              {field("stillDevelop", "What areas do you still want to develop?")}
              {field("readyToPass", "Why do you believe you are ready to pass probation?")}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ManagerReviewSummary — read-only for employees ──────────────────────────

function ManagerReviewSummary({ sessionId, reviewPeriod }: {
  sessionId: string;
  reviewPeriod: ReviewPeriod;
}) {
  const [state, setState] = useState<Omit<ManagerReviewState, "reviewDate">>(
    { goingWell: "", developmentAreas: "", reviewStatus: "" }
  );
  const [initialized, setInitialized] = useState(false);

  const params = { sessionId, reviewPeriod };
  const { data: reviews = [], isLoading } = useListProbationManagerReviews(
    params,
    { query: { queryKey: getListProbationManagerReviewsQueryKey(params), enabled: !!sessionId } }
  );

  useEffect(() => {
    if (!isLoading && !initialized) {
      const r = reviews[0];
      if (r) {
        setState({
          goingWell: r.goingWell ?? "",
          developmentAreas: r.developmentAreas ?? "",
          reviewStatus: r.reviewStatus ?? "",
        });
      }
      setInitialized(true);
    }
  }, [reviews, isLoading, initialized]);

  const hasAnyContent = state.goingWell || state.developmentAreas || state.reviewStatus;

  return (
    <div className="rounded-xl border border-primary/25 bg-primary/5 p-6">
      <div className="flex items-start justify-between gap-3 mb-1">
        <h3 className="text-lg font-semibold text-foreground">Manager Review</h3>
        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium shrink-0 mt-0.5">
          Manager only
        </span>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Your manager's assessment will appear here after your review meeting.
      </p>

      {!hasAnyContent ? (
        <p className="text-sm text-muted-foreground/70 italic text-center py-4">
          No manager review recorded yet for this period.
        </p>
      ) : (
        <div className="space-y-4">
          {state.goingWell && (
            <div>
              <p className="text-sm font-semibold text-foreground mb-1.5">What's Going Well</p>
              <p className="text-sm px-3 py-2.5 rounded-lg border border-border/50 bg-background text-foreground leading-relaxed">
                {state.goingWell}
              </p>
            </div>
          )}
          {state.developmentAreas && (
            <div>
              <p className="text-sm font-semibold text-foreground mb-1.5">Areas To Focus On Before Next Review</p>
              <p className="text-sm px-3 py-2.5 rounded-lg border border-border/50 bg-background text-foreground leading-relaxed">
                {state.developmentAreas}
              </p>
            </div>
          )}
          {state.reviewStatus && (
            <div>
              <p className="text-sm font-semibold text-foreground mb-2">Overall Review Status</p>
              <div className="flex gap-2 flex-wrap">
                {REVIEW_STATUS_OPTIONS.map(opt => (
                  <span
                    key={opt.value}
                    className={cn(
                      "px-4 py-2 rounded-lg border text-sm font-medium",
                      state.reviewStatus === opt.value ? opt.active : opt.inactive
                    )}
                  >
                    {opt.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ReviewContent (single review tab) ───────────────────────────────────────

function ReviewContent({ reviewPeriod, sessionId, items }: {
  reviewPeriod: ReviewPeriod;
  sessionId: string;
  items: ProbationItem[];
}) {
  const queryClient = useQueryClient();
  const period = PERIODS.find(p => p.id === reviewPeriod)!;
  const [stateMap, setStateMap] = useState<Record<number, ItemState>>({});
  const [managerStateMap, setManagerStateMap] = useState<Record<number, ManagerItemState>>({});
  const [lastInitKey, setLastInitKey] = useState<string | null>(null);

  const reviewAssessmentsParams = { sessionId, reviewPeriod };
  const { data: assessments = [], isLoading: assessmentsLoading } = useListProbationAssessments(
    reviewAssessmentsParams,
    { query: { queryKey: getListProbationAssessmentsQueryKey(reviewAssessmentsParams), enabled: !!sessionId } }
  );

  const upsert = useUpsertProbationAssessment({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListProbationAssessmentsQueryKey() }),
    },
  });

  useEffect(() => {
    const key = `${sessionId}|${reviewPeriod}`;
    if (!assessmentsLoading && key !== lastInitKey) {
      const empInit: Record<number, ItemState> = {};
      const mgrInit: Record<number, ManagerItemState> = {};
      for (const a of assessments) {
        empInit[a.itemId] = { rating: a.rating ?? null, note: a.note ?? "" };
        mgrInit[a.itemId] = { rating: a.managerRating ?? null, comment: a.managerComment ?? "" };
      }
      setStateMap(empInit);
      setManagerStateMap(mgrInit);
      setLastInitKey(key);
    }
  }, [assessments, assessmentsLoading, sessionId, reviewPeriod, lastInitKey]);

  function upsertAll(itemId: number, empOverride?: Partial<ItemState>) {
    const emp = { ...stateMap[itemId] ?? { rating: null, note: "" }, ...empOverride };
    const mgr = managerStateMap[itemId] ?? { rating: null, comment: "" };
    upsert.mutate({
      data: {
        sessionId, itemId, reviewPeriod,
        rating: emp.rating ?? null,
        note: emp.note ?? null,
        managerRating: mgr.rating ?? null,
        managerComment: mgr.comment ?? null,
      }
    });
  }

  function handleRate(itemId: number, rating: AnyRating) {
    setStateMap(prev => ({ ...prev, [itemId]: { ...prev[itemId] ?? { note: "" }, rating } }));
    upsertAll(itemId, { rating });
  }

  function handleNote(itemId: number, note: string) {
    setStateMap(prev => ({ ...prev, [itemId]: { ...prev[itemId] ?? { rating: null }, note } }));
  }

  function handleBlur(itemId: number) {
    upsertAll(itemId);
  }

  const sections = new Map<string, ProbationItem[]>();
  for (const item of items) {
    if (!sections.has(item.section)) sections.set(item.section, []);
    sections.get(item.section)!.push(item);
  }

  return (
    <div>
      {/* Date of Review */}
      <ReviewDateField sessionId={sessionId} reviewPeriod={reviewPeriod} />

      <ProgressSummary items={items} stateMap={stateMap} />

      <div className="space-y-4 mt-6">
        {items.length === 0
          ? [1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)
          : Array.from(sections.entries()).map(([section, sectionItems]) => (
            <SectionBlock
              key={section}
              section={section}
              items={sectionItems}
              stateMap={stateMap}
              managerStateMap={managerStateMap}
              onRate={handleRate}
              onNote={handleNote}
              onBlur={handleBlur}
            />
          ))
        }
      </div>

      <div className="border-t border-border mt-10 pt-8">
        <ReflectionSection sessionId={sessionId} reviewPeriod={reviewPeriod} isMonth6={reviewPeriod === "month6"} />
      </div>

      <div className="border-t border-border mt-8 pt-8">
        <h3 className="text-lg font-semibold text-foreground mb-4">Actions</h3>
        <ActionsSection
          sessionId={sessionId}
          reviewPeriod={reviewPeriod}
          prevPeriod={period.prevPeriod}
          prevLabel={period.prevLabel}
          nextLabel={period.nextLabel}
        />
      </div>

      <div className="border-t border-border mt-8 pt-8">
        <ManagerReviewSummary sessionId={sessionId} reviewPeriod={reviewPeriod} />
      </div>

      <p className="mt-10 text-xs text-muted-foreground text-center">
        Everything saves automatically as you go. This is your personal development record.
      </p>
    </div>
  );
}

// ─── ProbationOverview ────────────────────────────────────────────────────────

function ProbationOverview({ items, allAssessments, onSelect }: {
  items: ProbationItem[];
  allAssessments: ProbationAssessment[];
  onSelect: (period: ReviewPeriod) => void;
}) {
  const total = items.length;
  const barColors = { green: "bg-green-500", amber: "bg-amber-500", red: "bg-red-500", gray: "bg-muted-foreground/30" };

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-6">
        Your probation journey has four review checkpoints. Work through each review at your own pace — your progress is saved automatically.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PERIODS.map(period => {
          const periodAssessments = allAssessments.filter(a => a.reviewPeriod === period.id);
          const stateMap: Record<number, ItemState> = {};
          for (const a of periodAssessments) {
            stateMap[a.itemId] = { rating: a.rating ?? null, note: a.note ?? "" };
          }
          const stats = calcStats(items, stateMap);
          const rated = total - stats.unratedCount;

          let statusLabel = "Not Started";
          let statusClass = "bg-muted text-muted-foreground";
          if (rated === 0) { statusLabel = "Not Started"; statusClass = "bg-muted text-muted-foreground"; }
          else if (stats.unratedCount === 0) { statusLabel = "Complete"; statusClass = "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400"; }
          else { statusLabel = "In Progress"; statusClass = "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"; }

          return (
            <button
              key={period.id}
              onClick={() => onSelect(period.id)}
              className="text-left border border-border rounded-xl p-5 bg-card hover:border-primary/50 hover:shadow-sm transition-all group"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <h3 className="font-semibold text-foreground text-sm leading-snug">{period.label}</h3>
                <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium shrink-0", statusClass)}>
                  {statusLabel}
                </span>
              </div>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-muted-foreground">{rated} / {total} items rated</span>
                  <span className="text-xs font-semibold">{stats.pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className={cn(barColors[stats.color], "h-full rounded-full transition-all duration-500")} style={{ width: `${stats.pct}%` }} />
                </div>
              </div>
              <p className="text-xs text-primary font-medium group-hover:underline">Open review →</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Probation page ──────────────────────────────────────────────────────

export default function Probation() {
  const { sessionId } = useSessionStore();
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  const { data: items = [] } = useListProbationItems();
  const allAssessmentsParams = { sessionId };
  const { data: allAssessments = [] } = useListProbationAssessments(
    allAssessmentsParams,
    { query: { queryKey: getListProbationAssessmentsQueryKey(allAssessmentsParams), enabled: !!sessionId } }
  );

  const TABS: { id: TabId; label: string }[] = [
    { id: "overview", label: "Overview" },
    ...PERIODS.map(p => ({ id: p.id as TabId, label: p.shortLabel })),
  ];

  const activePeriod = PERIODS.find(p => p.id === activeTab);

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Probation Review</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your guide to what good looks like during your probation period. Track your progress, reflect, and build evidence of your development.
        </p>
      </div>

      <div className="flex gap-0 mb-7 overflow-x-auto border-b border-border">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors",
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" ? (
        <ProbationOverview
          items={items}
          allAssessments={allAssessments}
          onSelect={period => setActiveTab(period)}
        />
      ) : (
        <>
          {activePeriod && (
            <div className="flex items-center gap-3 mb-6">
              <h3 className="text-lg font-semibold text-foreground">{activePeriod.label}</h3>
              <button
                onClick={() => setActiveTab("overview")}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back to overview
              </button>
            </div>
          )}
          <ReviewContent
            key={activeTab}
            reviewPeriod={activeTab as ReviewPeriod}
            sessionId={sessionId}
            items={items}
          />
        </>
      )}
    </div>
  );
}
