import { useState } from "react";
import { useSearch, useLocation } from "wouter";
import { useSessionStore } from "@/lib/session";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, BookOpen, Building2, MessageSquare, ChevronDown, ChevronUp, X, Search, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type LearningEntry = {
  id: number;
  userId: number;
  dateOfLearning: string;
  training: string;
  deliveredBy: string;
  whatDidILearn: string;
  furtherTrainingNeeded: string;
  createdAt: string;
};

type CompanyLearningEntry = {
  id: number;
  title: string;
  dateOfLearning: string;
  trainer: string;
  description: string;
  createdAt: string;
};

type LdFeedbackEntry = {
  id: number;
  userId: number;
  title?: string;
  authorName: string;
  content: string;
  feedbackDate: string;
  createdAt: string;
};

type LearningFilters = {
  search: string;
  fromDate: string;
  toDate: string;
};

const TABS = [
  { key: "company-learning", label: "Company Learning",  icon: Building2 },
  { key: "my-learning",      label: "My Learning",       icon: BookOpen },
  { key: "ld-feedback",      label: "L&D Feedback",      icon: MessageSquare },
] as const;

type TabKey = typeof TABS[number]["key"];

function EmptyReadOnly({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground text-sm">
      {message}
    </div>
  );
}

function normaliseDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const ukMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (ukMatch) {
    const year = ukMatch[3].length === 2 ? `20${ukMatch[3]}` : ukMatch[3];
    return `${year}-${ukMatch[2].padStart(2, "0")}-${ukMatch[1].padStart(2, "0")}`;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return [
    parsed.getFullYear(),
    String(parsed.getMonth() + 1).padStart(2, "0"),
    String(parsed.getDate()).padStart(2, "0"),
  ].join("-");
}

function matchesLearningFilters(
  filters: LearningFilters,
  searchableText: string,
  dateValue: string | null | undefined,
) {
  const query = filters.search.trim().toLowerCase();
  const matchesSearch = !query || searchableText.toLowerCase().includes(query);
  if (!matchesSearch) return false;

  const entryDate = normaliseDate(dateValue);
  if (filters.fromDate && (!entryDate || entryDate < filters.fromDate)) return false;
  if (filters.toDate && (!entryDate || entryDate > filters.toDate)) return false;
  return true;
}

