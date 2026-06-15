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
  useListFinancialTargets,
  useListFinancialProgress,
  useUpsertFinancialProgress,
  getListAssessmentsQueryKey,
  getListEvidenceQueryKey,
  getListFinancialProgressQueryKey,
  getGetRoleQueryKey,
  getListRolesQueryKey,
  getListFinancialTargetsQueryKey,
} from "@workspace/api-client-react";
import { useSessionStore } from "@/lib/session";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { RatingPicker, RatingBadge } from "@/components/RatingButton";
import { JobSpecText } from "@/components/JobSpecText";
import { ArrowRight, Plus, Pencil, Trash2, ChevronDown, ChevronUp, X, Check, Briefcase, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

type Rating = "red" | "amber" | "green";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const CAREER_PATH_PDFS: Record<number, string> = {
  1: `${basePath}/pdfs/360-career-path.pdf`,
  2: `${basePath}/pdfs/180-delivery-career-path.pdf`,
  3: `${basePath}/pdfs/account-management-career-path.pdf`,
};

interface EvidenceFormProps {
  userId: number;
  competencyId: number;
  roleId: number;
  onClose: () => void;
  existing?: { id: number; title: string; description: string; rating: string };
}

function EvidenceForm({ userId, competencyId, roleId, onClose, existing }: EvidenceFormProps) {
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
      create.mutate({ data: { userId, competencyId, roleId, title, description, rating } });
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

function FinancialTargetsSection({ userId, roleId }: { userId: number; roleId: number }) {
  const queryClient = useQueryClient();
  const [inputs, setInputs] = useState<Record<number, string>>({});
  const lastInitRoleRef = useRef<number | null>(null);

  const targetsParams = { roleId };
  const { data: targets = [] } = useListFinancialTargets(
    targetsParams,
    { query: { queryKey: getListFinancialTargetsQueryKey(targetsParams), enabled: !!roleId } }
  );

  const progressParams = { userId, roleId };
  const { data: progressList = [], isLoading: progressLoading } = useListFinancialProgress(
    progressParams,
    { query: { queryKey: getListFinancialProgressQueryKey(progressParams), enabled: !!roleId } }
  );

  const upsert = useUpsertFinancialProgress({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListFinancialProgressQueryKey() });
      },
    },
  });

  useEffect(() => {
    if (!progressLoading && lastInitRoleRef.current !== roleId) {
      const init: Record<number, string> = {};
      for (const p of progressList) {
        init[p.targetId] = String(p.currentAmount);
      }
      setInputs(init);
      lastInitRoleRef.current = roleId;
    }
  }, [progressList, progressLoading, roleId]);

  if (targets.length === 0) return null;

  const progressMap = new Map(progressList.map(p => [p.targetId, p.currentAmount]));

  function getDisplayAmount(targetId: number): number {
    const inputVal = parseInt((inputs[targetId] ?? "").replace(/[^0-9]/g, ""), 10);
    if (!isNaN(inputVal)) return inputVal;
    return progressMap.get(targetId) ?? 0;
  }

  function getPct(targetId: number, targetAmount: number): number {
    return targetAmount > 0 ? Math.min((getDisplayAmount(targetId) / targetAmount) * 100, 100) : 0;
  }

  function handleBlur(targetId: number) {
    const raw = inputs[targetId] ?? "";
    const amount = parseInt(raw.replace(/[^0-9]/g, ""), 10);
    if (!isNaN(amount) && amount >= 0) {
      upsert.mutate({ data: { userId, targetId, roleId, currentAmount: amount } });
    }
  }

  function ragBarColor(pct: number) {
    if (pct >= 100) return "bg-green-500";
    if (pct >= 75) return "bg-amber-500";
    return "bg-red-500";
  }

  function ragLabel(pct: number): { text: string; cls: string } {
    if (pct >= 100) return { text: "Financial target achieved!", cls: "text-green-600" };
    if (pct >= 75) return { text: "Close to target — keep going!", cls: "text-amber-600" };
    return { text: "Not yet on track", cls: "text-red-500" };
  }

  const singleTargets = targets.filter(t => t.optionGroup == null);
  const groupedMap = new Map<number, typeof targets>();
  for (const t of targets) {
    if (t.optionGroup != null) {
      if (!groupedMap.has(t.optionGroup)) groupedMap.set(t.optionGroup, []);
      groupedMap.get(t.optionGroup)!.push(t);
    }
  }

  return (
    <div className="border border-primary/20 bg-primary/5 rounded-xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary/15 text-primary font-bold text-sm">
          £
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Financial Targets</h3>
          <p className="text-xs text-muted-foreground">Enter your current performance to track your financial readiness for promotion.</p>
        </div>
      </div>

      <div className="space-y-4">
        {singleTargets.map(target => {
          const pct = getPct(target.id, target.targetAmount);
          const pctDisplay = Math.round(pct);
          const { text: statusText, cls: statusCls } = ragLabel(pct);
          return (
            <div key={target.id} className="bg-card border border-border rounded-xl p-4">
              <div className="font-medium text-sm text-foreground mb-0.5">{target.label}</div>
              <div className="text-xs text-muted-foreground mb-3">
                Promotion target: <span className="font-semibold text-foreground">£{target.targetAmount.toLocaleString()}</span>
              </div>
              <label className="text-xs text-muted-foreground block mb-1.5">
                Your current {target.periodLabel} (£)
              </label>
              <input
                type="number"
                min="0"
                value={inputs[target.id] ?? ""}
                onChange={e => setInputs(prev => ({ ...prev, [target.id]: e.target.value }))}
                onBlur={() => handleBlur(target.id)}
                placeholder="Enter amount"
                className="w-full text-sm px-3 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="mt-3 h-2 rounded-full overflow-hidden bg-muted">
                <div className={cn(ragBarColor(pct), "h-full rounded-full transition-all duration-300")} style={{ width: `${pctDisplay}%` }} />
              </div>
              <div className="mt-1.5 flex items-center justify-between">
                <span className={cn("text-xs font-medium", statusCls)}>{statusText}</span>
                <span className="text-xs text-muted-foreground">{pctDisplay}% of target</span>
              </div>
            </div>
          );
        })}

        {Array.from(groupedMap.entries()).map(([groupKey, groupTargets]) => {
          const bestPct = Math.max(...groupTargets.map(t => getPct(t.id, t.targetAmount)));
          const { text: overallText, cls: overallCls } = ragLabel(bestPct);
          return (
            <div key={groupKey}>
              <p className="text-xs text-muted-foreground mb-2.5">
                Meet <span className="font-semibold text-foreground">either</span> of these targets to achieve your financial goal:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {groupTargets.map(target => {
                  const pct = getPct(target.id, target.targetAmount);
                  const pctDisplay = Math.round(pct);
                  return (
                    <div key={target.id} className="bg-card border border-border rounded-xl p-4">
                      <div className="text-xs font-semibold text-foreground mb-1">{target.label}</div>
                      <div className="text-xs text-muted-foreground mb-3">
                        Target: <span className="font-semibold text-foreground">£{target.targetAmount.toLocaleString()}</span>
                      </div>
                      <label className="text-xs text-muted-foreground block mb-1.5">Your total (£)</label>
                      <input
                        type="number"
                        min="0"
                        value={inputs[target.id] ?? ""}
                        onChange={e => setInputs(prev => ({ ...prev, [target.id]: e.target.value }))}
                        onBlur={() => handleBlur(target.id)}
                        placeholder="Enter amount"
                        className="w-full text-sm px-3 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <div className="mt-3 h-2 rounded-full overflow-hidden bg-muted">
                        <div className={cn(ragBarColor(pct), "h-full rounded-full transition-all duration-300")} style={{ width: `${pctDisplay}%` }} />
                      </div>
                      <div className="mt-1 text-right">
                        <span className="text-xs text-muted-foreground">{pctDisplay}% of target</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className={cn("mt-2 text-xs font-medium", overallCls)}>
                Overall status: {overallText}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function TargetRole() {
  const [, navigate] = useLocation();
  const {
    userId, currentRoleId, targetRoleId, targetCareerPathId,
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

  const targetRolesParams = { careerPathId: targetCareerPathId ?? undefined };
  const { data: targetRoles, isLoading: rolesLoading } = useListRoles(
    targetRolesParams,
    { query: { queryKey: getListRolesQueryKey(targetRolesParams), enabled: !!targetCareerPathId } }
  );

  const { data: role, isLoading: roleLoading } = useGetRole(targetRoleId!, {
    query: { queryKey: getGetRoleQueryKey(targetRoleId!), enabled: !!targetRoleId },
  });

  const assessmentsParams = { userId: userId ?? 0, roleId: targetRoleId ?? undefined };
  const { data: assessments = [] } = useListAssessments(
    assessmentsParams,
    { query: { queryKey: getListAssessmentsQueryKey(assessmentsParams), enabled: !!targetRoleId && !!userId } }
  );

  const evidenceParams = { userId: userId ?? 0, roleId: targetRoleId ?? undefined };
  const { data: evidence = [] } = useListEvidence(
    evidenceParams,
    { query: { queryKey: getListEvidenceQueryKey(evidenceParams), enabled: !!targetRoleId && !!userId } }
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
          <button onClick={() => navigate("/setup")} className="text-primary text-sm font-medium hover:underline">Go to Setup</button>
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

  const categories = Array.from(new Set((role?.competencies ?? []).map(c => c.category)))
    .sort((a, b) => {
      if (a === "Financials") return -1;
      if (b === "Financials") return 1;
      return a.localeCompare(b);
    });

  function handleRate(competencyId: number, rating: Rating) {
    upsert.mutate({ data: { userId: userId!, competencyId, roleId: targetRoleId!, rating } });
  }

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      <div className="mb-8">
        <h2 className="font-script text-4xl text-foreground">Target Role</h2>
        <p className="text-muted-foreground mt-4 text-sm">
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

          {/* Financial Targets */}
          <FinancialTargetsSection userId={userId ?? 0} roleId={targetRoleId} />

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
                                        userId={userId ?? 0}
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
                                userId={userId ?? 0}
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
