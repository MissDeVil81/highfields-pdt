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
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  Info,
  Loader2,
} from "lucide-react";
import { Layout } from "@/components/Layout";
import { TeamFilter } from "@/components/TeamFilter";
import { useWhatsNewCount } from "@/hooks/useWhatsNewCount";

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function PctBar({ pct, colorClass }: { pct: number | null | undefined; colorClass: string }) {
  if (pct == null) return <span className="text-sm text-muted-foreground">—</span>;
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${colorClass}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="text-xs font-medium text-foreground tabular-nums w-8 text-right">{pct}%</span>
    </div>
  );
}

function FinancialBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-sm text-muted-foreground">—</span>;
  if (status === "achieved")
    return <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-green-100 text-green-700"><TrendingUp className="w-3 h-3" /> Achieved</div>;
  if (status === "in_progress")
    return <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-100 text-amber-700"><Minus className="w-3 h-3" /> In Progress</div>;
  return <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-red-100 text-red-600"><TrendingDown className="w-3 h-3" /> Not Met</div>;
}

function ColHeader({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <div className="flex items-center gap-1">
      <span>{label}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
            <Info className="w-3 h-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-64 text-xs leading-relaxed">{tooltip}</TooltipContent>
      </Tooltip>
    </div>
  );
}

type DevelopmentCategory = "active" | "passive" | "missing";

function MetricCard({ label, value, icon: Icon, iconColor, tooltip, active = false, onClick }: {
  label: string; value: number | undefined; icon: React.ElementType;
  iconColor: string; tooltip: string; active?: boolean; onClick?: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={active}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick?.();
        }
      }}
      className={`bg-card border rounded-xl p-4 flex items-start gap-3 text-left transition-colors ${
        onClick ? "cursor-pointer hover:border-primary/50 hover:bg-muted/30" : ""
      } ${active ? "border-primary ring-1 ring-primary/20" : "border-border"}`}
    >
      <div className={`mt-0.5 flex-shrink-0 ${iconColor}`}><Icon className="h-4 w-4" /></div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-bold tabular-nums">{value ?? "—"}</p>
        <p className="text-xs text-muted-foreground leading-tight mt-0.5">{label}</p>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={(event) => event.stopPropagation()}
            className="text-muted-foreground/40 hover:text-muted-foreground transition-colors mt-0.5"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-60 text-xs leading-relaxed">{tooltip}</TooltipContent>
      </Tooltip>
    </div>
  );
}

export default function Development() {
  const [, navigate] = useLocation();
  const { manager } = useManagerStore();
  const whatsNewCount = useWhatsNewCount();
  const [filteredId, setFilteredId] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<DevelopmentCategory>("active");

  if (!manager) { navigate("/"); return null; }

  const { data: stats } = useGetManagerDashboardStats(
    { managerId: manager.id },
    { query: { queryKey: getGetManagerDashboardStatsQueryKey({ managerId: manager.id }) } }
  );

  const { data: team = [], isLoading } = useGetManagerTeam(
    { managerId: manager.id },
    { query: { queryKey: getGetManagerTeamQueryKey({ managerId: manager.id }) } }
  );

  const categoryMembers = activeCategory === "active"
    ? team.filter((member) => member.isActiveDevelopmentPlan)
    : activeCategory === "passive"
      ? team.filter((member) => member.isPassiveDevelopmentPlan)
      : team.filter((member) => member.isMissingDevelopmentPlan);
  const visibleTeam = filteredId !== null
    ? categoryMembers.filter((member) => member.id === filteredId)
    : categoryMembers;
  const categoryLabel = activeCategory === "active"
    ? "Active Plans"
    : activeCategory === "passive"
      ? "Passive Plans"
      : "Missing Plan";

  return (
    <Layout whatsNewCount={whatsNewCount}>
      <div className="max-w-5xl mx-auto px-8 py-10">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h2 className="font-script text-4xl text-foreground">Personal Development</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Monitor your team's career progression and financial targets.
            </p>
          </div>
          <div className="mt-2 shrink-0">
            <TeamFilter selectedId={filteredId} onSelect={setFilteredId} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-8">
          <MetricCard
            label="Active Plans"
            value={stats?.activeDevelopmentPlans}
            icon={TrendingUp}
            iconColor="text-green-600"
            tooltip="Team members who have scored competencies within the last 3 months."
            active={activeCategory === "active"}
            onClick={() => {
              setActiveCategory("active");
              setFilteredId(null);
            }}
          />
          <MetricCard
            label="Passive Plans"
            value={stats?.passiveDevelopmentPlans}
            icon={Minus}
            iconColor="text-amber-500"
            tooltip="Team members who have not updated their assessment in over 3 months."
            active={activeCategory === "passive"}
            onClick={() => {
              setActiveCategory("passive");
              setFilteredId(null);
            }}
          />
          <MetricCard
            label="Missing Plan"
            value={stats?.missingDevelopmentPlans}
            icon={AlertCircle}
            iconColor="text-red-500"
            tooltip="Team members who have not yet selected their current role or scored any competencies."
            active={activeCategory === "missing"}
            onClick={() => {
              setActiveCategory("missing");
              setFilteredId(null);
            }}
          />
        </div>

        {/* Development table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : visibleTeam.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-muted-foreground">
                {filteredId
                  ? "This team member is not in the selected category."
                  : `No team members currently have ${categoryLabel.toLowerCase()}.`}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">
                      <ColHeader label="Name" tooltip="The team member's name." />
                    </th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2.5">
                      <ColHeader label="Current Role" tooltip="The role the individual has selected as their current role in the career tracker." />
                    </th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2.5 w-32">
                      <ColHeader label="Current %" tooltip="Percentage of competencies the individual has rated for their current role." />
                    </th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2.5">
                      <ColHeader label="Target Role" tooltip="The role the individual has selected as their promotion target." />
                    </th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2.5 w-32">
                      <ColHeader label="Readiness %" tooltip="Percentage of target role competencies where the individual has rated themselves green." />
                    </th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">
                      <ColHeader label="Financial Target" tooltip="Progress against financial target." />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visibleTeam.map((member) => (
                    <tr key={member.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-[10px] font-semibold text-primary">{getInitials(member.name)}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{member.name}</p>
                            {member.department && <p className="text-xs text-muted-foreground">{member.department}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        {member.currentRoleTitle
                          ? <span className="text-sm text-foreground">{member.currentRoleTitle}</span>
                          : <span className="text-xs text-muted-foreground italic">Not selected</span>}
                      </td>
                      <td className="px-3 py-3">
                        <PctBar pct={member.currentRoleCompletionPct} colorClass="bg-primary" />
                      </td>
                      <td className="px-3 py-3">
                        {member.targetRoleTitle
                          ? <span className="text-sm text-foreground">{member.targetRoleTitle}</span>
                          : <span className="text-xs text-muted-foreground italic">Not selected</span>}
                      </td>
                      <td className="px-3 py-3">
                        <PctBar
                          pct={member.targetRoleReadinessPct}
                          colorClass={
                            (member.targetRoleReadinessPct ?? 0) >= 100 ? "bg-green-500"
                            : (member.targetRoleReadinessPct ?? 0) >= 75 ? "bg-amber-500"
                            : "bg-red-400"
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        <FinancialBadge status={member.financialTargetStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
