import { useGetReadinessSummary, useListEvidence } from "@workspace/api-client-react";
import { useSessionStore } from "@/lib/session";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { RatingBadge } from "@/components/RatingButton";
import { ArrowLeft, BarChart3 } from "lucide-react";

type Rating = "red" | "amber" | "green";

function RadialProgress({ pct, color }: { pct: number; color: string }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width="96" height="96" viewBox="0 0 96 96">
      <circle cx="48" cy="48" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/40" />
      <circle
        cx="48" cy="48" r={r} fill="none"
        stroke={color} strokeWidth="8"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 48 48)"
        style={{ transition: "stroke-dashoffset 0.5s ease" }}
      />
      <text x="48" y="48" textAnchor="middle" dominantBaseline="central" className="text-foreground font-bold" style={{ fontSize: 18, fill: "currentColor" }}>
        {pct}%
      </text>
    </svg>
  );
}

interface RoleSummaryCardProps {
  label: string;
  data: {
    title: string;
    totalCompetencies: number;
    green: number;
    amber: number;
    red: number;
    unrated: number;
    readinessPercent: number;
    evidenceCount?: number;
    financialStatus?: "achieved" | "in_progress" | "not_yet" | null;
  };
}

function RoleSummaryCard({ label, data }: RoleSummaryCardProps) {
  const pct = data.readinessPercent;
  const color = pct >= 70 ? "#22c55e" : pct >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">{label}</div>
      <div className="flex items-center gap-6">
        <RadialProgress pct={pct} color={color} />
        <div className="flex-1">
          <div className="font-bold text-foreground text-lg leading-tight">{data.title}</div>
          {data.evidenceCount !== undefined && (
            <div className="text-xs text-muted-foreground mt-0.5">{data.evidenceCount} evidence {data.evidenceCount === 1 ? "entry" : "entries"}</div>
          )}
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-foreground">
                <span className="h-2 w-2 rounded-full bg-green-500 inline-block" /> Ready
              </span>
              <span className="font-semibold text-foreground">{data.green}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-foreground">
                <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" /> In Progress
              </span>
              <span className="font-semibold text-foreground">{data.amber}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-foreground">
                <span className="h-2 w-2 rounded-full bg-red-500 inline-block" /> Not Ready
              </span>
              <span className="font-semibold text-foreground">{data.red}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-muted-foreground/40 inline-block" /> Unrated
              </span>
              <span className="font-semibold text-muted-foreground">{data.unrated}</span>
            </div>
          </div>
        </div>
      </div>
      {/* Progress bar */}
      <div className="mt-4 flex h-2 rounded-full overflow-hidden gap-0.5">
        {data.green > 0 && <div className="bg-green-500 rounded-full" style={{ flex: data.green }} />}
        {data.amber > 0 && <div className="bg-amber-500 rounded-full" style={{ flex: data.amber }} />}
        {data.red > 0 && <div className="bg-red-500 rounded-full" style={{ flex: data.red }} />}
        {data.unrated > 0 && <div className="bg-muted rounded-full" style={{ flex: data.unrated }} />}
      </div>

      {/* Financial status */}
      {data.financialStatus != null && (
        <div className={cn(
          "mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium",
          data.financialStatus === "achieved"
            ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400"
            : data.financialStatus === "in_progress"
            ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
            : "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400"
        )}>
          <span className="text-base leading-none">
            {data.financialStatus === "achieved" ? "✓" : data.financialStatus === "in_progress" ? "◕" : "○"}
          </span>
          {data.financialStatus === "achieved"
            ? "Financial target achieved"
            : data.financialStatus === "in_progress"
            ? "Financial target in progress"
            : "Financial target not yet achieved"}
        </div>
      )}
      {data.financialStatus === null && data.evidenceCount !== undefined && (
        <div className="mt-3 px-3 py-2 rounded-lg text-xs text-muted-foreground bg-muted/50">
          No financial target set for this role
        </div>
      )}
    </div>
  );
}

export default function Summary() {
  const [, navigate] = useLocation();
  const { sessionId, currentRoleId, targetRoleId } = useSessionStore();

  const { data: summary, isLoading } = useGetReadinessSummary(
    { sessionId, currentRoleId: currentRoleId ?? undefined, targetRoleId: targetRoleId ?? undefined },
    { query: { enabled: !!currentRoleId } }
  );

  const { data: evidence = [] } = useListEvidence(
    { sessionId, roleId: targetRoleId ?? undefined },
    { query: { enabled: !!targetRoleId } }
  );

  if (!currentRoleId) {
    return (
      <div className="flex items-center justify-center h-full p-12 text-center">
        <div>
          <p className="text-muted-foreground text-sm mb-3">You haven't selected a current role yet.</p>
          <button onClick={() => navigate("/setup")} className="text-primary text-sm font-medium hover:underline">Go to Setup</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Readiness Summary</h2>
        </div>
        <p className="text-muted-foreground text-sm">An overview of your promotion readiness across your current and target roles.</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="h-44 rounded-xl bg-muted animate-pulse" />
          <div className="h-44 rounded-xl bg-muted animate-pulse" />
        </div>
      ) : (
        <div className="space-y-4">
          {summary?.currentRole && (
            <RoleSummaryCard label="Current Role Self-Assessment" data={summary.currentRole} />
          )}
          {summary?.targetRole && (
            <RoleSummaryCard label="Target Role Readiness" data={summary.targetRole} />
          )}
          {!summary?.targetRole && targetRoleId && (
            <div className="bg-card border border-dashed border-border rounded-xl p-6 text-center">
              <p className="text-muted-foreground text-sm">No target role data yet. Go to Target Role to add evidence and ratings.</p>
            </div>
          )}
          {!targetRoleId && (
            <div className="bg-muted/50 border border-dashed border-border rounded-xl p-6 text-center">
              <p className="text-muted-foreground text-sm mb-2">You haven't selected a target role yet.</p>
              <button onClick={() => navigate("/target-role")} className="text-primary text-sm font-medium hover:underline">
                Choose your target role
              </button>
            </div>
          )}
        </div>
      )}

      {/* Recent evidence */}
      {evidence.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-foreground mb-3">Recent Evidence</h3>
          <div className="space-y-2">
            {evidence.slice(-5).reverse().map(ev => (
              <div key={ev.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-foreground">{ev.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{ev.description}</div>
                  </div>
                  <RatingBadge rating={ev.rating as Rating} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        <button
          onClick={() => navigate("/target-role")}
          className="flex items-center gap-2 px-4 py-2.5 bg-secondary text-secondary-foreground rounded-xl text-sm font-medium hover:opacity-80 transition-opacity"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Target Role
        </button>
      </div>
    </div>
  );
}
