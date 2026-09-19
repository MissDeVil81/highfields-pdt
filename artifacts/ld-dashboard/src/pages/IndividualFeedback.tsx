import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLdStore } from "@/hooks/useLdStore";
import { Layout } from "@/components/Layout";
import {
  MessageSquare, Plus, X, ChevronDown, ChevronUp, Loader2,
  Send, BookOpen, Lock, User, Users
} from "lucide-react";
import { cn } from "@/lib/utils";

type Employee = { id: number; name: string; jobTitle: string | null };

type FeedbackEntry = {
  id: number;
  userId: number;
  employeeName: string;
  employeeJobTitle: string | null;
  title: string;
  authorName: string;
  content: string;
  feedbackDate: string;
  sendToManager: boolean;
  sendToIndividual: boolean;
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

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function DeliveryBadge({ sendToManager, sendToIndividual }: { sendToManager: boolean; sendToIndividual: boolean }) {
  if (!sendToManager && !sendToIndividual) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5">
        <Lock className="h-2.5 w-2.5" /> L&D only
      </span>
    );
  }
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {sendToManager && (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-700 bg-blue-50 rounded-full px-2 py-0.5">
          <Send className="h-2.5 w-2.5" /> Manager
        </span>
      )}
      {sendToIndividual && (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-700 bg-green-50 rounded-full px-2 py-0.5">
          <BookOpen className="h-2.5 w-2.5" /> Individual
        </span>
      )}
    </div>
  );
}

function FeedbackCard({ entry }: { entry: FeedbackEntry }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        className="w-full flex items-start justify-between px-5 py-4 text-left hover:bg-accent/30 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex-1 min-w-0 pr-4">
          <p className="font-semibold text-sm text-foreground">{entry.title || "Untitled Feedback"}</p>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              {entry.authorName}
            </span>
            {entry.feedbackDate && (
              <span className="text-xs text-muted-foreground">{entry.feedbackDate}</span>
            )}
            <DeliveryBadge sendToManager={entry.sendToManager} sendToIndividual={entry.sendToIndividual} />
          </div>
        </div>
        {expanded
          ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />}
      </button>
      {expanded && (
        <div className="px-5 pb-5 pt-3 border-t border-border">
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{entry.content}</p>
        </div>
      )}
    </div>
  );
}

type FormData = {
  userId: string;
  title: string;
  feedbackDate: string;
  content: string;
};

const EMPTY_FORM: FormData = { userId: "", title: "", feedbackDate: "", content: "" };

type DeliveryOption = "save" | "manager" | "individual";

