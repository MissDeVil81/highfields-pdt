import { useState } from "react";
import { useLocation } from "wouter";
import { useManagerStore } from "@/hooks/useManagerStore";
import {
  useGetManagerDashboardStats,
  useGetManagerTeam,
  getGetManagerDashboardStatsQueryKey,
  getGetManagerTeamQueryKey,
} from "@workspace/api-client-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Clock,
  AlertCircle,
  ChevronRight,
  CheckCircle2,
  UserCheck,
  Info,
  Loader2,
} from "lucide-react";
import { Layout } from "@/components/Layout";
import { TeamFilter } from "@/components/TeamFilter";
import { useWhatsNewCount } from "@/hooks/useWhatsNewCount";

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function MetricCard({ label, value, icon: Icon, iconColor, tooltip }: {
  label: string; value: number | undefined; icon: React.ElementType;
  iconColor: string; tooltip: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
      <div className={`mt-0.5 flex-shrink-0 ${iconColor}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-bold tabular-nums">{value ?? "—"}</p>
        <p className="text-xs text-muted-foreground leading-tight mt-0.5">{label}</p>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="text-muted-foreground/40 hover:text-muted-foreground transition-colors mt-0.5">
            <Info className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-60 text-xs leading-relaxed">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

export default function Home() {
  const [, navigate] = useLocation();
  const { manager } = useManagerStore();
  const whatsNewCount = useWhatsNewCount();
  const [filteredId, setFilteredId] = useState<number | null>(null);

  if (!manager) {
    navigate("/");
    return null;
  }

  const { data: stats } = useGetManagerDashboardStats(
    { managerId: manager.id },
    { query: { queryKey: getGetManagerDashboardStatsQueryKey({ managerId: manager.id }) } }
  );

  const { data: team = [], isLoading } = useGetManagerTeam(
    { managerId: manager.id },
    { query: { queryKey: getGetManagerTeamQueryKey({ managerId: manager.id }) } }
  );

  const inProbation = team.filter((m) => m.probationStatus === "in_progress");
  const needingAttention = inProbation.filter((m) => m.reviewCount === 0);

  const visibleProbation = filteredId
    ? inProbation.filter(m => m.id === filteredId)
    : inProbation;

  const visibleAttention = filteredId
    ? needingAttention.filter(m => m.id === filteredId)
    : needingAttention;

  const filteredNotInProbation = filteredId && inProbation.every(m => m.id !== filteredId)
    ? team.find(m => m.id === filteredId)
    : null;

  return (
    <Layout whatsNewCount={whatsNewCount}>
      <div className="max-w-4xl mx-auto px-8 py-10">

        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h2 className="font-script text-4xl text-foreground">In Probation</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Track probation progress for your team.
            </p>
          </div>
          <div className="mt-2 shrink-0">
            <TeamFilter selectedId={filteredId} onSelect={setFilteredId} />
          </div>
        </div>

        {/* Metric cards — always show full team totals */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <MetricCard
            label="In Probation"
            value={stats?.inProbation}
            icon={Clock}
            iconColor="text-primary"
            tooltip="Number of team members currently in their probation period."
          />
          <MetricCard
            label="Pending Reviews"
            value={stats?.pendingReviews}
            icon={AlertCircle}
            iconColor="text-amber-500"
            tooltip="People with a review due in the next 7 days not yet published."
          />
          <MetricCard
            label="Published Reviews"
            value={stats?.publishedReviews}
            icon={CheckCircle2}
            iconColor="text-green-600"
            tooltip="Individuals with at least one published review."
          />
        </div>

        {/* Person not in probation message */}
        {filteredNotInProbation && (
          <div className="bg-card border border-border rounded-xl p-6 text-center mb-4">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <span className="text-sm font-bold text-muted-foreground">{getInitials(filteredNotInProbation.name)}</span>
            </div>
            <p className="text-sm font-medium text-foreground">{filteredNotInProbation.name} is not currently on probation</p>
            <p className="text-xs text-muted-foreground mt-1">Their probation period has been completed or hasn't started.</p>
          </div>
        )}

        {/* Needs Attention */}
        {!filteredNotInProbation && visibleAttention.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden mb-4">
            <div className="px-4 pt-3.5 pb-2.5">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-amber-800 mb-0.5">
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-200 flex-shrink-0">
                  <AlertCircle className="w-3 h-3 text-amber-700" />
                </div>
                Action Needed — {visibleAttention.length} review{visibleAttention.length > 1 ? "s" : ""} overdue
              </h3>
              <p className="text-xs text-amber-700 ml-7">
                {visibleAttention.length === 1
                  ? "This team member is in probation but has no manager review recorded yet."
                  : "These team members are in probation but have no manager review recorded yet."}
              </p>
            </div>
            <ul className="divide-y divide-amber-200">
              {visibleAttention.map((member) => (
                <li key={member.id}>
                  <button
                    onClick={() => navigate(`/employee/${member.id}/probation`)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-amber-100/60 transition-colors text-left group"
                  >
                    <div className="flex-shrink-0 h-7 w-7 rounded-full bg-amber-200 flex items-center justify-center">
                      <span className="text-xs font-bold text-amber-800">{getInitials(member.name)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-amber-900">{member.name}</p>
                      {member.jobTitle && <p className="text-xs text-amber-700">{member.jobTitle}</p>}
                    </div>
                    <span className="text-xs font-medium text-amber-700 bg-amber-200 px-2 py-0.5 rounded-full">
                      Review needed
                    </span>
                    <ChevronRight className="w-4 h-4 text-amber-500 group-hover:text-amber-700 transition-colors" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Full probation list */}
        {!filteredNotInProbation && (
          isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : visibleProbation.length === 0 ? (
            <div className="bg-card border border-dashed border-border rounded-xl p-10 text-center">
              <CheckCircle2 className="w-7 h-7 text-green-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">No one on probation</p>
              <p className="text-xs text-muted-foreground mt-0.5">All team members have completed probation.</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <ul className="divide-y divide-border">
                {visibleProbation.map((member) => (
                  <li key={member.id}>
                    <button
                      onClick={() => navigate(`/employee/${member.id}/probation`)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 transition-colors text-left group"
                    >
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-semibold text-primary">{getInitials(member.name)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{member.name}</p>
                        {member.jobTitle && <p className="text-xs text-muted-foreground">{member.jobTitle}</p>}
                      </div>
                      {member.reviewCount > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg bg-green-100 text-green-700">
                          <UserCheck className="w-3 h-3" />
                          {member.reviewCount} review{member.reviewCount > 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-amber-100 text-amber-700">
                          No review yet
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )
        )}
      </div>
    </Layout>
  );
}