function LearningFiltersBar({
  filters,
  onChange,
  resultCount,
  totalCount,
}: {
  filters: LearningFilters;
  onChange: (filters: LearningFilters) => void;
  resultCount?: number;
  totalCount?: number;
}) {
  const hasFilters = !!filters.search || !!filters.fromDate || !!filters.toDate;

  return (
    <div className="mb-6 rounded-xl border border-border bg-card p-4">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end">
        <div>
          <label htmlFor="learning-search" className="mb-1.5 block text-xs font-semibold text-foreground">
            Search
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="learning-search"
              type="search"
              value={filters.search}
              onChange={e => onChange({ ...filters, search: e.target.value })}
              placeholder="Search by keyword, trainer or topic"
              className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        <div>
          <label htmlFor="learning-from-date" className="mb-1.5 block text-xs font-semibold text-foreground">
            From
          </label>
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="learning-from-date"
              type="date"
              value={filters.fromDate}
              onChange={e => onChange({ ...filters, fromDate: e.target.value })}
              className="rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        <div>
          <label htmlFor="learning-to-date" className="mb-1.5 block text-xs font-semibold text-foreground">
            To
          </label>
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="learning-to-date"
              type="date"
              value={filters.toDate}
              onChange={e => onChange({ ...filters, toDate: e.target.value })}
              className="rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>
      {hasFilters && resultCount !== undefined && totalCount !== undefined && (
        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>Showing {resultCount} of {totalCount}</span>
          <button
            type="button"
            onClick={() => onChange({ search: "", fromDate: "", toDate: "" })}
            className="font-medium text-primary hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}

function EntryCard({ entry, onDelete }: { entry: LearningEntry; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-accent/40 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div>
          <p className="font-semibold text-sm text-foreground">{entry.training}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{entry.dateOfLearning} · {entry.deliveredBy}</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            role="button"
            tabIndex={0}
            onClick={e => { e.stopPropagation(); onDelete(); }}
            onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); onDelete(); } }}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
            title="Delete entry"
          >
            <Trash2 className="h-4 w-4" />
          </span>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>
      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">What did I learn?</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{entry.whatDidILearn}</p>
          </div>
          {entry.furtherTrainingNeeded && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Further training needed</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{entry.furtherTrainingNeeded}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CompanyLearningCard({ entry }: { entry: CompanyLearningEntry }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-accent/40 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div>
          <p className="font-semibold text-sm text-foreground">{entry.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{entry.dateOfLearning} · {entry.trainer}</p>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
      </button>
      {expanded && entry.description && (
        <div className="px-5 pb-5 border-t border-border pt-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">About this session</p>
          <p className="text-sm text-foreground whitespace-pre-wrap">{entry.description}</p>
        </div>
      )}
    </div>
  );
}

function FeedbackCard({ entry }: { entry: LdFeedbackEntry }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-accent/40 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div>
          <p className="font-semibold text-sm text-foreground">Note from {entry.authorName}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {entry.feedbackDate || new Date(entry.createdAt).toLocaleDateString("en-GB")}
          </p>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
      </button>
      {expanded && (
        <div className="px-5 pb-5 border-t border-border pt-4">
          <p className="text-sm text-foreground whitespace-pre-wrap">{entry.content}</p>
        </div>
      )}
    </div>
  );
}

function AddEntryForm({ userId, onClose }: { userId: number; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    dateOfLearning: "",
    training: "",
    deliveredBy: "",
    whatDidILearn: "",
    furtherTrainingNeeded: "",
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch(`${BASE}/api/learning-log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, userId }),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["learning-log", userId] });
      onClose();
    },
  });

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value })),
  });

  return (
    <div className="rounded-xl border border-primary/30 bg-accent/20 p-5 space-y-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold text-sm text-foreground">New Learning Entry</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div>
        <label className="block text-xs font-semibold text-foreground mb-1.5">Date of learning</label>
        <input
          type="text"
          placeholder="When did the training take place?"
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          {...field("dateOfLearning")}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-foreground mb-1.5">Training</label>
        <textarea
          rows={2}
          placeholder="What was the learning you did?"
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          {...field("training")}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-foreground mb-1.5">Delivered by</label>
        <input
          type="text"
          placeholder="Who delivered the training? A person, a webinar etc."
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          {...field("deliveredBy")}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-foreground mb-1.5">What did I learn?</label>
        <textarea
          rows={3}
          placeholder="What were your key takeaways?"
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          {...field("whatDidILearn")}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-foreground mb-1.5">Any further training needed?</label>
        <textarea
          rows={2}
          placeholder="Write anything you want to work on or develop following this training."
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          {...field("furtherTrainingNeeded")}
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => mutation.mutate(form)}
          disabled={!form.dateOfLearning || !form.training || !form.deliveredBy || !form.whatDidILearn || mutation.isPending}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        >
          {mutation.isPending ? "Saving…" : "Save entry"}
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-accent transition-colors"
        >
          Cancel
        </button>
      </div>
      {mutation.isError && <p className="text-xs text-destructive">Failed to save. Please try again.</p>}
    </div>
  );
}

function CompanyLearningTab({ filters }: { filters: LearningFilters }) {
  const { data: entries = [], isLoading } = useQuery<CompanyLearningEntry[]>({
    queryKey: ["company-learning"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/company-learning`);
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(2)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
      </div>
    );
  }

  if (entries.length === 0) {
    return <EmptyReadOnly message="No company learning sessions have been added yet. Check back soon." />;
  }

  const filteredEntries = entries.filter(entry =>
    matchesLearningFilters(
      filters,
      [entry.title, entry.trainer, entry.description, entry.dateOfLearning].join(" "),
      entry.dateOfLearning,
    )
  );

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground pb-1">
        Company-wide training and development sessions, managed by the L&amp;D team.
      </p>
      {filteredEntries.length === 0 ? (
        <EmptyReadOnly message="No company learning sessions match your search or date range." />
      ) : (
        filteredEntries.map(entry => <CompanyLearningCard key={entry.id} entry={entry} />)
      )}
    </div>
  );
}

