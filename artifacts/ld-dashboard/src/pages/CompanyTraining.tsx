import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLdStore } from "@/hooks/useLdStore";
import { Layout } from "@/components/Layout";
import {
  BookMarked, Plus, X, ChevronDown, ChevronUp, Loader2, CalendarDays, User
} from "lucide-react";
import { cn } from "@/lib/utils";

type CompanyTrainingEntry = {
  id: number;
  title: string;
  dateOfLearning: string;
  trainer: string;
  description: string;
  createdAt: string;
};

function useWhatsNewCount(ldUserId: number) {
  const { data = [] } = useQuery<any[]>({
    queryKey: ["ld-whats-new", ldUserId],
    queryFn: async () => {
      const res = await fetch(`/api/manager-ld/whats-new-all?ldUserId=${ldUserId}`);
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 60_000,
  });
  return data.length;
}

function TrainingCard({ entry }: { entry: CompanyTrainingEntry }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        className="w-full flex items-start justify-between px-5 py-4 text-left hover:bg-accent/30 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex-1 min-w-0 pr-4">
          <p className="font-semibold text-sm text-foreground">{entry.title}</p>
          <div className="flex items-center gap-4 mt-1.5 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarDays className="h-3 w-3" />
              {entry.dateOfLearning}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              {entry.trainer}
            </span>
          </div>
        </div>
        {expanded
          ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />}
      </button>
      {expanded && entry.description && (
        <div className="px-5 pb-5 pt-3 border-t border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Description</p>
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{entry.description}</p>
        </div>
      )}
    </div>
  );
}

type FormData = {
  title: string;
  dateOfLearning: string;
  trainer: string;
  description: string;
};

const EMPTY_FORM: FormData = { title: "", dateOfLearning: "", trainer: "", description: "" };

function AddTrainingPanel({
  onClose,
  ldUserId,
}: {
  onClose: () => void;
  ldUserId: number;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<FormData>>({});

  const set = (field: keyof FormData, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: undefined }));
  };

  const validate = () => {
    const e: Partial<FormData> = {};
    if (!form.title.trim()) e.title = "Title is required";
    if (!form.dateOfLearning.trim()) e.dateOfLearning = "Date is required";
    if (!form.trainer.trim()) e.trainer = "Trainer is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const create = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/company-learning`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to create");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-training"] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    create.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="text-base font-semibold text-foreground">Add New Company Training</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Training Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={e => set("title", e.target.value)}
              placeholder="e.g. Trust Equation"
              className={cn(
                "w-full rounded-lg border bg-background text-sm text-foreground px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary",
                errors.title ? "border-red-400" : "border-border"
              )}
            />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
          </div>

          {/* Date & Trainer row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.dateOfLearning}
                onChange={e => set("dateOfLearning", e.target.value)}
                placeholder="e.g. 03/03/26"
                className={cn(
                  "w-full rounded-lg border bg-background text-sm text-foreground px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary",
                  errors.dateOfLearning ? "border-red-400" : "border-border"
                )}
              />
              {errors.dateOfLearning && <p className="text-xs text-red-500 mt-1">{errors.dateOfLearning}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Trainer / Facilitator <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.trainer}
                onChange={e => set("trainer", e.target.value)}
                placeholder="e.g. Emily Amos"
                className={cn(
                  "w-full rounded-lg border bg-background text-sm text-foreground px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary",
                  errors.trainer ? "border-red-400" : "border-border"
                )}
              />
              {errors.trainer && <p className="text-xs text-red-500 mt-1">{errors.trainer}</p>}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={e => set("description", e.target.value)}
              placeholder="What was covered in this session?"
              rows={4}
              className="w-full rounded-lg border border-border bg-background text-sm text-foreground px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          {create.isError && (
            <p className="text-sm text-red-500">Something went wrong. Please try again.</p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={create.isPending}
              className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {create.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Add Training
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CompanyTraining() {
  const [, navigate] = useLocation();
  const { ldUser } = useLdStore();
  const [showForm, setShowForm] = useState(false);

  if (!ldUser) { navigate("/"); return null; }

  const whatsNewCount = useWhatsNewCount(ldUser.id);

  const { data: entries = [], isLoading } = useQuery<CompanyTrainingEntry[]>({
    queryKey: ["company-training"],
    queryFn: async () => {
      const res = await fetch(`/api/company-learning`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  return (
    <Layout whatsNewCount={whatsNewCount}>
      <div className="max-w-4xl mx-auto px-8 py-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h2 className="font-script text-4xl text-foreground">Company Training</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Organisation-wide training programmes and resources.
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity shrink-0 mt-1"
          >
            <Plus className="h-4 w-4" />
            Add New Training
          </button>
        </div>

        {/* Stats */}
        <div className="bg-card border border-border rounded-xl p-4 mb-6 flex items-center gap-2">
          <BookMarked className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">{entries.length} training {entries.length === 1 ? "session" : "sessions"} recorded</span>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 flex flex-col items-center justify-center py-20 text-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <BookMarked className="h-6 w-6 text-primary/60" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No training sessions yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Click "Add New Training" to record the first session.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map(entry => <TrainingCard key={entry.id} entry={entry} />)}
          </div>
        )}
      </div>

      {showForm && (
        <AddTrainingPanel onClose={() => setShowForm(false)} ldUserId={ldUser.id} />
      )}
    </Layout>
  );
}
