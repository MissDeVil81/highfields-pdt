import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useLdStore } from "@/hooks/useLdStore";
import { Layout } from "@/components/Layout";
import { cn } from "@/lib/utils";
import {
  matchesLearningFilters,
  type LearningFilters,
} from "@/lib/learningDateFilter";
import {
  ArrowLeft,
  BookOpen,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Loader2,
  MessageSquare,
  Search,
} from "lucide-react";

type Employee = {
  id: number;
  name: string;
  jobTitle: string | null;
};

type LearningEntry = {
  id: number;
  dateOfLearning: string;
  training: string;
  deliveredBy: string;
  whatDidILearn: string;
  furtherTrainingNeeded: string;
  createdAt: string;
};

type CompanyLearningEntry = {
  id: number;
  title: string;
  dateOfLearning: string;
  trainer: string;
  description: string;
  createdAt: string;
};

type LdFeedbackEntry = {
  id: number;
  userId: number;
  title?: string;
  authorName: string;
  content: string;
  feedbackDate: string;
  createdAt: string;
};

const TABS = [
  { key: "company-learning", label: "Company Learning", icon: Building2 },
  { key: "individual-learning", label: "Individual Learning", icon: BookOpen },
  { key: "ld-feedback", label: "L&D Feedback", icon: MessageSquare },
] as const;

type TabKey = typeof TABS[number]["key"];

function getInitials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").toUpperCase().slice(0, 2);
}

