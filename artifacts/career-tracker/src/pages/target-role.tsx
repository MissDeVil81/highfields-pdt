import {
  useGetRole,
  useListRoles,
  useListCareerPaths,
  useListAssessments,
  useUpsertAssessment,
  useListEvidence,
  useCreateEvidence,
  useUpdateEvidence,
  useDeleteEvidence,
  getListAssessmentsQueryKey,
  getListEvidenceQueryKey,
} from "@workspace/api-client-react";
import { useSessionStore } from "@/lib/session";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { RatingPicker, RatingBadge } from "@/components/RatingButton";
import { JobSpecText } from "@/components/JobSpecText";
import { ArrowRight, Plus, Pencil, Trash2, ChevronDown, ChevronUp, X, Check, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

type Rating = "red" | "amber" | "green";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const CAREER_PATH_PDFS: Record<number, string> = {
  1: `${basePath}/pdfs/360-career-path.pdf`,
  2: `${basePath}/pdfs/180-delivery-career-path.pdf`,
  3: `${basePath}/pdfs/account-management-career-path.pdf`,
};

interface EvidenceFormProps {
  sessionId: string;
  competencyId: number;
  roleId: number;
  onClose: () => void;
  existing?: { id: number; title: string; description: string; rating: string };
}

function EvidenceForm({ sessionId, competencyId, roleId, onClose, existing }: EvidenceFormProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [rating, setRating] = useState<Rating | null>((existing?.rating as Rating) ?? null);

  const create = useCreateEvidence({
    mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListEvidenceQueryKey() }); onClose(); } },
  });
  const update = useUpdateEvidence({
    mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListEvidenceQueryKey() }); onClose(); } },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !description || !rating) return;
    if (existing) {
      update.mutate({ id: existing.id, data: { title, description, rating } });
    } else {
      create.mutate({ data: { sessionId, competencyId, roleId, title, description, rating } });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 p-4 bg-muted/50 rounded-lg border border-border space-y-3">
      <div>
        <label className="text-xs font-medium text-foreground block mb-1">Evidence Title</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="What did you do?"
          required
          className="w-full text-sm px-3 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-foreground block mb-1">Description</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Describe the situation, your actions and the outcome..."
          required
          rows={3}
          className="w-full text-sm px-3 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-foreground block mb-1">How well does this evidence demonstrate readiness?</label>
        <RatingPicker value={rating} onChange={setRating} />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!title || !description || !rating}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          <Check className="h-3.5 w-3.5" />
          {existing ? "Save Changes" : "Add Evidence"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-secondary text-secondary-foreground rounded-lg hover:opacity-80 transition-opacity"
        >
          <X className="h-3.5 w-3.5" />
          Cancel
        </button>
      </div>
    </form>
  );
}

function ReadinessBar({ assessments, total, evidenceCount }: { assessments: Array<{ rating: string }>; total: number; evidenceCount: number }) {
  const green = assessments.filter(a => a.rating === "green").length;
  const amber = assessments.filter(a => a.rating === "amber").length;
  const red = assessments.filter(a => a.rating === "red").length;
  const unrated = total - green - amber - red;
  const pct = total > 0 ? Math.round((green / total) * 100) : 0;

  return (
    <div className="bg-card border border-border rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Target Role Readiness</h3>
        <div className="text-right">
          <span className="text-2xl font-bold text-foreground">{pct}%</span>
          <div className="text-xs text-muted-foreground">{evidenceCount} evidence {evidenceCount === 1 ? "entry" : "entries"}</div>
        </div>
      </div>
      <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5 mb-3">
        {green > 0 && <div className="bg-green-500 rounded-full transition-all" style={{ flex: green }} />}
        {amber > 0 && <div className="bg-amber-500 rounded-full transition-all" style={{ flex: amber }} />}
        {red > 0 && <div className="bg-red-500 rounded-full transition-all" style={{ flex: red }} />}
        {unrated > 0 && <div className="bg-muted rounded-full transition-all" style={{ flex: unrated }} />}
      </div>
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500 inline-block" />{green} ready</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />{amber} in progress</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500 inline-block" />{red} not ready</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-muted-foreground/40 inline-block" />{unrated} unrated</span>
      </div>
    </div>
  );
}

