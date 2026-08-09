import { useState } from "react";
import { useSearch, useLocation } from "wouter";
import { useSessionStore } from "@/lib/session";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, BookOpen, Building2, MessageSquare, ChevronDown, ChevronUp, X } from "lucide-react";
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
          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Delete entry"
          >
            <Trash2 className="h-4 w-4" />
          </button>
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

      {/* Date of learning */}
      <div>
        <label className="block text-xs font-semibold text-foreground mb-1.5">Date of learning</label>
        <input
          type="text"
          placeholder="When did the training take place?"
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          {...field("dateOfLearning")}
        />
      </div>

      {/* Training */}
      <div>
        <label className="block text-xs font-semibold text-foreground mb-1.5">Training</label>
        <textarea
          rows={2}
          placeholder="What was the learning you did?"
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          {...field("training")}
        />
      </div>

      {/* Delivered by */}
      <div>
        <label className="block text-xs font-semibold text-foreground mb-1.5">Delivered by</label>
        <input
          type="text"
          placeholder="Who delivered the training? A person, a webinar etc."
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          {...field("deliveredBy")}
        />
      </div>

      {/* What did I learn */}
      <div>
        <label className="block text-xs font-semibold text-foreground mb-1.5">What did I learn?</label>
        <textarea
          rows={3}
          placeholder="What were your key takeaways?"
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          {...field("whatDidILearn")}
        />
      </div>

      {/* Further training needed */}
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

function MyLearningTab({ userId }: { userId: number }) {
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
        <div className="space-y-3">
          {entries.map(entry => (
            <EntryCard
              key={entry.id}
              entry={entry}
              onDelete={() => deleteMutation.mutate(entry.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function LearningLog() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const { userId } = useSessionStore();

  const activeTab: TabKey = (new URLSearchParams(search).get("tab") as TabKey) ?? "my-learning";

  function setTab(tab: TabKey) {
    navigate(`/learning-log?tab=${tab}`);
  }

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      <div className="mb-8">
        <h2 className="font-script text-4xl text-foreground">My Learning Log</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Record and track your learning and development journey.
        </p>
      </div>

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
      {activeTab === "company-learning" && (
        <EmptyReadOnly message="Company learning is managed by the L&D team. Content will appear here once the L&D portal is set up." />
      )}

      {activeTab === "my-learning" && userId != null && (
        <MyLearningTab userId={userId} />
      )}

      {activeTab === "ld-feedback" && (
        <EmptyReadOnly message="L&D feedback is managed by the L&D team. Feedback on your learning will appear here once the L&D portal is set up." />
      )}
    </div>
  );
}