function LearningFiltersBar({
  filters,
  onChange,
  resultCount,
  totalCount,
}: {
  filters: LearningFilters;
  onChange: (filters: LearningFilters) => void;
  resultCount: number;
  totalCount: number;
}) {
  const hasFilters = !!filters.search || !!filters.fromDate || !!filters.toDate;

  return (
    <div className="mb-7 rounded-xl border border-border bg-card p-5">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px_220px] md:items-end">
        <div>
          <label htmlFor="employee-learning-search" className="mb-2 block text-sm font-semibold text-foreground">
            Search
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="employee-learning-search"
              type="search"
              value={filters.search}
              onChange={event => onChange({ ...filters, search: event.target.value })}
              placeholder="Search by keyword, trainer or topic"
              className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        <div>
          <label htmlFor="employee-learning-from" className="mb-2 block text-sm font-semibold text-foreground">
            From
          </label>
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="employee-learning-from"
              type="date"
              value={filters.fromDate}
              onChange={event => onChange({ ...filters, fromDate: event.target.value })}
              className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        <div>
          <label htmlFor="employee-learning-to" className="mb-2 block text-sm font-semibold text-foreground">
            To
          </label>
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="employee-learning-to"
              type="date"
              value={filters.toDate}
              onChange={event => onChange({ ...filters, toDate: event.target.value })}
              className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {hasFilters && (
        <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>Showing {resultCount} of {totalCount}</span>
          <button
            type="button"
            onClick={() => onChange({ search: "", fromDate: "", toDate: "" })}
            className="font-medium text-primary hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}

function ExpandableCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <button
        type="button"
        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-accent/40"
        onClick={() => setExpanded(value => !value)}
        aria-expanded={expanded}
      >
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        </div>
        {expanded
          ? <ChevronUp className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          : <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />}
      </button>
      {expanded && children && (
        <div className="space-y-4 border-t border-border px-5 pb-5 pt-4">
          {children}
        </div>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-14">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function EmployeeLearning() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const rawEmployeeId = params.id ?? "";
  const employeeId = /^[1-9]\d*$/.test(rawEmployeeId) ? Number(rawEmployeeId) : null;
  const hasEmployeeId = employeeId !== null && Number.isSafeInteger(employeeId);
  const { ldUser } = useLdStore();
  const [activeTab, setActiveTab] = useState<TabKey>("company-learning");
  const [filters, setFilters] = useState<LearningFilters>({
    search: "",
    fromDate: "",
    toDate: "",
  });

  const whatsNewQuery = useQuery<any[]>({
    queryKey: ["ld-whats-new", ldUser?.id],
    queryFn: async () => {
      if (!ldUser) return [];
      const response = await fetch(`/api/manager-ld/whats-new-all?ldUserId=${ldUser.id}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!ldUser,
  });

  const employeesQuery = useQuery<Employee[]>({
    queryKey: ["ld-all-employees"],
    queryFn: async () => {
      const response = await fetch("/api/manager-ld/all-employees");
      if (!response.ok) throw new Error("Failed to load employee details");
      return response.json();
    },
    enabled: !!ldUser,
  });

  const companyLearningQuery = useQuery<CompanyLearningEntry[]>({
    queryKey: ["company-learning", employeeId],
    queryFn: async () => {
      const response = await fetch(`/api/company-learning?userId=${employeeId}`);
      if (!response.ok) throw new Error("Failed to load company learning");
      return response.json();
    },
    enabled: !!ldUser && hasEmployeeId && !!employeesQuery.data?.some(item => item.id === employeeId),
  });

  const individualLearningQuery = useQuery<LearningEntry[]>({
    queryKey: ["learning-log", employeeId],
    queryFn: async () => {
      const response = await fetch(`/api/learning-log?userId=${employeeId}`);
      if (!response.ok) throw new Error("Failed to load individual learning");
      return response.json();
    },
    enabled: !!ldUser && hasEmployeeId && !!employeesQuery.data?.some(item => item.id === employeeId),
  });

  const feedbackQuery = useQuery<LdFeedbackEntry[]>({
    queryKey: ["ld-feedback", employeeId],
    queryFn: async () => {
      const response = await fetch(`/api/ld-feedback?userId=${employeeId}`);
      if (!response.ok) throw new Error("Failed to load L&D feedback");
      return response.json();
    },
    enabled: !!ldUser && hasEmployeeId && !!employeesQuery.data?.some(item => item.id === employeeId),
  });

  if (!ldUser) {
    navigate("/");
    return null;
  }

  const employee = employeesQuery.data?.find(item => item.id === employeeId);
  const invalidEmployee = !hasEmployeeId || (
    !employeesQuery.isLoading &&
    !employeesQuery.isError &&
    !employee
  );

  if (invalidEmployee || employeesQuery.isError) {
    return (
      <Layout whatsNewCount={whatsNewQuery.data?.length ?? 0}>
        <div className="mx-auto max-w-5xl px-8 py-10">
          <button
            type="button"
            onClick={() => navigate("/home")}
            className="mb-6 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to all employees
          </button>
          <EmptyState message={
            employeesQuery.isError
              ? "Employee details could not be loaded. Please try again."
              : "This employee could not be found."
          } />
        </div>
      </Layout>
    );
  }

  if (employeesQuery.isLoading || !employee) {
    return (
      <Layout whatsNewCount={whatsNewQuery.data?.length ?? 0}>
        <LoadingState />
      </Layout>
    );
  }

  const name = employee?.name ?? "Employee";
  const companyEntries = companyLearningQuery.data ?? [];
  const individualEntries = individualLearningQuery.data ?? [];
  const feedbackEntries = feedbackQuery.data ?? [];

  const filteredCompanyEntries = companyEntries.filter(entry =>
    matchesLearningFilters(
      filters,
      [entry.title, entry.trainer, entry.description, entry.dateOfLearning].join(" "),
      entry.dateOfLearning,
    )
  );
  const filteredIndividualEntries = individualEntries.filter(entry =>
    matchesLearningFilters(
      filters,
      [entry.training, entry.deliveredBy, entry.whatDidILearn, entry.furtherTrainingNeeded, entry.dateOfLearning].join(" "),
      entry.dateOfLearning,
    )
  );
  const filteredFeedbackEntries = feedbackEntries.filter(entry =>
    matchesLearningFilters(
      filters,
      [entry.title ?? "", entry.authorName, entry.content, entry.feedbackDate].join(" "),
      entry.feedbackDate || entry.createdAt,
    )
  );

  const activeResultCount = activeTab === "company-learning"
    ? filteredCompanyEntries.length
    : activeTab === "individual-learning"
      ? filteredIndividualEntries.length
      : filteredFeedbackEntries.length;
  const activeTotalCount = activeTab === "company-learning"
    ? companyEntries.length
    : activeTab === "individual-learning"
      ? individualEntries.length
      : feedbackEntries.length;
  const activeDescription = activeTab === "ld-feedback"
    ? `Search through all feedback for ${name}.`
    : `Search through all training for ${name}.`;
  const activeLoading = activeTab === "company-learning"
    ? companyLearningQuery.isLoading
    : activeTab === "individual-learning"
      ? individualLearningQuery.isLoading
      : feedbackQuery.isLoading;

  return (
    <Layout whatsNewCount={whatsNewQuery.data?.length ?? 0}>
      <div className="mx-auto max-w-5xl px-8 py-10">
        <button
          type="button"
          onClick={() => navigate("/home")}
          className="mb-6 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to all employees
        </button>

        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
            <span className="text-base font-bold text-primary">{getInitials(name)}</span>
          </div>
          <div>
            <h2 className="font-script text-4xl leading-tight text-foreground">{name}</h2>
            {employee?.jobTitle && (
              <p className="mt-0.5 text-sm text-muted-foreground">{employee.jobTitle}</p>
            )}
          </div>
        </div>

        <p className="mb-3 text-sm text-muted-foreground">{activeDescription}</p>
        <LearningFiltersBar
          filters={filters}
          onChange={setFilters}
          resultCount={activeResultCount}
          totalCount={activeTotalCount}
        />

        <div className="mb-7 flex gap-1 overflow-x-auto border-b border-border">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={cn(
                "-mb-px flex whitespace-nowrap items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                activeTab === key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {activeLoading ? (
          <LoadingState />
        ) : activeTab === "company-learning" ? (
          <div className="space-y-3">
            <p className="pb-1 text-sm text-muted-foreground">
              Company-wide training and development sessions managed by the L&amp;D team.
            </p>
            {filteredCompanyEntries.length === 0 ? (
              <EmptyState
                message={companyEntries.length === 0
                  ? "No company learning sessions have been recorded for this employee."
                  : "No company learning sessions match your search or date range."}
              />
            ) : (
              filteredCompanyEntries.map(entry => (
                <ExpandableCard
                  key={entry.id}
                  title={entry.title}
                  subtitle={`${entry.dateOfLearning} · ${entry.trainer}`}
                >
                  {entry.description && (
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        About this session
                      </p>
                      <p className="whitespace-pre-wrap text-sm text-foreground">{entry.description}</p>
                    </div>
                  )}
                </ExpandableCard>
              ))
            )}
          </div>
        ) : activeTab === "individual-learning" ? (
          <div className="space-y-3">
            <p className="pb-1 text-sm text-muted-foreground">
              Training and self-directed learning recorded by {name}.
            </p>
            {filteredIndividualEntries.length === 0 ? (
              <EmptyState
                message={individualEntries.length === 0
                  ? "No individual learning entries have been recorded yet."
                  : "No individual learning entries match your search or date range."}
              />
            ) : (
              filteredIndividualEntries.map(entry => (
                <ExpandableCard
                  key={entry.id}
                  title={entry.training}
                  subtitle={`${entry.dateOfLearning} · ${entry.deliveredBy}`}
                >
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      What did they learn?
                    </p>
                    <p className="whitespace-pre-wrap text-sm text-foreground">{entry.whatDidILearn}</p>
                  </div>
                  {entry.furtherTrainingNeeded && (
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Further training needed
                      </p>
                      <p className="whitespace-pre-wrap text-sm text-foreground">{entry.furtherTrainingNeeded}</p>
                    </div>
                  )}
                </ExpandableCard>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="pb-1 text-sm text-muted-foreground">
              Feedback and development notes shared by the L&amp;D team.
            </p>
            {filteredFeedbackEntries.length === 0 ? (
              <EmptyState
                message={feedbackEntries.length === 0
                  ? "No L&D feedback has been recorded for this employee."
                  : "No L&D feedback matches your search or date range."}
              />
            ) : (
              filteredFeedbackEntries.map(entry => (
                <ExpandableCard
                  key={entry.id}
                  title={entry.title || `Note from ${entry.authorName}`}
                  subtitle={`${entry.feedbackDate || new Date(entry.createdAt).toLocaleDateString("en-GB")} · ${entry.authorName}`}
                >
                  <p className="whitespace-pre-wrap text-sm text-foreground">{entry.content}</p>
                </ExpandableCard>
              ))
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}