function AddFeedbackPanel({
  onClose,
  employees,
  authorName,
}: {
  onClose: () => void;
  employees: Employee[];
  authorName: string;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [delivery, setDelivery] = useState<Set<DeliveryOption>>(new Set(["save"]));
  const [errors, setErrors] = useState<Partial<Record<keyof FormData | "delivery", string>>>({});

  const set = (field: keyof FormData, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: undefined }));
  };

  const toggleDelivery = (opt: DeliveryOption) => {
    setDelivery(prev => {
      const next = new Set(prev);
      if (next.has(opt)) next.delete(opt);
      else next.add(opt);
      return next;
    });
    setErrors(e => ({ ...e, delivery: undefined }));
  };

  const validate = () => {
    const e: Partial<Record<keyof FormData | "delivery", string>> = {};
    if (!form.userId) e.userId = "Please select an employee";
    if (!form.title.trim()) e.title = "Title is required";
    if (!form.content.trim()) e.content = "Feedback content is required";
    if (delivery.size === 0) e.delivery = "Select at least one delivery option";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const create = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/ld-feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: parseInt(form.userId),
          authorName,
          title: form.title,
          content: form.content,
          feedbackDate: form.feedbackDate,
          sendToManager: delivery.has("manager"),
          sendToIndividual: delivery.has("individual"),
        }),
      });
      if (!res.ok) throw new Error("Failed to create");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ld-feedback"] });
      queryClient.invalidateQueries({ queryKey: ["ld-whats-new"] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    create.mutate();
  };

  const deliveryOptions: { id: DeliveryOption; label: string; description: string; icon: React.ReactNode; color: string }[] = [
    {
      id: "save",
      label: "Save to individual's record",
      description: "L&D view only — visible in this dashboard",
      icon: <Lock className="h-4 w-4" />,
      color: "text-muted-foreground",
    },
    {
      id: "manager",
      label: "Send to Manager",
      description: "Appears in the manager portal under this individual's record and in What's New",
      icon: <Send className="h-4 w-4" />,
      color: "text-blue-600",
    },
    {
      id: "individual",
      label: "Send to Individual",
      description: "Appears in the individual's learning log and What's New in their system",
      icon: <BookOpen className="h-4 w-4" />,
      color: "text-green-600",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 py-6 overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-xl my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="text-base font-semibold text-foreground">Add Individual Feedback</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Employee */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Employee <span className="text-red-500">*</span>
            </label>
            <select
              value={form.userId}
              onChange={e => set("userId", e.target.value)}
              className={cn(
                "w-full rounded-lg border bg-background text-sm text-foreground px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary",
                errors.userId ? "border-red-400" : "border-border"
              )}
            >
              <option value="">— Select employee —</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}{emp.jobTitle ? ` · ${emp.jobTitle}` : ""}
                </option>
              ))}
            </select>
            {errors.userId && <p className="text-xs text-red-500 mt-1">{errors.userId}</p>}
          </div>

          {/* Title & Date row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={e => set("title", e.target.value)}
                placeholder="e.g. Q2 Development Review"
                className={cn(
                  "w-full rounded-lg border bg-background text-sm text-foreground px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary",
                  errors.title ? "border-red-400" : "border-border"
                )}
              />
              {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Date
              </label>
              <input
                type="text"
                value={form.feedbackDate}
                onChange={e => set("feedbackDate", e.target.value)}
                placeholder="e.g. 10/08/26"
                className="w-full rounded-lg border border-border bg-background text-sm text-foreground px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Feedback <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.content}
              onChange={e => set("content", e.target.value)}
              placeholder="Write your feedback here…"
              rows={5}
              className={cn(
                "w-full rounded-lg border bg-background text-sm text-foreground px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary resize-none",
                errors.content ? "border-red-400" : "border-border"
              )}
            />
            {errors.content && <p className="text-xs text-red-500 mt-1">{errors.content}</p>}
          </div>

          {/* Delivery options */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
              Delivery Options <span className="text-red-500">*</span>
              <span className="ml-1 font-normal normal-case text-muted-foreground/60">(select one or more)</span>
            </label>
            <div className="space-y-2">
              {deliveryOptions.map(opt => {
                const checked = delivery.has(opt.id);
                return (
                  <label
                    key={opt.id}
                    className={cn(
                      "flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all",
                      checked
                        ? "border-primary/40 bg-primary/5"
                        : "border-border hover:border-border/80 hover:bg-muted/30"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleDelivery(opt.id)}
                      className="mt-0.5 h-4 w-4 rounded border-border accent-primary flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className={cn("flex items-center gap-2 text-sm font-medium", checked ? "text-foreground" : "text-foreground/80")}>
                        <span className={opt.color}>{opt.icon}</span>
                        {opt.label}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{opt.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>
            {errors.delivery && <p className="text-xs text-red-500 mt-1">{errors.delivery}</p>}
          </div>

          {create.isError && (
            <p className="text-sm text-red-500">Something went wrong. Please try again.</p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-1">
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
              Save Feedback
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function IndividualFeedback() {
  const [, navigate] = useLocation();
  const { ldUser } = useLdStore();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  if (!ldUser) { navigate("/"); return null; }

  const whatsNewCount = useWhatsNewCount(ldUser.id);

  const { data: employees = [], isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ["ld-employees-list"],
    queryFn: async () => {
      const res = await fetch(`/api/manager-ld/all-employees`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.map((e: any) => ({ id: e.id, name: e.name, jobTitle: e.jobTitle }));
    },
  });

  const { data: allFeedback = [], isLoading: feedbackLoading } = useQuery<FeedbackEntry[]>({
    queryKey: ["ld-feedback"],
    queryFn: async () => {
      const res = await fetch(`/api/ld-feedback`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const visibleFeedback = selectedEmployeeId
    ? allFeedback.filter(f => f.userId === selectedEmployeeId)
    : allFeedback;

  const selectedEmployee = selectedEmployeeId
    ? employees.find(e => e.id === selectedEmployeeId) ?? null
    : null;

  return (
    <Layout whatsNewCount={whatsNewCount}>
      <div className="max-w-4xl mx-auto px-8 py-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h2 className="font-script text-4xl text-foreground">Individual Feedback</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Personalised feedback and development notes for individual team members.
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity shrink-0 mt-1"
          >
            <Plus className="h-4 w-4" />
            Add New Feedback
          </button>
        </div>

        {/* Employee filter */}
        <div className="mb-6">
          <label htmlFor="feedback-employee-filter" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
            Filter by employee
          </label>
          <div className="relative max-w-sm">
            <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <select
              id="feedback-employee-filter"
              value={selectedEmployeeId ?? ""}
              onChange={event => {
                const value = event.target.value;
                setSelectedEmployeeId(value ? Number(value) : null);
              }}
              disabled={employeesLoading}
              className="w-full appearance-none rounded-lg border border-border bg-card py-2.5 pl-9 pr-9 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            >
              <option value="">All employees</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}{emp.jobTitle ? ` · ${emp.jobTitle}` : ""}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>

        {/* Stats strip */}
        <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground">
          <MessageSquare className="h-4 w-4" />
          <span>
            {visibleFeedback.length} feedback {visibleFeedback.length === 1 ? "entry" : "entries"}
            {selectedEmployee ? ` for ${selectedEmployee.name}` : " across all employees"}
          </span>
        </div>

        {/* List */}
        {feedbackLoading || employeesLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : visibleFeedback.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 flex flex-col items-center justify-center py-20 text-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <MessageSquare className="h-6 w-6 text-primary/60" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No feedback yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {selectedEmployee
                ? `No feedback recorded for ${selectedEmployee.name} yet.`
                : `Click "Add New Feedback" to record the first entry.`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {!selectedEmployee && (
              /* Group by employee when showing all */
              (() => {
                const byEmployee = visibleFeedback.reduce((acc, f) => {
                  const key = f.userId;
                  if (!acc[key]) acc[key] = { name: f.employeeName, jobTitle: f.employeeJobTitle, entries: [] };
                  acc[key].entries.push(f);
                  return acc;
                }, {} as Record<number, { name: string; jobTitle: string | null; entries: FeedbackEntry[] }>);

                return Object.entries(byEmployee).map(([userId, group]) => (
                  <div key={userId} className="space-y-2">
                    <div className="flex items-center gap-2 pt-2">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-[9px] font-bold text-primary">{getInitials(group.name)}</span>
                      </div>
                      <p className="text-xs font-semibold text-foreground">{group.name}</p>
                      {group.jobTitle && <p className="text-xs text-muted-foreground">· {group.jobTitle}</p>}
                    </div>
                    {group.entries.map(entry => <FeedbackCard key={entry.id} entry={entry} />)}
                  </div>
                ));
              })()
            )}
            {selectedEmployee && visibleFeedback.map(entry => <FeedbackCard key={entry.id} entry={entry} />)}
          </div>
        )}
      </div>

      {showForm && (
        <AddFeedbackPanel
          onClose={() => setShowForm(false)}
          employees={employees}
          authorName={ldUser.name}
        />
      )}
    </Layout>
  );
}
