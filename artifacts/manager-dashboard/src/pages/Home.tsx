import { useLocation } from "wouter";
import { useManagerStore } from "@/hooks/useManagerStore";
import {
  useGetManagerDashboardStats,
  useGetManagerTeam,
  getGetManagerDashboardStatsQueryKey,
  getGetManagerTeamQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, ClipboardCheck, Clock, AlertCircle, LogOut, ChevronRight, CheckCircle2 } from "lucide-react";
import { useEffect } from "react";

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
    (m) => m.probationStatus === "in_probation" && m.reviewCount === 0
  );

  const statCards = [
    {
      label: "Total Team",
      value: stats?.totalTeam ?? "—",
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "In Probation",
      value: stats?.inProbation ?? "—",
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Pending Reviews",
      value: stats?.pendingReviews ?? "—",
      icon: ClipboardCheck,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      label: "Published Reviews",
      value: stats?.publishedReviews ?? "—",
      icon: CheckCircle2,
      color: "text-green-600",
      bg: "bg-green-50",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-sidebar text-sidebar-foreground px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Manager Dashboard</h1>
          <p className="text-xs text-sidebar-foreground/60">Highfield Professional Solutions</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-sidebar-foreground/80">{manager?.name}</span>
          <button
            onClick={() => { clearManager(); navigate("/"); }}
            className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
            title="Switch user"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <Card key={card.label} className="border-card-border">
              <CardContent className="p-4">
                <div className={`inline-flex p-2 rounded-lg ${card.bg} mb-3`}>
                  <card.icon className={`w-4 h-4 ${card.color}`} />
                </div>
                <div className="text-2xl font-bold text-foreground">{card.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{card.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Needing attention */}
        {needingAttention.length > 0 && (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-800">
                <AlertCircle className="w-4 h-4" />
                Needs Attention ({needingAttention.length})
              </CardTitle>
              <p className="text-xs text-amber-700">
                Team members in probation with no manager review yet
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-amber-200">
                {needingAttention.map((member) => (
                  <li key={member.id}>
                    <button
                      onClick={() => navigate(`/employee/${member.id}/probation`)}
                      className="w-full flex items-center justify-between px-5 py-3 hover:bg-amber-100/50 transition-colors text-left group"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">{member.name}</p>
                        {member.jobTitle && (
                          <p className="text-xs text-amber-700">{member.jobTitle}</p>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-amber-500 group-hover:text-amber-700 transition-colors" />
                    </button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Quick actions */}
        <div className="flex gap-3">
          <Button onClick={() => navigate("/team")} className="gap-2">
            <Users className="w-4 h-4" />
            View Full Team
          </Button>
        </div>
      </div>
    </div>
  );
}
