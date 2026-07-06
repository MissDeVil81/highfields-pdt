import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useManagerStore } from "@/hooks/useManagerStore";
import {
  useGetUser,
  useListProbationItems,
  useListProbationAssessments,
  useListProbationManagerReviews,
  useUpsertProbationManagerReview,
  useUpsertProbationAssessment,
  usePublishProbationManagerReview,
  useListProbationActions,
  useCreateProbationAction,
  useUpdateProbationAction,
  useDeleteProbationAction,
  getListProbationAssessmentsQueryKey,
  getListProbationManagerReviewsQueryKey,
  getGetUserQueryKey,
  getListProbationItemsQueryKey,
  getListProbationActionsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Save, Send, Loader2, CheckCircle2, Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const REVIEW_PERIODS = [
  { value: "month1", label: "1 Month" },
  { value: "month3", label: "3 Months" },
  { value: "month5", label: "5 Months" },
  { value: "month6", label: "6 Months" },
];

const PREV_PERIOD: Record<string, string | null> = {
  month1: null, month3: "month1", month5: "month3", month6: "month5",
};
const PREV_LABEL: Record<string, string | null> = {
  month1: null, month3: "1 Month", month5: "3 Months", month6: "5 Months",
};
const ACTION_STATUS_OPTS = [
  { value: "not_started", label: "Not Started", active: "bg-slate-400 text-white border-slate-400", inactive: "border-border text-muted-foreground hover:border-slate-400" },
  { value: "in_progress", label: "In Progress", active: "bg-amber-500 text-white border-amber-500", inactive: "border-border text-muted-foreground hover:border-amber-400" },
  { value: "complete", label: "Complete", active: "bg-green-500 text-white border-green-500", inactive: "border-border text-muted-foreground hover:border-green-400" },
];

const MANAGER_RATING_OPTIONS = [
  { value: "yes", label: "Yes", activeClass: "bg-green-500 text-white border-green-500" },
  { value: "in_progress", label: "In Progress", activeClass: "bg-amber-500 text-white border-amber-500" },
  { value: "not_yet", label: "Not Yet", activeClass: "bg-red-400 text-white border-red-400" },
];

function RatingPill({ rating }: { rating?: string | null }) {
  if (!rating) return <span className="text-xs text-muted-foreground">—</span>;
  const config: Record<string, { color: string; label: string }> = {
    yes: { color: "bg-green-100 text-green-700", label: "Yes" },
    in_progress: { color: "bg-amber-100 text-amber-700", label: "In Progress" },
    not_yet: { color: "bg-red-100 text-red-600", label: "Not Yet" },
    no: { color: "bg-red-100 text-red-600", label: "Not Yet" },
    most: { color: "bg-green-100 text-green-700", label: "Most of the time" },
    some: { color: "bg-amber-100 text-amber-700", label: "Some of the time" },
    rarely: { color: "bg-red-100 text-red-600", label: "Rarely" },
  };
  const c = config[rating] ?? { color: "bg-muted text-muted-foreground", label: rating };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${c.color}`}>
      {c.label}
    </span>
  );
}

function ManagerRatingSelect({
  value,
  onChange,
}: {
  value: string | null | undefined;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {MANAGER_RATING_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
            value === opt.value
              ? opt.activeClass
              : "bg-muted text-muted-foreground border-border hover:border-foreground/30"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function EmployeeProbation() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { manager } = useManagerStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("month1");

  useEffect(() => {
    if (!manager) navigate("/");
  }, [manager]);

  const employeeId = Number(id);
  const { data: employee, isLoading: loadingEmployee } = useGetUser(employeeId, {
    query: { queryKey: getGetUserQueryKey(employeeId), enabled: !isNaN(employeeId) },
  });

  const userId = !isNaN(employeeId) ? employeeId : 0;

  const { data: items = [] } = useListProbationItems({
    query: { queryKey: getListProbationItemsQueryKey(), enabled: true },
  });
  const { data: assessments = [], isLoading: loadingAssessments } = useListProbationAssessments(
    { userId, reviewPeriod: activeTab },
    { query: { queryKey: getListProbationAssessmentsQueryKey({ userId, reviewPeriod: activeTab }), enabled: !!userId } }
  );
  const { data: managerReviews = [] } = useListProbationManagerReviews(
    { userId, reviewPeriod: activeTab },
    { query: { queryKey: getListProbationManagerReviewsQueryKey({ userId, reviewPeriod: activeTab }), enabled: !!userId } }
  );

  const upsertManagerReview = useUpsertProbationManagerReview();
  const upsertAssessment = useUpsertProbationAssessment();
  const publishReview = usePublishProbationManagerReview();

  const actionsParams = { userId, reviewPeriod: activeTab };
  const { data: currentActions = [] } = useListProbationActions(
    actionsParams,
    { query: { queryKey: getListProbationActionsQueryKey(actionsParams), enabled: !!userId } }
  );
  const prevPeriodId = PREV_PERIOD[activeTab];
  const prevActionsParams = { userId, reviewPeriod: prevPeriodId ?? "month1" };
  const { data: prevActionsAll = [] } = useListProbationActions(
    prevActionsParams,
    { query: { queryKey: getListProbationActionsQueryKey(prevActionsParams), enabled: !!userId && !!prevPeriodId } }
  );
  const carriedActions = prevActionsAll.filter(a => a.status !== "complete");

  const invalidateActions = () => queryClient.invalidateQueries({ queryKey: getListProbationActionsQueryKey() });
  const createAction = useCreateProbationAction({ mutation: { onSuccess: invalidateActions } });
  const updateAction = useUpdateProbationAction({ mutation: { onSuccess: invalidateActions } });
  const deleteAction = useDeleteProbationAction({ mutation: { onSuccess: invalidateActions } });

  const currentReview = managerReviews[0];
  const isPublished = !!currentReview?.publishedAt;

  const [goingWell, setGoingWell] = useState("");
  const [developmentAreas, setDevelopmentAreas] = useState("");
  const [reviewDate, setReviewDate] = useState("");
  const [localManagerRatings, setLocalManagerRatings] = useState<Record<number, string>>({});
  const [localManagerComments, setLocalManagerComments] = useState<Record<number, string>>({});
  const [newActionText, setNewActionText] = useState("");
  const [editingActionId, setEditingActionId] = useState<number | null>(null);
  const [editActionText, setEditActionText] = useState("");

  useEffect(() => {
    if (currentReview) {
      setGoingWell(currentReview.goingWell ?? "");
      setDevelopmentAreas(currentReview.developmentAreas ?? "");
      setReviewDate(currentReview.reviewDate ?? "");
    } else {
      setGoingWell("");
      setDevelopmentAreas("");
      setReviewDate("");
    }
    setLocalManagerRatings({});
    setLocalManagerComments({});
    setNewActionText("");
    setEditingActionId(null);
  }, [currentReview?.id, activeTab]);

  const assessmentMap = new Map(assessments.map((a) => [a.itemId, a]));

  const getManagerRating = (itemId: number) =>
    localManagerRatings[itemId] ?? assessmentMap.get(itemId)?.managerRating ?? null;
  const getManagerComment = (itemId: number) =>
    localManagerComments[itemId] ?? assessmentMap.get(itemId)?.managerComment ?? "";

  const handleSave = async () => {
    if (!userId) return;

    await upsertManagerReview.mutateAsync({
      data: {
        userId,
        reviewPeriod: activeTab,
        goingWell: goingWell || null,
        developmentAreas: developmentAreas || null,
        reviewDate: reviewDate || null,
      },
    });

    const ratingEntries = Object.entries(localManagerRatings);
    const commentEntries = Object.entries(localManagerComments);
    const itemIds = new Set([
      ...ratingEntries.map(([id]) => Number(id)),
      ...commentEntries.map(([id]) => Number(id)),
    ]);

    await Promise.all(
      Array.from(itemIds).map((itemId) => {
        const existing = assessmentMap.get(itemId);
        return upsertAssessment.mutateAsync({
          data: {
            userId,
            itemId,
            reviewPeriod: activeTab,
            rating: existing?.rating ?? null,
            note: existing?.note ?? null,
            managerRating: localManagerRatings[itemId] ?? existing?.managerRating ?? null,
            managerComment: localManagerComments[itemId] ?? existing?.managerComment ?? null,
          },
        });
      })
    );

    await queryClient.invalidateQueries({
      queryKey: getListProbationAssessmentsQueryKey({ userId, reviewPeriod: activeTab }),
    });
    await queryClient.invalidateQueries({
      queryKey: getListProbationManagerReviewsQueryKey({ userId }),
    });

    setLocalManagerRatings({});
    setLocalManagerComments({});
    toast({ title: "Draft saved" });
  };

  const handlePublish = async () => {
    if (!userId) return;
    await handleSave();
    await publishReview.mutateAsync({ data: { userId, reviewPeriod: activeTab } });
    await queryClient.invalidateQueries({
      queryKey: getListProbationManagerReviewsQueryKey({ userId }),
    });
    toast({ title: "Review finalised & submitted", description: "The employee can now see this review." });
  };

  const isSaving = upsertManagerReview.isPending || upsertAssessment.isPending;
  const isPublishing = publishReview.isPending;

  const sections = Array.from(new Set(items.map((i) => i.section)));

  if (loadingEmployee) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Employee not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-sidebar text-sidebar-foreground px-6 py-4 border-b border-sidebar-border flex items-center gap-4">
        <button
          onClick={() => navigate("/home")}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold tracking-widest uppercase text-sidebar-primary">Probation Review</p>
          <h1 className="text-lg font-bold truncate text-sidebar-foreground leading-tight">{employee.name}</h1>
          {employee.jobTitle && (
            <p className="text-xs text-sidebar-foreground/60">{employee.jobTitle}</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={handleSave}
            disabled={isSaving || !userId}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium bg-sidebar-accent text-sidebar-accent-foreground hover:opacity-80 transition-opacity disabled:opacity-40"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Draft
          </button>
          <button
            onClick={handlePublish}
            disabled={isPublishing || !userId}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {isPublishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {isPublished ? "Re-finalise & Submit" : "Finalise & Submit"}
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            {REVIEW_PERIODS.map((p) => (
              <TabsTrigger key={p.value} value={p.value}>
                {p.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {REVIEW_PERIODS.map((period) => (
            <TabsContent key={period.value} value={period.value} className="space-y-4 pb-24">

              {/* Status bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isPublished ? (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Published {new Date(currentReview!.publishedAt!).toLocaleDateString("en-GB")}
                    </div>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-muted text-muted-foreground">Draft</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">Date of Review:</label>
                  {isPublished ? (
                    <span className="text-xs border border-border rounded-lg px-2.5 py-1 bg-muted/40 text-foreground">
                      {reviewDate || "—"}
                    </span>
                  ) : (
                    <input
                      type="date"
                      value={reviewDate}
                      onChange={(e) => setReviewDate(e.target.value)}
                      className="text-xs border border-border rounded-lg px-2.5 py-1 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  )}
                </div>
              </div>

              {!userId ? (
                <div className="bg-card border border-dashed border-border rounded-xl p-8 text-center">
                  <p className="text-sm text-muted-foreground">No employee data available.</p>
                </div>
              ) : (
                <>
                  {/* Probation item sections */}
                  {sections.map((section) => {
                    const sectionItems = items.filter((i) => i.section === section);
                    return (
                      <div key={section} className="bg-card border border-border rounded-xl overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-border bg-muted/50">
                          <h3 className="text-sm font-semibold text-foreground">{section}</h3>
                        </div>
                        <div className="grid grid-cols-[1fr_1fr_1fr] text-xs font-medium text-muted-foreground border-b border-border bg-muted/30">
                          <div className="px-4 py-2">Objective</div>
                          <div className="px-4 py-2 border-l border-border">Employee</div>
                          <div className="px-4 py-2 border-l border-border">Manager</div>
                        </div>
                        {sectionItems.map((item) => {
                          const assessment = assessmentMap.get(item.id);
                          return (
                            <div
                              key={item.id}
                              className="grid grid-cols-[1fr_1fr_1fr] border-b border-border last:border-0"
                            >
                              <div className="px-4 py-3">
                                <p className="text-sm text-foreground">{item.itemText}</p>
                              </div>
                              <div className="px-4 py-3 border-l border-border space-y-1.5">
                                <RatingPill rating={assessment?.rating} />
                                {assessment?.note && (
                                  <p className="text-xs text-muted-foreground">{assessment.note}</p>
                                )}
                              </div>
                              <div className="px-4 py-3 border-l border-border space-y-2">
                                {isPublished ? (
                                  <>
                                    <RatingPill rating={getManagerRating(item.id) ?? undefined} />
                                    {getManagerComment(item.id) && (
                                      <p className="text-xs text-muted-foreground">{getManagerComment(item.id)}</p>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <ManagerRatingSelect
                                      value={getManagerRating(item.id)}
                                      onChange={(v) =>
                                        setLocalManagerRatings((prev) => ({ ...prev, [item.id]: v }))
                                      }
                                    />
                                    <Textarea
                                      placeholder="Add comment…"
                                      value={getManagerComment(item.id)}
                                      onChange={(e) =>
                                        setLocalManagerComments((prev) => ({
                                          ...prev,
                                          [item.id]: e.target.value,
                                        }))
                                      }
                                      rows={2}
                                      className="text-xs resize-none"
                                    />
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}

                  {/* Manager Summary */}
                  <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-border bg-muted/50 flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">Manager Summary</h3>
                      {isPublished && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">Locked</span>
                      )}
                    </div>
                    <div className="p-5 space-y-4">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                          What's going well
                        </label>
                        {isPublished ? (
                          <p className="text-sm px-3 py-2.5 rounded-xl border border-border bg-muted/30 min-h-[4rem] leading-relaxed text-foreground">
                            {goingWell || <span className="italic text-muted-foreground/50">Not recorded.</span>}
                          </p>
                        ) : (
                          <Textarea
                            placeholder="Areas where the employee is performing well…"
                            value={goingWell}
                            onChange={(e) => setGoingWell(e.target.value)}
                            rows={3}
                            className="text-sm"
                          />
                        )}
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                          Development areas
                        </label>
                        {isPublished ? (
                          <p className="text-sm px-3 py-2.5 rounded-xl border border-border bg-muted/30 min-h-[4rem] leading-relaxed text-foreground">
                            {developmentAreas || <span className="italic text-muted-foreground/50">Not recorded.</span>}
                          </p>
                        ) : (
                          <Textarea
                            placeholder="Areas for improvement or focus…"
                            value={developmentAreas}
                            onChange={(e) => setDevelopmentAreas(e.target.value)}
                            rows={3}
                            className="text-sm"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-border bg-muted/50">
                      <h3 className="text-sm font-semibold text-foreground">Actions</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Set and track development actions for this review period.
                      </p>
                    </div>
                    <div className="p-5 space-y-4">

                      {/* Carried-forward actions */}
                      {prevPeriodId && carriedActions.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-amber-600 flex items-center gap-1.5">
                            <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
                            Carried forward from {PREV_LABEL[period.value]} review ({carriedActions.length} incomplete)
                          </p>
                          <div className="space-y-2 pl-3 border-l-2 border-amber-200">
                            {carriedActions.map((action) => (
                              <div key={action.id} className="flex items-start gap-2">
                                <p className="text-xs text-muted-foreground flex-1 py-1">{action.actionText}</p>
                                <div className="flex gap-1 shrink-0 flex-wrap">
                                  {ACTION_STATUS_OPTS.map((opt) => (
                                    <button
                                      key={opt.value}
                                      onClick={() => updateAction.mutate({ id: action.id, data: { status: opt.value as "not_started" | "in_progress" | "complete" } })}
                                      className={`px-2 py-0.5 rounded-lg text-xs border transition-all ${action.status === opt.value ? opt.active : opt.inactive}`}
                                    >
                                      {opt.label}
                                    </button>
                                  ))}
                                </div>
                                <button
                                  onClick={() => deleteAction.mutate({ id: action.id })}
                                  className="p-1 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Current period actions */}
                      <div className="space-y-2">
                        {currentActions.length > 0 && (
                          <div className="space-y-2">
                            {currentActions.map((action) => (
                              <div key={action.id} className="flex items-start gap-2 group">
                                {editingActionId === action.id ? (
                                  <>
                                    <input
                                      autoFocus
                                      value={editActionText}
                                      onChange={(e) => setEditActionText(e.target.value)}
                                      className="flex-1 text-xs border border-ring rounded-lg px-2.5 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                    <button
                                      onClick={() => {
                                        if (editActionText.trim()) {
                                          updateAction.mutate({ id: action.id, data: { actionText: editActionText.trim() } });
                                        }
                                        setEditingActionId(null);
                                      }}
                                      className="p-1 text-green-600 hover:text-green-700 shrink-0"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => setEditingActionId(null)}
                                      className="p-1 text-muted-foreground hover:text-foreground shrink-0"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <p className="text-xs text-foreground flex-1 py-1">{action.actionText}</p>
                                    <div className="flex gap-1 shrink-0 flex-wrap">
                                      {ACTION_STATUS_OPTS.map((opt) => (
                                        <button
                                          key={opt.value}
                                          onClick={() => updateAction.mutate({ id: action.id, data: { status: opt.value as "not_started" | "in_progress" | "complete" } })}
                                          className={`px-2 py-0.5 rounded-lg text-xs border transition-all ${action.status === opt.value ? opt.active : opt.inactive}`}
                                        >
                                          {opt.label}
                                        </button>
                                      ))}
                                    </div>
                                    <button
                                      onClick={() => { setEditingActionId(action.id); setEditActionText(action.actionText); }}
                                      className="p-1 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => deleteAction.mutate({ id: action.id })}
                                      className="p-1 text-muted-foreground hover:text-destructive shrink-0"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Add new action */}
                        <div className="flex gap-2 mt-2">
                          <input
                            value={newActionText}
                            onChange={(e) => setNewActionText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && newActionText.trim()) {
                                createAction.mutate({ data: { userId, reviewPeriod: activeTab, actionText: newActionText.trim() } });
                                setNewActionText("");
                              }
                            }}
                            placeholder="Add an action… (press Enter to save)"
                            className="flex-1 text-xs border border-border rounded-xl px-3 py-2 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                          <button
                            disabled={!newActionText.trim() || createAction.isPending}
                            onClick={() => {
                              if (newActionText.trim()) {
                                createAction.mutate({ data: { userId, reviewPeriod: activeTab, actionText: newActionText.trim() } });
                                setNewActionText("");
                              }
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border border-border bg-muted text-foreground hover:bg-accent transition-colors disabled:opacity-40 shrink-0"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-6 py-3 z-10">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <div className="flex-1 min-w-0">
            {isPublished ? (
              <p className="text-xs text-green-700 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                Finalised {new Date(currentReview!.publishedAt!).toLocaleDateString("en-GB")} — the employee can see this review.
                Ratings and summary are locked. Actions remain editable.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Save Draft</strong> to keep editing, or{" "}
                <strong className="text-foreground">Finalise & Submit</strong> to share with the employee and lock ratings.
              </p>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            {!isPublished && (
              <button
                onClick={handleSave}
                disabled={isSaving || !userId}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium bg-secondary text-secondary-foreground hover:opacity-80 transition-opacity disabled:opacity-40"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Draft
              </button>
            )}
            <button
              onClick={handlePublish}
              disabled={isPublishing || !userId}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {isPublishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {isPublished ? "Re-finalise & Submit" : "Finalise & Submit"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
