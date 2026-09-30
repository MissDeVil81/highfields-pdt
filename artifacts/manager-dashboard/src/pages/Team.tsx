import { useLocation } from "wouter";
import { useManagerStore } from "@/hooks/useManagerStore";
import { useGetManagerTeam, getGetManagerTeamQueryKey } from "@workspace/api-client-react";
import { ArrowLeft, ChevronRight, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { isOnProbation } from "@workspace/probation-status";

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function ProbationStatusPill({ status }: { status: string | null | undefined }) {
  if (isOnProbation(status))
    return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-100 text-amber-700">In Probation</span>;
  if (status === "passed")
    return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-green-100 text-green-700">Passed</span>;
  if (status === "extended")
    return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-orange-100 text-orange-700">Extended</span>;
  if (status === "failed")
    return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-red-100 text-red-600">Failed</span>;
  return <span className="text-sm text-muted-foreground">—</span>;
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
      <header className="bg-sidebar text-sidebar-foreground px-6 py-4 border-b border-sidebar-border flex items-center gap-4">
        <button
          onClick={() => navigate("/home")}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-sidebar-primary">Your Team</p>
          <h1 className="font-script text-2xl text-sidebar-primary leading-tight">{manager?.name}</h1>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">
              Team Members
              {team.length > 0 && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">({team.length})</span>
              )}
            </h2>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : team.length === 0 ? (
            <div className="border border-dashed border-border rounded-xl m-4 p-8 text-center">
              <p className="text-sm text-muted-foreground">No team members found.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Link employees to you by setting their managerId.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
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
                      className="hover:bg-muted/50 transition-colors cursor-pointer group"
                      onClick={() => navigate(`/employee/${member.id}/probation`)}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex-shrink-0 h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-semibold text-primary">{getInitials(member.name)}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{member.name}</p>
                            {member.department && (
                              <p className="text-xs text-muted-foreground mt-0.5">{member.department}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 hidden md:table-cell">
                        <p className="text-sm text-foreground">{member.jobTitle ?? "—"}</p>
                      </td>
                      <td className="px-3 py-3.5">
                        <ProbationStatusPill status={member.probationStatus} />
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