function LdFeedbackTab({ userId, filters }: { userId: number; filters: LearningFilters }) {
  const { data: entries = [], isLoading } = useQuery<LdFeedbackEntry[]>({
    queryKey: ["ld-feedback", userId],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/ld-feedback?userId=${userId}`);
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(2)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
      </div>
    );
  }

  if (entries.length === 0) {
    return <EmptyReadOnly message="No L&D feedback has been added yet. Your L&D team will add notes here as part of your development." />;
  }

  const filteredEntries = entries.filter(entry =>
    matchesLearningFilters(
      filters,
      [entry.title ?? "", entry.authorName, entry.content, entry.feedbackDate].join(" "),
      entry.feedbackDate || entry.createdAt,
    )
  );

  return (
    <div className="space-y-3">
      {filteredEntries.length === 0 ? (
        <EmptyReadOnly message="No L&D feedback matches your search or date range." />
      ) : (
        filteredEntries.map(entry => <FeedbackCard key={entry.id} entry={entry} />)
      )}
    </div>
  );
}

function MyLearningTab({ userId, filters }: { userId: number; filters: LearningFilters }) {
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: entries = [], isLoading } = useQuery<LearningEntry[]>({
    queryKey: ["learning-log", userId],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/learning-log?userId=${userId}`);
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`${BASE}/api/learning-log/${id}?userId=${userId}`, { method: "DELETE" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["learning-log", userId] }),
  });

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Add and keep track of all the self-learning you do. This can include webinars, podcasts, TRN training, etc.
      </p>
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          Add new learning
        </button>
      )}

      {showForm && <AddEntryForm userId={userId} onClose={() => setShowForm(false)} />}

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : entries.length === 0 && !showForm ? (
        <EmptyReadOnly message="No learning entries yet. Click 'Add new learning' to record your first entry." />
      ) : (
        (() => {
          const filteredEntries = entries.filter(entry =>
            matchesLearningFilters(
              filters,
              [entry.training, entry.deliveredBy, entry.whatDidILearn, entry.furtherTrainingNeeded, entry.dateOfLearning].join(" "),
              entry.dateOfLearning,
            )
          );
          return filteredEntries.length === 0 ? (
            <EmptyReadOnly message="No learning entries match your search or date range." />
          ) : (
            <div className="space-y-3">
              {filteredEntries.map(entry => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  onDelete={() => deleteMutation.mutate(entry.id)}
                />
              ))}
            </div>
          );
        })()
      )}
    </div>
  );
}

export default function LearningLog() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const { userId } = useSessionStore();
  const [filters, setFilters] = useState<LearningFilters>({
    search: "",
    fromDate: "",
    toDate: "",
  });

  const activeTab: TabKey = (new URLSearchParams(search).get("tab") as TabKey) ?? "my-learning";
  const activeTabDescription = activeTab === "ld-feedback"
    ? "Search through all your feedback here."
    : "Search through all your training here.";

  function setTab(tab: TabKey) {
    navigate(`/learning-log?tab=${tab}`);
  }

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      <div className="mb-8">
        <h2 className="font-script text-4xl text-foreground">My Learning Log</h2>
        <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
          Record and track your learning and development journey.
        </p>
      </div>

      <p className="mb-3 text-sm text-muted-foreground">{activeTabDescription}</p>

      <LearningFiltersBar filters={filters} onChange={setFilters} />

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
              activeTab === key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "company-learning" && <CompanyLearningTab filters={filters} />}

      {activeTab === "my-learning" && userId != null && (
        <MyLearningTab userId={userId} filters={filters} />
      )}

      {activeTab === "ld-feedback" && userId != null && (
        <LdFeedbackTab userId={userId} filters={filters} />
      )}
    </div>
  );
}
