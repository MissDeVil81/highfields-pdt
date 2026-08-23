import {
  useGetRole,
  useListAssessments,
  useUpsertAssessment,
  useListEvidence,
  useDeleteEvidence,
  getListAssessmentsQueryKey,
  getListEvidenceQueryKey,
  getGetRoleQueryKey,
} from "@workspace/api-client-react";
import { useSessionStore } from "@/lib/session";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { RatingPicker, RatingBadge } from "@/components/RatingButton";
import { EvidenceForm } from "@/components/EvidenceForm";
import { JobSpecText } from "@/components/JobSpecText";
import { ArrowRight, Plus, Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react";

type Rating = "red" | "amber" | "green";

function ReadinessBar({ assessments, total }: { assessments: Array<{ rating: string }>; total: number }) {
  const green = assessments.filter(a => a.rating === "green").length;
  const amber = assessments.filter(a => a.rating === "amber").length;
  const red = assessments.filter(a => a.rating === "red").length;
  const unrated = total - green - amber - red;
  const pct = total > 0 ? Math.round((green / total) * 100) : 0;

  return (
    <div className="bg-card border border-border rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Current Role Readiness</h3>
        <span className="text-2xl font-bold text-foreground">{pct}%</span>
      </div>
      <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5 mb-3">
        {green > 0 && <div className="bg-green-500 rounded-full transition-all" style={{ flex: green }} />}
        {amber > 0 && <div className="bg-amber-500 rounded-full transition-all" style={{ flex: amber }} />}
        {red > 0 && <div className="bg-red-500 rounded-full transition-all" style={{ flex: red }} />}
        {unrated > 0 && <div className="bg-muted rounded-full transition-all" style={{ flex: unrated }} />}
      </div>
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500 inline-block" />{green} Consistent</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />{amber} Progressing</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500 inline-block" />{red} Developing</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-muted-foreground/40 inline-block" />{unrated} unrated</span>
      </div>
    </div>
  );
}

export default function CurrentRole() {
  const [, navigate] = useLocation();
  const { userId, currentRoleId } = useSessionStore();
  const queryClient = useQueryClient();
  const [jobSpecOpen, setJobSpecOpen] = useState(false);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const [addingEvidence, setAddingEvidence] = useState<number | null>(null);
  const [editingEvidence, setEditingEvidence] = useState<number | null>(null);

  const { data: role, isLoading: roleLoading } = useGetRole(currentRoleId!, {
    query: { queryKey: getGetRoleQueryKey(currentRoleId!), enabled: !!currentRoleId },
  });

  const assessmentsParams = { userId: userId ?? 0, roleId: currentRoleId ?? undefined };
  const { data: assessments = [] } = useListAssessments(
    assessmentsParams,
    { query: { queryKey: getListAssessmentsQueryKey(assessmentsParams), enabled: !!currentRoleId && !!userId } }
  );

  const evidenceParams = { userId: userId ?? 0, roleId: currentRoleId ?? undefined };
  const { data: evidence = [] } = useListEvidence(
    evidenceParams,
    { query: { queryKey: getListEvidenceQueryKey(evidenceParams), enabled: !!currentRoleId && !!userId } }
  );

  const upsert = useUpsertAssessment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAssessmentsQueryKey() });
      },
    },
  });

  const deleteEvidence = useDeleteEvidence({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListEvidenceQueryKey() });
      },
    },
  });

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

  if (roleLoading) {
    return (
      <div className="max-w-3xl mx-auto px-8 py-10 space-y-4">
        <div className="h-8 w-48 rounded-lg bg-muted animate-pulse" />
        <div className="h-32 rounded-xl bg-muted animate-pulse" />
        <div className="h-64 rounded-xl bg-muted animate-pulse" />
      </div>
    );
  }

  if (!role) return null;

  const assessmentMap = new Map(assessments.map(a => [a.competencyId, a]));
  const evidenceByComp = new Map<number, typeof evidence>();
  for (const e of evidence) {
    if (!evidenceByComp.has(e.competencyId)) evidenceByComp.set(e.competencyId, []);
    evidenceByComp.get(e.competencyId)!.push(e);
  }
  const categories = Array.from(new Set((role.competencies ?? []).map(c => c.category)))
    .sort((a, b) => {
      if (a === "Financials") return -1;
      if (b === "Financials") return 1;
      return a.localeCompare(b);
    });

  function handleRate(competencyId: number, rating: Rating) {
    upsert.mutate({ data: { userId: userId!, competencyId, roleId: currentRoleId!, rating } });
  }

  function toggleCategory(key: string) {
    setOpenCategories(prev => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      <div className="mb-10">
        <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Current Role</div>
        <h2 className="font-script text-4xl text-foreground">{role.title}</h2>
      </div>

      {/* Job Spec collapsible */}
      {role.jobSpec && (
        <div className="border border-border rounded-xl overflow-hidden mb-6">
          <button
            onClick={() => setJobSpecOpen(o => !o)}
            className="w-full flex items-center justify-between px-5 py-3.5 bg-muted/50 hover:bg-muted transition-colors"
          >
            <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Job Specification</span>
            {jobSpecOpen
              ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
          </button>
          {jobSpecOpen && (
            <div className="px-5 py-4 border-t border-border bg-white">
              <JobSpecText text={role.jobSpec} />
            </div>
          )}
        </div>
      )}

      {/* Readiness bar */}
      <ReadinessBar assessments={assessments} total={(role.competencies ?? []).length} />

      {/* Competencies */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground mb-1">Self-Assessment</h3>
        <p className="text-xs text-muted-foreground">Assess each competency based on how consistently and effectively you demonstrate it. Be honest with yourself. Think about your typical performance, not your best day.</p>
      </div>

      <div className="space-y-2">
        {categories.map(category => {
          const comps = (role.competencies ?? []).filter(c => c.category === category);
          const catKey = `cat-${category}`;
          const isCatOpen = !!openCategories[catKey];
          const rated = comps.filter(c => assessmentMap.has(c.id)).length;

          return (
            <div key={category} className="border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => toggleCategory(catKey)}
                className="w-full flex items-center justify-between px-5 py-3.5 bg-muted/50 hover:bg-muted transition-colors"
              >
                <span className="text-xs font-semibold text-foreground uppercase tracking-wider">{category}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {rated}/{comps.length} rated
                    {(() => {
                      const categoryEvidence = comps.reduce(
                        (total, comp) => total + (evidenceByComp.get(comp.id)?.length ?? 0),
                        0,
                      );
                      return categoryEvidence > 0 ? ` · ${categoryEvidence} evidence` : "";
                    })()}
                  </span>
                  {isCatOpen
                    ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </button>

              {isCatOpen && (
                <div className="divide-y divide-border">
                  {comps.map(comp => {
                    const assessment = assessmentMap.get(comp.id);
                    const rating = assessment?.rating as Rating | undefined;
                    const compEvidence = [...(evidenceByComp.get(comp.id) ?? [])].reverse();
                    const isAdding = addingEvidence === comp.id;
                    return (
                      <div key={comp.id} className="px-5 py-4 bg-card">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-foreground">{comp.name}</div>
                            <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{comp.description}</div>
                          </div>
                          <div className="flex-shrink-0">
                            <RatingBadge rating={rating ?? null} />
                          </div>
                        </div>
                        <div className="mt-3">
                          <RatingPicker value={rating ?? null} onChange={(r) => handleRate(comp.id, r)} />
                        </div>

                        {/* Evidence entries */}
                        {compEvidence.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {compEvidence.map(ev => (
                              <div key={ev.id}>
                                {editingEvidence === ev.id ? (
                                  <EvidenceForm
                                    userId={userId ?? 0}
                                    competencyId={comp.id}
                                    roleId={currentRoleId}
                                    onClose={() => setEditingEvidence(null)}
                                    existing={{ id: ev.id, title: ev.title, description: ev.description, rating: ev.rating }}
                                  />
                                ) : (
                                  <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1 min-w-0">
                                        <div className="text-xs font-semibold text-foreground">{ev.title}</div>
                                        <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{ev.description}</div>
                                      </div>
                                      <div className="flex items-center gap-1 flex-shrink-0">
                                        <RatingBadge rating={ev.rating as Rating} />
                                        <button
                                          onClick={() => setEditingEvidence(ev.id)}
                                          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                                          aria-label={`Edit evidence: ${ev.title}`}
                                        >
                                          <Pencil className="h-3 w-3" />
                                        </button>
                                        <button
                                          onClick={() => deleteEvidence.mutate({ id: ev.id })}
                                          className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                                          aria-label={`Delete evidence: ${ev.title}`}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Add evidence */}
                        {isAdding ? (
                          <EvidenceForm
                            userId={userId ?? 0}
                            competencyId={comp.id}
                            roleId={currentRoleId}
                            onClose={() => setAddingEvidence(null)}
                          />
                        ) : (
                          <button
                            onClick={() => setAddingEvidence(comp.id)}
                            className="mt-3 flex items-center gap-1.5 text-xs text-primary font-medium hover:opacity-80 transition-opacity"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add evidence
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Your ratings are saved automatically.</p>
        <button
          onClick={() => navigate("/target-role")}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          Choose Target Role
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
