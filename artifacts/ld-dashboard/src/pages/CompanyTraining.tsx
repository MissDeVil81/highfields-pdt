import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLdStore } from "@/hooks/useLdStore";
import { Layout } from "@/components/Layout";
import {
  BookMarked, Plus, X, ChevronDown, ChevronUp, Loader2, CalendarDays, User, Users, Check
} from "lucide-react";
import { cn } from "@/lib/utils";

type CompanyTrainingEntry = {
  id: number;
  title: string;
  dateOfLearning: string;
  trainer: string;
  description: string;
  createdAt: string;
  recipientUserIds: number[];
  recipientNames: string[];
};

type TrainingRecipient = {
  id: number;
  name: string;
  jobTitle: string | null;
  roles: string[];
  isActive: string;
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
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              {entry.recipientNames.length > 0
                ? `${entry.recipientNames.length} ${entry.recipientNames.length === 1 ? "person" : "people"}`
                : "All employees"}
            </span>
          </div>
        </div>
        {expanded
          ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />}
      </button>
      {expanded && (
        <div className="px-5 pb-5 pt-3 border-t border-border">
          {entry.description && (
            <>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Description</p>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{entry.description}</p>
            </>
          )}
          <p className={cn(
            "text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2",
            entry.description && "mt-4"
          )}>
            Applicable to
          </p>
          <p className="text-sm text-foreground">
            {entry.recipientNames.length > 0 ? entry.recipientNames.join(", ") : "All employees"}
          </p>
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
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [recipientError, setRecipientError] = useState("");
  const [recipientPickerOpen, setRecipientPickerOpen] = useState(false);

  const { data: recipients = [], isLoading: recipientsLoading } = useQuery<TrainingRecipient[]>({
    queryKey: ["company-training-recipients"],
    queryFn: async () => {
      const res = await fetch("/api/users?status=active");
      if (!res.ok) throw new Error("Failed to load people");
      const users: TrainingRecipient[] = await res.json();
      return users
        .filter(user => user.isActive === "active" && user.roles.includes("employee"))
        .sort((a, b) => a.name.localeCompare(b.name));
    },
  });

  const set = (field: keyof FormData, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: undefined }));
  };

  const validate = () => {
    const e: Partial<FormData> = {};
    if (!form.title.trim()) e.title = "Title is required";
    if (!form.dateOfLearning.trim()) e.dateOfLearning = "Date is required";
    if (!form.trainer.trim()) e.trainer = "Trainer is required";
    const activeRecipientIds = new Set(recipients.map(person => person.id));
    const hasInactiveOrStaleSelection = selectedUserIds.some(id => !activeRecipientIds.has(id));
    if (selectedUserIds.length === 0) {
      setRecipientError("Select at least one person");
    } else if (hasInactiveOrStaleSelection) {
      setRecipientError("Refresh the people list and select active people only");
    } else {
      setRecipientError("");
    }
    setErrors(e);
    return Object.keys(e).length === 0 && selectedUserIds.length > 0 && !hasInactiveOrStaleSelection;
  };

  const toggleRecipient = (userId: number) => {
    setSelectedUserIds(current =>
      current.includes(userId)
        ? current.filter(id => id !== userId)
        : [...current, userId]
    );
    setRecipientError("");
  };

  const create = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/company-learning`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, recipientUserIds: selectedUserIds }),
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

          {/* Applicable people */}
          <div className="relative">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Applicable to <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => setRecipientPickerOpen(open => !open)}
              className={cn(
                "w-full rounded-lg border bg-background px-3 py-2.5 text-left text-sm focus:outline-none focus:ring-2 focus:ring-primary flex items-center justify-between gap-3",
                recipientError ? "border-red-400" : "border-border"
              )}
            >
              <span className={selectedUserIds.length > 0 ? "text-foreground" : "text-muted-foreground"}>
                {selectedUserIds.length > 0
                  ? `${selectedUserIds.length} ${selectedUserIds.length === 1 ? "person" : "people"} selected`
                  : "Select people"}
              </span>
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", recipientPickerOpen && "rotate-180")} />
            </button>

            {recipientPickerOpen && (
              <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-popover shadow-lg">
                <div className="max-h-56 overflow-y-auto p-1.5">
                  {recipientsLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : recipients.length === 0 ? (
                    <p className="px-3 py-4 text-center text-xs text-muted-foreground">No active people found.</p>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          const allSelected = selectedUserIds.length === recipients.length;
                          setSelectedUserIds(allSelected ? [] : recipients.map(person => person.id));
                          setRecipientError("");
                        }}
                        className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-accent transition-colors border-b border-border mb-1"
                      >
                        <span className={cn(
                          "h-4 w-4 rounded border flex items-center justify-center shrink-0",
                          selectedUserIds.length === recipients.length
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-border"
                        )}>
                          {selectedUserIds.length === recipients.length && <Check className="h-3 w-3" />}
                        </span>
                        <span className="text-sm font-semibold text-foreground">All employees</span>
                      </button>
                      {recipients.map(person => {
                        const isSelected = selectedUserIds.includes(person.id);
                        return (
                          <button
                            key={person.id}
                            type="button"
                            onClick={() => toggleRecipient(person.id)}
                            className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-accent transition-colors"
                          >
                            <span className={cn(
                              "h-4 w-4 rounded border flex items-center justify-center shrink-0",
                              isSelected ? "bg-primary border-primary text-primary-foreground" : "border-border"
                            )}>
                              {isSelected && <Check className="h-3 w-3" />}
                            </span>
                            <span className="min-w-0">
                              <span className="block text-sm font-medium text-foreground">{person.name}</span>
                              {person.jobTitle && (
                                <span className="block truncate text-xs text-muted-foreground">{person.jobTitle}</span>
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </>
                  )}
                </div>
                <div className="flex items-center justify-end gap-3 border-t border-border px-3 py-2">
                  <button
                    type="button"
                    onClick={() => setRecipientPickerOpen(false)}
                    className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}

            {recipientError && <p className="text-xs text-red-500 mt-1">{recipientError}</p>}
            {selectedUserIds.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1.5">
                {recipients
                  .filter(person => selectedUserIds.includes(person.id))
                  .map(person => person.name)
                  .join(", ")}
              </p>
            )}
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
              disabled={create.isPending || recipientsLoading}
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