export default function TargetRole() {
  const [, navigate] = useLocation();
  const {
    sessionId, currentRoleId, targetRoleId, targetCareerPathId,
    setTargetRoleId, setTargetCareerPathId,
  } = useSessionStore();
  const queryClient = useQueryClient();

  const [pathPickerOpen, setPathPickerOpen] = useState(!targetCareerPathId);
  const [rolePickerOpen, setRolePickerOpen] = useState(!targetRoleId);
  const [jobSpecOpen, setJobSpecOpen] = useState(false);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const [addingEvidence, setAddingEvidence] = useState<number | null>(null);
  const [editingEvidence, setEditingEvidence] = useState<number | null>(null);

  const { data: careerPaths, isLoading: pathsLoading } = useListCareerPaths();

  const { data: targetRoles, isLoading: rolesLoading } = useListRoles(
    { careerPathId: targetCareerPathId ?? undefined },
    { query: { enabled: !!targetCareerPathId } }
  );

  const { data: role, isLoading: roleLoading } = useGetRole(targetRoleId!, {
    query: { enabled: !!targetRoleId },
  });

  const { data: assessments = [] } = useListAssessments(
    { sessionId, roleId: targetRoleId ?? undefined },
    { query: { enabled: !!targetRoleId } }
  );

  const { data: evidence = [] } = useListEvidence(
    { sessionId, roleId: targetRoleId ?? undefined },
    { query: { enabled: !!targetRoleId } }
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
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListEvidenceQueryKey() }); },
    },
  });

  if (!currentRoleId) {
    return (
      <div className="flex items-center justify-center h-full p-12 text-center">
        <div>
          <p className="text-muted-foreground text-sm mb-3">You haven't selected a current role yet.</p>
          <button onClick={() => navigate("/")} className="text-primary text-sm font-medium hover:underline">Go to Setup</button>
        </div>
      </div>
    );
  }

  function handleSelectPath(id: number) {
    if (id !== targetCareerPathId) {
      setTargetCareerPathId(id);
      setTargetRoleId(null);
      setRolePickerOpen(true);
    }
    setPathPickerOpen(false);
  }

  function handleSelectRole(id: number) {
    setTargetRoleId(id);
    setRolePickerOpen(false);
    setOpenCategories({});
  }

  function toggleCategory(key: string) {
    setOpenCategories(prev => ({ ...prev, [key]: !prev[key] }));
  }

  const selectedPath = careerPaths?.find(p => p.id === targetCareerPathId);
  const selectedRole = targetRoles?.find(r => r.id === targetRoleId);

  const assessmentMap = new Map(assessments.map(a => [a.competencyId, a]));
  const evidenceByComp = new Map<number, typeof evidence>();
  for (const e of evidence) {
    if (!evidenceByComp.has(e.competencyId)) evidenceByComp.set(e.competencyId, []);
    evidenceByComp.get(e.competencyId)!.push(e);
  }

  const categories = Array.from(new Set((role?.competencies ?? []).map(c => c.category)));

  function handleRate(competencyId: number, rating: Rating) {
    upsert.mutate({ data: { sessionId, competencyId, roleId: targetRoleId!, rating } });
  }

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      <div className="mb-8">
        <h2 className="font-script text-4xl text-foreground">Target Role</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Choose the career path, role you are working towards and collect evidence in one place ready for a potential promotion.
        </p>
      </div>

      {/* Step 1: Career Path */}
      <div className="mb-5">
        {/* Header / summary row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex-shrink-0">1</div>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Career Path</h3>
          </div>
          {targetCareerPathId && !pathPickerOpen && (
            <button
              onClick={() => setPathPickerOpen(true)}
              className="flex items-center gap-1 text-xs text-primary font-medium hover:opacity-80 transition-opacity"
            >
              <Pencil className="h-3 w-3" />
              Change
            </button>
          )}
        </div>

        {/* Collapsed summary */}
        {targetCareerPathId && !pathPickerOpen && selectedPath && (
          <div className="rounded-xl border border-primary/30 bg-accent px-4 py-2.5 text-sm font-semibold text-foreground">
            {selectedPath.name}
          </div>
        )}

        {/* Expanded picker */}
        {pathPickerOpen && (
          pathsLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {(careerPaths ?? []).map(path => {
                const pdfUrl = CAREER_PATH_PDFS[path.id];
                return (
                  <div
                    key={path.id}
                    onClick={() => handleSelectPath(path.id)}
                    className={cn(
                      "w-full text-left rounded-xl border p-4 transition-all duration-150 cursor-pointer",
                      targetCareerPathId === path.id
                        ? "border-primary bg-accent shadow-sm"
                        : "border-border bg-card hover:border-primary/40 hover:bg-accent/50"
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-foreground text-sm">{path.name}</div>
                        {pdfUrl && (
                          <a
                            href={pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium mt-1.5"
                          >
                            <FileText className="h-3 w-3" />
                            View career path diagram
                          </a>
                        )}
                      </div>
                      {targetCareerPathId === path.id && (
                        <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                          <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Step 2: Role Picker */}
      {targetCareerPathId && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex-shrink-0">2</div>
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Target Role</h3>
            </div>
            {targetRoleId && !rolePickerOpen && (
              <button
                onClick={() => setRolePickerOpen(true)}
                className="flex items-center gap-1 text-xs text-primary font-medium hover:opacity-80 transition-opacity"
              >
                <Pencil className="h-3 w-3" />
                Change
              </button>
            )}
          </div>

          {/* Collapsed summary */}
          {targetRoleId && !rolePickerOpen && selectedRole && (
            <div className="rounded-xl border border-primary/30 bg-accent px-4 py-2.5 text-sm font-semibold text-foreground">
              {selectedRole.title}
            </div>
          )}

          {/* Expanded role list */}
          {rolePickerOpen && (
            rolesLoading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />)}
              </div>
            ) : !targetRoles?.length ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-muted-foreground text-sm">
                No roles found for this career path.
              </div>
            ) : (
              <div className="space-y-2">
                {targetRoles.map(r => (
                  <button
                    key={r.id}
                    onClick={() => handleSelectRole(r.id)}
                    className={cn(
                      "w-full text-left rounded-xl border p-4 transition-all duration-150 cursor-pointer",
                      targetRoleId === r.id
                        ? "border-primary bg-accent shadow-sm"
                        : "border-border bg-card hover:border-primary/40 hover:bg-accent/50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted text-muted-foreground flex-shrink-0">
                          <Briefcase className="h-4 w-4" />
                        </div>
                        <div className="font-semibold text-foreground text-sm">{r.title}</div>
                      </div>
                      {targetRoleId === r.id && (
                        <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                          <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {/* Role detail + competencies — only when a role is selected */}
      {targetRoleId && roleLoading && (
        <div className="space-y-4">
          <div className="h-32 rounded-xl bg-muted animate-pulse" />
          <div className="h-64 rounded-xl bg-muted animate-pulse" />
        </div>
      )}

      {targetRoleId && role && !roleLoading && (
        <>
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
          <ReadinessBar assessments={assessments} total={(role.competencies ?? []).length} evidenceCount={evidence.length} />

          {/* Competencies + Evidence */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground mb-1">Competency Assessment & Evidence</h3>
            <p className="text-xs text-muted-foreground">Rate each competency and add evidence to demonstrate your readiness. Click a section to expand it.</p>
          </div>

          <div className="space-y-2">
            {categories.map(category => {
              const comps = (role.competencies ?? []).filter(c => c.category === category);
              const catKey = `cat-${category}`;
              const isCatOpen = !!openCategories[catKey];
              const rated = comps.filter(c => assessmentMap.has(c.id)).length;
              const evidenceTotal = comps.reduce((sum, c) => sum + (evidenceByComp.get(c.id)?.length ?? 0), 0);

              return (
                <div key={category} className="border border-border rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleCategory(catKey)}
                    className="w-full flex items-center justify-between px-5 py-3.5 bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wider">{category}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        {rated}/{comps.length} rated{evidenceTotal > 0 ? ` · ${evidenceTotal} evidence` : ""}
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
                        const compEvidence = evidenceByComp.get(comp.id) ?? [];
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
                                        sessionId={sessionId}
                                        competencyId={comp.id}
                                        roleId={targetRoleId}
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
                                            >
                                              <Pencil className="h-3 w-3" />
                                            </button>
                                            <button
                                              onClick={() => deleteEvidence.mutate({ id: ev.id })}
                                              className="p-1 text-muted-foreground hover:text-destructive transition-colors"
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
                                sessionId={sessionId}
                                competencyId={comp.id}
                                roleId={targetRoleId}
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
            <p className="text-xs text-muted-foreground">Evidence and ratings are saved automatically.</p>
            <button
              onClick={() => navigate("/summary")}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              View Readiness Summary
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
