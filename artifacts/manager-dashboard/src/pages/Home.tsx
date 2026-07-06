import { useState } from "react";
import { useLocation } from "wouter";
import { useManagerStore } from "@/hooks/useManagerStore";
import {
  useGetManagerDashboardStats,
  useGetManagerTeam,
  getGetManagerDashboardStatsQueryKey,
  getGetManagerTeamQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Users,
  ClipboardCheck,
  Clock,
  AlertCircle,
  LogOut,
  ChevronRight,
  CheckCircle2,
  UserCheck,
  Info,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
} from "lucide-react";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface MetricRowProps {
  label: string;
  value: number | undefined;
  icon: React.ElementType;
  iconColor: string;
  tooltip: string;
  first?: boolean;
}

function MetricRow({ label, value, icon: Icon, iconColor, tooltip, first }: MetricRowProps) {
  return (
    <div className={`flex items-center gap-2.5 ${first ? "pt-0" : "pt-2 border-t border-border/50"}`}>
      <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${iconColor}`} />
      <span className="text-2xl font-bold text-foreground tabular-nums leading-none">
        {value ?? "—"}
      </span>
      <span className="text-xs text-muted-foreground flex-1 leading-tight">{label}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="flex-shrink-0 text-muted-foreground/40 hover:text-muted-foreground transition-colors">
            <Info className="w-3 h-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-60 text-xs leading-relaxed">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

function PctBar({ pct, colorClass }: { pct: number | null | undefined; colorClass: string }) {
  if (pct == null) return <span className="text-sm text-muted-foreground">—</span>;
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full ${colorClass}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className="text-xs font-medium text-foreground tabular-nums w-8 text-right">
        {pct}%
      </span>
    </div>
  );
}

function FinancialBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-sm text-muted-foreground">—</span>;
  if (status === "achieved")
    return (
      <Badge className="bg-green-100 text-green-800 border-green-200 font-normal text-xs border gap-1">
        <TrendingUp className="w-3 h-3" /> Achieved
      </Badge>
    );
  if (status === "in_progress")
    return (
      <Badge className="bg-amber-100 text-amber-800 border-amber-200 font-normal text-xs border gap-1">
        <Minus className="w-3 h-3" /> In Progress
      </Badge>
    );
  return (
    <Badge className="bg-red-100 text-red-800 border-red-200 font-normal text-xs border gap-1">
      <TrendingDown className="w-3 h-3" /> Not Met
    </Badge>
  );
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
        <TooltipContent side="top" className="max-w-64 text-xs leading-relaxed">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

export default function Home() {
  const [, navigate] = useLocation();
  const { manager, clearManager } = useManagerStore();
  const [activeTab, setActiveTab] = useState("probation");

  if (!manager) {
    navigate("/");
    return null;
  }

  const { data: stats } = useGetManagerDashboardStats(
    { managerId: manager.id },
    {
      query: {
        queryKey: getGetManagerDashboardStatsQueryKey({ managerId: manager.id }),
        enabled: true,
      },
    }
  );

  const { data: team = [], isLoading } = useGetManagerTeam(
    { managerId: manager.id },
    {
      query: {
        queryKey: getGetManagerTeamQueryKey({ managerId: manager.id }),
        enabled: true,
      },
    }
  );

  const needingAttention = team.filter(
    (m) => m.probationStatus === "in_progress" && m.reviewCount === 0
  );
  const inProbation = team.filter((m) => m.probationStatus === "in_progress");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-sidebar text-sidebar-foreground px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase text-sidebar-primary mb-0.5">
              Highfield Professional Solutions
            </p>
            <h1 className="text-lg font-bold text-sidebar-foreground">Manager Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-sidebar-foreground/40">Signed in as</p>
              <p className="text-sm font-medium text-sidebar-foreground">{manager.name}</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-sidebar-primary/20 flex items-center justify-center">
              <span className="text-xs font-bold text-sidebar-primary">
                {getInitials(manager.name)}
              </span>
            </div>
            <button
              onClick={() => { clearManager(); navigate("/"); }}
              className="p-2 rounded-md hover:bg-white/10 transition-colors text-sidebar-foreground/60 hover:text-sidebar-foreground"
              title="Switch user"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-5 space-y-5">

        {/* Summary row — three grouped cards side by side on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.6fr_1.6fr] gap-3">

          {/* Team Summary */}
          <Card className="border-card-border shadow-sm">
            <CardContent className="p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Team Summary
              </p>
              <MetricRow
                first
                label="Total Team"
                value={stats?.totalTeam}
                icon={Users}
                iconColor="text-sidebar"
                tooltip="Total number of employees who report directly to you."
              />
            </CardContent>
          </Card>

          {/* Probation Summary */}
          <Card className="border-card-border shadow-sm">
            <CardContent className="p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Probation
              </p>
              <div className="space-y-2">
                <MetricRow
                  first
                  label="In Probation"
                  value={stats?.inProbation}
                  icon={Clock}
                  iconColor="text-primary"
                  tooltip="Number of team members currently in their probation period (status = In Progress)."
                />
                <MetricRow
                  label="Pending Reviews"
                  value={stats?.pendingReviews}
                  icon={ClipboardCheck}
                  iconColor="text-orange-500"
                  tooltip="People with a scheduled review date within the next 7 days where the review has not yet been published."
                />
                <MetricRow
                  label="Published Reviews"
                  value={stats?.publishedReviews}
                  icon={CheckCircle2}
                  iconColor="text-green-600"
                  tooltip="Individuals who have at least one published review where the review date has already passed."
                />
              </div>
            </CardContent>
          </Card>

          {/* Personal Development Summary */}
          <Card className="border-card-border shadow-sm">
            <CardContent className="p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Personal Development
              </p>
              <div className="space-y-2">
                <MetricRow
                  first
                  label="Active Plans"
                  value={stats?.activeDevelopmentPlans}
                  icon={TrendingUp}
                  iconColor="text-green-600"
                  tooltip="Team members who have selected their current role and scored competencies within the last 3 months."
                />
                <MetricRow
                  label="Passive Plans"
                  value={stats?.passiveDevelopmentPlans}
                  icon={Minus}
                  iconColor="text-amber-500"
                  tooltip="Team members who have scored competencies but have not updated their assessment in over 3 months."
                />
                <MetricRow
                  label="Missing Plan"
                  value={stats?.missingDevelopmentPlans}
                  icon={AlertCircle}
                  iconColor="text-red-500"
                  tooltip="Team members who have not yet selected their current role or scored any competencies in the career tracker."
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Navigation tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="probation">
              Probation
              {inProbation.length > 0 && (
                <span className="ml-1.5 text-xs bg-primary/15 text-primary font-semibold rounded-full px-1.5 py-0.5">
                  {inProbation.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="development">
              Personal Development
              <span className="ml-1.5 text-xs bg-muted text-muted-foreground font-semibold rounded-full px-1.5 py-0.5">
                {team.length}
              </span>
            </TabsTrigger>
          </TabsList>

          {/* Probation tab */}
          <TabsContent value="probation" className="mt-4 space-y-3">
            {/* Needs Attention alert */}
            {needingAttention.length > 0 && (
              <Card className="border-amber-200 bg-amber-50/50 shadow-sm">
                <div className="px-4 pt-3 pb-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-amber-800 mb-0.5">
                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-200 flex-shrink-0">
                      <AlertCircle className="w-3 h-3 text-amber-700" />
                    </div>
                    Action Needed — {needingAttention.length} review{needingAttention.length > 1 ? "s" : ""} overdue
                  </h3>
                  <p className="text-xs text-amber-700 ml-7">
                    {needingAttention.length === 1
                      ? "This team member is in probation but has no manager review recorded yet."
                      : "These team members are in probation but have no manager review recorded yet."}
                  </p>
                </div>
                <ul className="divide-y divide-amber-200">
                  {needingAttention.map((member) => (
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
                          {member.jobTitle && (
                            <p className="text-xs text-amber-700">{member.jobTitle}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-amber-700 bg-amber-200 px-2 py-0.5 rounded-full">
                            Review needed
                          </span>
                          <ChevronRight className="w-4 h-4 text-amber-500 group-hover:text-amber-700 transition-colors" />
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Probation member list */}
            {inProbation.length === 0 ? (
              <Card className="border-card-border shadow-sm">
                <div className="py-10 text-center">
                  <CheckCircle2 className="w-7 h-7 text-green-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground">No one on probation</p>
                  <p className="text-xs text-muted-foreground mt-0.5">All team members have completed probation.</p>
                </div>
              </Card>
            ) : (
              <Card className="border-card-border shadow-sm overflow-hidden">
                <ul className="divide-y divide-border">
                  {inProbation.map((member) => (
                    <li key={member.id}>
                      <button
                        onClick={() => navigate(`/employee/${member.id}/probation`)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left group"
                      >
                        <div className="flex-shrink-0 h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-semibold text-primary">{getInitials(member.name)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{member.name}</p>
                          {member.jobTitle && (
                            <p className="text-xs text-muted-foreground">{member.jobTitle}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {member.reviewCount > 0 ? (
                            <Badge className="bg-green-100 text-green-800 border-green-200 font-normal text-xs border">
                              <UserCheck className="w-3 h-3 mr-1" />
                              {member.reviewCount} review{member.reviewCount > 1 ? "s" : ""}
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-200 font-normal text-xs border">
                              No review yet
                            </Badge>
                          )}
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </TabsContent>

          {/* Personal Development tab */}
          <TabsContent value="development" className="mt-4">
            <Card className="border-card-border shadow-sm overflow-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : team.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-muted-foreground">No team members found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px]">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">
                          <ColHeader label="Name" tooltip="The team member's name." />
                        </th>
                        <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2.5">
                          <ColHeader
                            label="Current Role"
                            tooltip="The role the individual has selected as their current role in the career tracker."
                          />
                        </th>
                        <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2.5 w-32">
                          <ColHeader
                            label="Current %"
                            tooltip="Percentage of competencies the individual has rated (any rating) for their current role."
                          />
                        </th>
                        <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2.5">
                          <ColHeader
                            label="Target Role"
                            tooltip="The role the individual has selected as their promotion target."
                          />
                        </th>
                        <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2.5 w-32">
                          <ColHeader
                            label="Readiness %"
                            tooltip="Percentage of target role competencies where the individual has rated themselves green."
                          />
                        </th>
                        <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">
                          <ColHeader
                            label="Financial Target"
                            tooltip="Progress against financial target. Green = Achieved (≥100%), Amber = In Progress (≥75%), Red = Not Met."
                          />
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {team.map((member) => (
                        <tr key={member.id} className="hover:bg-muted/30 transition-colors group">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-[10px] font-semibold text-primary">{getInitials(member.name)}</span>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">{member.name}</p>
                                {member.department && (
                                  <p className="text-xs text-muted-foreground">{member.department}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            {member.currentRoleTitle ? (
                              <span className="text-sm text-foreground">{member.currentRoleTitle}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">Not selected</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <PctBar pct={member.currentRoleCompletionPct} colorClass="bg-primary" />
                          </td>
                          <td className="px-3 py-3">
                            {member.targetRoleTitle ? (
                              <span className="text-sm text-foreground">{member.targetRoleTitle}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">Not selected</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <PctBar
                              pct={member.targetRoleReadinessPct}
                              colorClass={
                                (member.targetRoleReadinessPct ?? 0) >= 100
                                  ? "bg-green-500"
                                  : (member.targetRoleReadinessPct ?? 0) >= 75
                                  ? "bg-amber-500"
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
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
