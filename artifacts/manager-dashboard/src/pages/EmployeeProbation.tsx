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
  getListProbationAssessmentsQueryKey,
  getListProbationManagerReviewsQueryKey,
  getGetUserQueryKey,
  getListProbationItemsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Save, Send, Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const REVIEW_PERIODS = [
  { value: "1_month", label: "1 Month" },
  { value: "3_month", label: "3 Months" },
  { value: "5_month", label: "5 Months" },
  { value: "6_month", label: "6 Months" },
];

const RATING_OPTIONS = ["red", "amber", "green"];

function RatingBadge({ rating }: { rating?: string | null }) {
  if (!rating) return <span className="text-xs text-muted-foreground">—</span>;
  const colors: Record<string, string> = {
    red: "bg-red-100 text-red-800 border-red-200",
    amber: "bg-amber-100 text-amber-800 border-amber-200",
    green: "bg-green-100 text-green-800 border-green-200",
  };
  return (
    <Badge className={`${colors[rating] ?? "bg-muted"} font-normal capitalize border`}>
      {rating}
    </Badge>
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
    <div className="flex gap-1.5">
      {RATING_OPTIONS.map((r) => (
        <button
          key={r}
          onClick={() => onChange(r)}
          className={`px-2.5 py-1 rounded text-xs font-medium border transition-all ${
            value === r
              ? r === "red"
                ? "bg-red-500 text-white border-red-500"
                : r === "amber"
                ? "bg-amber-500 text-white border-amber-500"
                : "bg-green-500 text-white border-green-500"
              : "bg-muted text-muted-foreground border-border hover:border-foreground/30"
          }`}
        >
          {r.charAt(0).toUpperCase() + r.slice(1)}
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
  const [activeTab, setActiveTab] = useState("1_month");

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

  const currentReview = managerReviews[0];

  const [goingWell, setGoingWell] = useState("");
  const [developmentAreas, setDevelopmentAreas] = useState("");
  const [reviewDate, setReviewDate] = useState("");
  const [localManagerRatings, setLocalManagerRatings] = useState<Record<number, string>>({});
  const [localManagerComments, setLocalManagerComments] = useState<Record<number, string>>({});

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
    toast({ title: "Review published", description: "The employee can now see this review." });
  };

  const isPublished = !!currentReview?.publishedAt;
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
      <header className="bg-sidebar text-sidebar-foreground px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate("/team")}
          className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold truncate">{employee.name}</h1>
          <p className="text-xs text-sidebar-foreground/60">{employee.jobTitle ?? "Probation Review"}</p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleSave}
            disabled={isSaving || !userId}
            className="gap-1.5"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Draft
          </Button>
          <Button
            size="sm"
            onClick={handlePublish}
            disabled={isPublishing || !userId}
            className="gap-1.5"
          >
            {isPublishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {isPublished ? "Re-publish" : "Publish"}
          </Button>
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
            <TabsContent key={period.value} value={period.value} className="space-y-6 pb-24">
              {/* Published status + Date */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isPublished ? (
                    <div className="flex items-center gap-1.5 text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium">
                        Published {new Date(currentReview!.publishedAt!).toLocaleDateString("en-GB")}
                      </span>
                    </div>
                  ) : (
                    <Badge variant="secondary" className="font-normal">Draft</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">Date of Review:</label>
                  <input
                    type="date"
                    value={reviewDate}
                    onChange={(e) => setReviewDate(e.target.value)}
                    className="text-xs border border-border rounded px-2 py-1 bg-background text-foreground"
                  />
                </div>
              </div>

              {/* Assessments table */}
              {!userId ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      No employee data available.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Side-by-side items */}
                  {sections.map((section) => {
                    const sectionItems = items.filter((i) => i.section === section);
                    return (
                      <Card key={section}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-semibold">{section}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                          <div className="grid grid-cols-[1fr_1fr_1fr] text-xs font-medium text-muted-foreground border-b border-border bg-muted/30">
                            <div className="px-4 py-2">Objective</div>
                            <div className="px-4 py-2 border-l border-border">
                              Employee
                            </div>
                            <div className="px-4 py-2 border-l border-border">
                              Manager
                            </div>
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
                                  <RatingBadge rating={assessment?.rating} />
                                  {assessment?.note && (
                                    <p className="text-xs text-muted-foreground">{assessment.note}</p>
                                  )}
                                </div>
                                <div className="px-4 py-3 border-l border-border space-y-2">
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
                                </div>
                              </div>
                            );
                          })}
                        </CardContent>
                      </Card>
                    );
                  })}

                  {/* Manager summary */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold">Manager Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                          What's going well
                        </label>
                        <Textarea
                          placeholder="Areas where the employee is performing well…"
                          value={goingWell}
                          onChange={(e) => setGoingWell(e.target.value)}
                          rows={3}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                          Development areas
                        </label>
                        <Textarea
                          placeholder="Areas for improvement or focus…"
                          value={developmentAreas}
                          onChange={(e) => setDevelopmentAreas(e.target.value)}
                          rows={3}
                          className="text-sm"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-6 py-3 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            {isPublished
              ? `Published ${new Date(currentReview!.publishedAt!).toLocaleDateString("en-GB")} — employee can see this review`
              : "Save as draft or publish to share with the employee."}
          </p>
          <div className="flex gap-2 shrink-0">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleSave}
              disabled={isSaving || !userId}
              className="gap-1.5"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Draft
            </Button>
            <Button
              size="sm"
              onClick={handlePublish}
              disabled={isPublishing || !userId}
              className="gap-1.5"
            >
              {isPublishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {isPublished ? "Re-publish" : "Publish"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
