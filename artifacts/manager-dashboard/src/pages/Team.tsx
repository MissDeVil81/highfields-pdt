import { useLocation } from "wouter";
import { useManagerStore } from "@/hooks/useManagerStore";
import { useGetManagerTeam, getGetManagerTeamQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ChevronRight, CheckCircle2, Clock, FileEdit, Loader2 } from "lucide-react";
import { useEffect } from "react";

function probationStatusBadge(status: string | null | undefined) {
  if (status === "in_probation")
    return <Badge className="bg-amber-100 text-amber-800 border-amber-200 font-normal">In Probation</Badge>;
  if (status === "passed")
    return <Badge className="bg-green-100 text-green-800 border-green-200 font-normal">Passed</Badge>;
  if (status === "extended")
    return <Badge className="bg-orange-100 text-orange-800 border-orange-200 font-normal">Extended</Badge>;
  if (status === "failed")
    return <Badge className="bg-red-100 text-red-800 border-red-200 font-normal">Failed</Badge>;
  return <Badge variant="secondary" className="font-normal">—</Badge>;
}

export default function Team() {
  const [, navigate] = useLocation();
  const { manager } = useManagerStore();

  useEffect(() => {
    if (!manager) navigate("/");
  }, [manager]);

  const { data: team = [], isLoading } = useGetManagerTeam(
    { managerId: manager?.id ?? 0 },
    { query: { queryKey: getGetManagerTeamQueryKey({ managerId: manager?.id ?? 0 }), enabled: !!manager } }
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-sidebar text-sidebar-foreground px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate("/home")}
          className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-lg font-semibold">Your Team</h1>
          <p className="text-xs text-sidebar-foreground/60">{manager?.name}</p>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Team Members {team.length > 0 && <span className="text-muted-foreground font-normal">({team.length})</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : team.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-muted-foreground">No team members found.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Link employees to you by setting their managerId.
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left text-xs font-medium text-muted-foreground px-5 py-2.5">Name</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2.5 hidden md:table-cell">Role</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2.5">Probation</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2.5 hidden sm:table-cell">Reviews</th>
                    <th className="text-right text-xs font-medium text-muted-foreground px-5 py-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {team.map((member) => (
                    <tr
                      key={member.id}
                      className="hover:bg-muted/30 transition-colors cursor-pointer group"
                      onClick={() => navigate(`/employee/${member.id}/probation`)}
                    >
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-medium text-foreground">{member.name}</p>
                        {member.department && (
                          <p className="text-xs text-muted-foreground mt-0.5">{member.department}</p>
                        )}
                      </td>
                      <td className="px-3 py-3.5 hidden md:table-cell">
                        <p className="text-sm text-foreground">{member.jobTitle ?? "—"}</p>
                      </td>
                      <td className="px-3 py-3.5">
                        {probationStatusBadge(member.probationStatus)}
                      </td>
                      <td className="px-3 py-3.5 hidden sm:table-cell">
                        <div className="flex items-center gap-1.5">
                          {member.reviewCount > 0 ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                              <span className="text-sm text-foreground">{member.reviewCount}</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">None</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground inline-block transition-colors" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
