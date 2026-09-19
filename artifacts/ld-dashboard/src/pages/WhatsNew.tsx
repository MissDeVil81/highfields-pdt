import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLdStore } from "@/hooks/useLdStore";
import { Layout } from "@/components/Layout";
import { Sparkles, ChevronDown, ChevronUp, Check, Loader2 } from "lucide-react";

type WhatsNewEntry = {
  id: number;
  userId: number;
  training: string;
  dateOfLearning: string;
  deliveredBy: string;
  whatDidILearn: string;
  furtherTrainingNeeded: string;
  createdAt: string;
  employeeName: string;
  employeeJobTitle: string | null;
};

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function EntryCard({ entry, ldUserId }: { entry: WhatsNewEntry; ldUserId: number }) {
  const [expanded, setExpanded] = useState(false);
  const queryClient = useQueryClient();

  const markViewed = useMutation({
    mutationFn: async () => {
      await fetch(`/api/manager-ld/viewed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ managerId: ldUserId, entryId: entry.id }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ld-whats-new", ldUserId] });
    },
  });

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={() => setExpanded(v => !v)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setExpanded(v => !v);
          }
        }}
        className="flex items-start gap-3 px-5 py-4 cursor-pointer hover:bg-accent/40 transition-colors"
      >
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-xs font-bold text-primary">{getInitials(entry.employeeName)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-sm text-foreground">{entry.training}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {entry.employeeName}
                {entry.employeeJobTitle ? ` · ${entry.employeeJobTitle}` : ""}
                {" · "}{entry.dateOfLearning}
              </p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {expanded
                ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  markViewed.mutate();
                }}
                onKeyDown={(event) => event.stopPropagation()}
                disabled={markViewed.isPending}
                title="Mark as viewed"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-green-600 hover:bg-green-50 transition-colors"
              >
                <Check className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-border pt-4 ml-11">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Date of learning</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{entry.dateOfLearning || "Not provided"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Delivered by</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{entry.deliveredBy || "Not provided"}</p>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Training</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{entry.training || "Not provided"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">What did they learn?</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{entry.whatDidILearn || "Not provided"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Further training needed</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {entry.furtherTrainingNeeded || "No further training noted"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WhatsNew() {
  const [, navigate] = useLocation();
  const { ldUser } = useLdStore();

  if (!ldUser) { navigate("/"); return null; }

  const { data: entries = [], isLoading } = useQuery<WhatsNewEntry[]>({
    queryKey: ["ld-whats-new", ldUser.id],
    queryFn: async () => {
      const res = await fetch(`/api/manager-ld/whats-new-all?ldUserId=${ldUser.id}`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const whatsNewCount = entries.length;

  return (
    <Layout whatsNewCount={whatsNewCount}>
      <div className="max-w-3xl mx-auto px-8 py-10">
        <div className="mb-8">
          <h2 className="font-script text-4xl text-foreground">What's New</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            New training entries added since your last login. Click ✓ to dismiss once reviewed.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <Sparkles className="h-7 w-7 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">You're all caught up</p>
            <p className="text-xs text-muted-foreground mt-1">No new training records since your last login.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground mb-4">
              {entries.length} new training {entries.length === 1 ? "record" : "records"} since your last login.
            </p>
            {entries.map(entry => (
              <EntryCard key={entry.id} entry={entry} ldUserId={ldUser.id} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
