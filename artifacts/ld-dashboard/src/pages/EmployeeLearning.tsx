import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useLdStore } from "@/hooks/useLdStore";
import { Layout } from "@/components/Layout";
import { ArrowLeft, BookOpen, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

type LearningEntry = {
  id: number;
  dateOfLearning: string;
  training: string;
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

function EntryCard({ entry }: { entry: LearningEntry }) {
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
        {expanded
          ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
      </button>
      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">What did they learn?</p>
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

export default function EmployeeLearning() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const employeeId = parseInt(params.id ?? "");
  const { ldUser } = useLdStore();

  const whatsNewQuery = useQuery<any[]>({
    queryKey: ["ld-whats-new", ldUser?.id],
    queryFn: async () => {
      if (!ldUser) return [];
      const res = await fetch(`/api/manager-ld/whats-new-all?ldUserId=${ldUser.id}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!ldUser,
  });
  const whatsNewCount = whatsNewQuery.data?.length ?? 0;

  if (!ldUser) { navigate("/"); return null; }

  const { data: entries = [], isLoading } = useQuery<LearningEntry[]>({
    queryKey: ["employee-entries", employeeId],
    queryFn: async () => {
      const res = await fetch(`/api/manager-ld/employee/${employeeId}/entries`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !isNaN(employeeId),
  });

  const name = entries[0]?.employeeName ?? "Employee";
  const jobTitle = entries[0]?.employeeJobTitle ?? null;

  return (
    <Layout whatsNewCount={whatsNewCount}>
      <div className="max-w-3xl mx-auto px-8 py-10">
        <button
          onClick={() => navigate("/home")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to all employees
        </button>

        <div className="flex items-center gap-4 mb-8">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-base font-bold text-primary">{getInitials(name)}</span>
          </div>
          <div>
            <h2 className="font-script text-3xl text-foreground leading-tight">{name}</h2>
            {jobTitle && <p className="text-muted-foreground text-sm mt-0.5">{jobTitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground">
          <BookOpen className="h-4 w-4" />
          <span>{entries.length} training {entries.length === 1 ? "entry" : "entries"}</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No learning entries recorded yet for this employee.
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map(entry => <EntryCard key={entry.id} entry={entry} />)}
          </div>
        )}
      </div>
    </Layout>
  );
}
