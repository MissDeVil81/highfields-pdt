import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListProbationItems,
  useListProbationAssessments,
  useUpsertProbationAssessment,
  getListProbationAssessmentsQueryKey,
} from "@workspace/api-client-react";
import type { ProbationItem } from "@workspace/api-client-react";
import { useSessionStore } from "@/lib/session";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Clock, Star, ChevronDown, ChevronUp, FileText } from "lucide-react";

type YNPRating = "yes" | "no" | "in_progress";
type ValuesRating = "rarely" | "some" | "most";
type AnyRating = YNPRating | ValuesRating;

const YNP_OPTIONS: { value: YNPRating; label: string; icon: React.ReactNode; activeClass: string; inactiveClass: string }[] = [
  {
    value: "yes",
    label: "Yes",
    icon: <CheckCircle2 className="h-4 w-4" />,
    activeClass: "bg-green-500 text-white border-green-500",
    inactiveClass: "border-border text-muted-foreground hover:border-green-400 hover:text-green-600",
  },
  {
    value: "in_progress",
    label: "In Progress",
    icon: <Clock className="h-4 w-4" />,
    activeClass: "bg-amber-500 text-white border-amber-500",
    inactiveClass: "border-border text-muted-foreground hover:border-amber-400 hover:text-amber-600",
  },
  {
    value: "no",
    label: "Not Yet",
    icon: <XCircle className="h-4 w-4" />,
    activeClass: "bg-red-500 text-white border-red-500",
    inactiveClass: "border-border text-muted-foreground hover:border-red-400 hover:text-red-500",
  },
];

const VALUES_OPTIONS: { value: ValuesRating; label: string; stars: number; activeClass: string; inactiveClass: string }[] = [
  {
    value: "rarely",
    label: "Rarely",
    stars: 1,
    activeClass: "bg-red-500 text-white border-red-500",
    inactiveClass: "border-border text-muted-foreground hover:border-red-400 hover:text-red-500",
  },
  {
    value: "some",
    label: "Some of the time",
    stars: 2,
    activeClass: "bg-amber-500 text-white border-amber-500",
    inactiveClass: "border-border text-muted-foreground hover:border-amber-400 hover:text-amber-600",
  },
  {
    value: "most",
    label: "Most of the time",
    stars: 3,
    activeClass: "bg-green-500 text-white border-green-500",
    inactiveClass: "border-border text-muted-foreground hover:border-green-400 hover:text-green-600",
  },
];

interface ItemState {
  rating: string | null;
  note: string;
}

function overallStatus(items: ProbationItem[], stateMap: Record<number, ItemState>): {
  yesCount: number;
  inProgressCount: number;
  noCount: number;
  unratedCount: number;
  total: number;
  pct: number;
  color: "green" | "amber" | "red" | "gray";
  label: string;
} {
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

  if (unratedCount === total) {
    color = "gray";
    label = "Not yet started";
  } else if (noRatio >= 0.3) {
    color = "red";
    label = "Some areas need attention";
  } else if (yesRatio >= 0.7) {
    color = "green";
    label = "Looking great — well on track!";
  } else {
    color = "amber";
    label = "Making progress — keep going!";
  }

  return { yesCount, inProgressCount, noCount, unratedCount, total, pct, color, label };
}

function ProbationItemRow({
  item,
  state,
  onRate,
  onNote,
  onBlur,
}: {
  item: ProbationItem;
  state: ItemState;
  onRate: (rating: AnyRating) => void;
  onNote: (note: string) => void;
  onBlur: () => void;
}) {
  const [showNote, setShowNote] = useState(false);
  const isValues = item.ratingType === "values_rating";
  const options = isValues ? VALUES_OPTIONS : YNP_OPTIONS;

  const rating = state.rating as AnyRating | null;

  return (
    <div className="border border-border rounded-xl p-4 bg-card transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground leading-snug">{item.itemText}</p>
        </div>
        <div className="flex gap-1.5 shrink-0 flex-wrap">
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => onRate(opt.value as AnyRating)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all duration-150 whitespace-nowrap",
                rating === opt.value ? opt.activeClass : opt.inactiveClass
              )}
            >
              {"icon" in opt ? opt.icon : <span>{"★".repeat(opt.stars)}</span>}
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2.5">
        <button
          onClick={() => setShowNote(s => !s)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <FileText className="h-3 w-3" />
          {state.note ? "Edit note" : "Add a note or example"}
          {showNote ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
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
      </div>
    </div>
  );
}

