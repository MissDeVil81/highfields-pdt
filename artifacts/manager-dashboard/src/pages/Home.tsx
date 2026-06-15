import { useLocation } from "wouter";
import { useManagerStore } from "@/hooks/useManagerStore";
import {
  useGetManagerDashboardStats,
  useGetManagerTeam,
  getGetManagerDashboardStatsQueryKey,
  getGetManagerTeamQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users, ClipboardCheck, Clock, AlertCircle, LogOut,
  ChevronRight, CheckCircle2, ArrowRight, UserCheck,
} from "lucide-react";
import { useEffect } from "react";

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function Home() {
  const [, navigate] = useLocation();
  const { manager, clearManager } = useManagerStore();

  useEffect(() => {
    if (!manager) navigate("/");
  }, [manager]);

  const { data: stats } = useGetManagerDashboardStats(
    { managerId: manager?.id ?? 0 },
    { query: { queryKey: getGetManagerDashboardStatsQueryKey({ managerId: manager?.id ?? 0 }), enabled: !!manager } }
  );
  const { data: team = [] } = useGetManagerTeam(
    { managerId: manager?.id ?? 0 },
    { query: { queryKey: getGetManagerTeamQueryKey({ managerId: manager?.id ?? 0 }), enabled: !!manager } }
  );

  const needingAttention = team.filter(
    (m) => m.probationStatus === "in_progress" && m.reviewCount === 0
  );

  const inProbation = team.filter((m) => m.probationStatus === "in_progress");

  const statCards = [
    {
      label: "Total Team",
      value: stats?.totalTeam ?? "—",
      icon: Users,
      iconBg: "bg-sidebar/8",
      iconColor: "text-sidebar",
      valueBg: "",
    },
    {
      label: "In Probation",
      value: stats?.inProbation ?? "—",
      icon: Clock,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      valueBg: "",
    },
    {
      label: "Pending Reviews",
      value: stats?.pendingReviews ?? "—",
      icon: ClipboardCheck,
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
      valueBg: "",
    },
    {
      label: "Published Reviews",
      value: stats?.publishedReviews ?? "—",
      icon: CheckCircle2,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      valueBg: "",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-sidebar text-sidebar-foreground px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase text-sidebar-primary mb-1">
              Highfield Professional Solutions
            </p>
            <h1 className="text-xl font-bold text-sidebar-foreground">Manager Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-sidebar-foreground/40">Signed in as</p>
              <p className="text-sm font-medium text-sidebar-foreground">{manager?.name}</p>
            </div>
            <div className="h-9 w-9 rounded-full bg-sidebar-primary/20 flex items-center justify-center">
              <span className="text-xs font-bold text-sidebar-primary">
                {manager?.name ? getInitials(manager.name) : "—"}
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

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <Card key={card.label} className="border-card-border shadow-sm">
              <CardContent className="p-5">
                <div className={`inline-flex p-2.5 rounded-xl ${card.iconBg} mb-3`}>
                  <card.icon className={`w-4 h-4 ${card.iconColor}`} />
                </div>
                <div className="text-3xl font-bold text-foreground tracking-tight">{card.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5 font-medium">{card.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Needs Attention alert */}
        {needingAttention.length > 0 && (
          <Card className="border-amber-200 bg-amber-50/50 shadow-sm">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-800">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-200">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                </div>
                Action Needed — {needingAttention.length} review{needingAttention.length > 1 ? "s" : ""} overdue
              </CardTitle>
              <p className="text-xs text-amber-700 ml-8">
                {needingAttention.length === 1
                  ? "This team member is in probation but has no manager review recorded yet."
                  : "These team members are in probation but have no manager review recorded yet."}
              </p>
            </CardHeader>
            <CardContent className="p-0 pb-1">
              <ul className="divide-y divide-amber-200">
                {needingAttention.map((member) => (
                  <li key={member.id}>
                    <button
                      onClick={() => navigate(`/employee/${member.id}/probation`)}
                      className="w-full flex items-center gap-3.5 px-5 py-3.5 hover:bg-amber-100/60 transition-colors text-left group"
                    >
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-amber-200 flex items-center justify-center">
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
            </CardContent>
          </Card>
        )}

        {/* Probation team */}
        {inProbation.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground">On Probation</h2>
              <button
                onClick={() => navigate("/team")}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                View all team <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <Card className="border-card-border shadow-sm overflow-hidden">
              <ul className="divide-y divide-border">
                {inProbation.map((member) => (
                  <li key={member.id}>
                    <button
                      onClick={() => navigate(`/employee/${member.id}/probation`)}
                      className="w-full flex items-center gap-3.5 px-5 py-3.5 hover:bg-muted/40 transition-colors text-left group"
                    >
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
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
          </div>
        )}

        {/* Full team link */}
        <button
          onClick={() => navigate("/team")}
          className="w-full flex items-center justify-between px-5 py-4 rounded-xl border border-border bg-card hover:bg-muted/40 transition-colors group shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
              <Users className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-foreground">View Full Team</p>
              <p className="text-xs text-muted-foreground">{stats?.totalTeam ?? "—"} team members</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        </button>
      </div>
    </div>
  );
}