function SectionBlock({
  section,
  items,
  stateMap,
  onRate,
  onNote,
  onBlur,
}: {
  section: string;
  items: ProbationItem[];
  stateMap: Record<number, ItemState>;
  onRate: (itemId: number, rating: AnyRating) => void;
  onNote: (itemId: number, note: string) => void;
  onBlur: (itemId: number) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const yesCount = items.filter(i => {
    const r = stateMap[i.id]?.rating;
    return r === "yes" || r === "most";
  }).length;

  const allDone = items.every(i => stateMap[i.id]?.rating != null);
  const anyRated = items.some(i => stateMap[i.id]?.rating != null);

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setCollapsed(s => !s)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm text-foreground">{section}</span>
          {anyRated && (
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full font-medium",
              allDone ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400" : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
            )}>
              {yesCount}/{items.length} ✓
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

export default function Probation() {
  const { sessionId } = useSessionStore();
  const queryClient = useQueryClient();
  const [stateMap, setStateMap] = useState<Record<number, ItemState>>({});
  const [lastInitSession, setLastInitSession] = useState<string | null>(null);

  const { data: items = [], isLoading: itemsLoading } = useListProbationItems();

  const { data: assessments = [], isLoading: assessmentsLoading } = useListProbationAssessments(
    { sessionId },
    { query: { enabled: !!sessionId } }
  );

  const upsert = useUpsertProbationAssessment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProbationAssessmentsQueryKey() });
      },
    },
  });

  useEffect(() => {
    if (!assessmentsLoading && sessionId && sessionId !== lastInitSession) {
      const init: Record<number, ItemState> = {};
      for (const a of assessments) {
        init[a.itemId] = { rating: a.rating ?? null, note: a.note ?? "" };
      }
      setStateMap(init);
      setLastInitSession(sessionId);
    }
  }, [assessments, assessmentsLoading, sessionId, lastInitSession]);

  function handleRate(itemId: number, rating: AnyRating) {
    setStateMap(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId] ?? { note: "" }, rating },
    }));
    upsert.mutate({
      data: {
        sessionId,
        itemId,
        rating,
        note: stateMap[itemId]?.note ?? null,
      },
    });
  }

  function handleNote(itemId: number, note: string) {
    setStateMap(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId] ?? { rating: null }, note },
    }));
  }

  function handleBlur(itemId: number) {
    const s = stateMap[itemId];
    upsert.mutate({
      data: {
        sessionId,
        itemId,
        rating: s?.rating ?? null,
        note: s?.note ?? null,
      },
    });
  }

  // Group items by section
  const sections = new Map<string, ProbationItem[]>();
  for (const item of items) {
    if (!sections.has(item.section)) sections.set(item.section, []);
    sections.get(item.section)!.push(item);
  }

  const stats = overallStatus(items, stateMap);

  const statusColors = {
    green: { bar: "bg-green-500", badge: "bg-green-100 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800" },
    amber: { bar: "bg-amber-500", badge: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800" },
    red: { bar: "bg-red-500", badge: "bg-red-100 text-red-600 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800" },
    gray: { bar: "bg-muted-foreground/30", badge: "bg-muted text-muted-foreground border-border" },
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Probation Review</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This is your guide to what good looks like during your probation period. Work through each section at your own pace — your progress saves automatically.
        </p>
      </div>

      {/* Progress Summary */}
      <div className={cn("rounded-xl border p-5 mb-7", statusColors[stats.color].badge)}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-sm">Overall progress</span>
              <span className="font-bold text-sm">{stats.pct}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
              <div
                className={cn(statusColors[stats.color].bar, "h-full rounded-full transition-all duration-500")}
                style={{ width: `${stats.pct}%` }}
              />
            </div>
            <p className="mt-2 text-xs font-medium opacity-80">{stats.label}</p>
          </div>
          <div className="flex gap-4 sm:gap-5 text-center shrink-0">
            <div>
              <div className="text-xl font-bold text-green-600 dark:text-green-400">{stats.yesCount}</div>
              <div className="text-xs opacity-70">Yes / Most</div>
            </div>
            <div>
              <div className="text-xl font-bold text-amber-600 dark:text-amber-400">{stats.inProgressCount}</div>
              <div className="text-xs opacity-70">In Progress</div>
            </div>
            <div>
              <div className="text-xl font-bold text-red-600 dark:text-red-400">{stats.noCount}</div>
              <div className="text-xs opacity-70">Not Yet</div>
            </div>
            <div>
              <div className="text-xl font-bold text-muted-foreground">{stats.unratedCount}</div>
              <div className="text-xs opacity-70">Unrated</div>
            </div>
          </div>
        </div>
      </div>

      {/* Sections */}
      {itemsLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from(sections.entries()).map(([section, sectionItems]) => (
            <SectionBlock
              key={section}
              section={section}
              items={sectionItems}
              stateMap={stateMap}
              onRate={handleRate}
              onNote={handleNote}
              onBlur={handleBlur}
            />
          ))}
        </div>
      )}

      <p className="mt-8 text-xs text-muted-foreground text-center">
        Your ratings and notes are saved automatically as you go. This form is for your own reflection — your manager will review separately.
      </p>
    </div>
  );
}
