import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useLdStore } from "@/hooks/useLdStore";
import { Layout } from "@/components/Layout";
import { BookOpen, Clock, ChevronRight, Loader2, Search } from "lucide-react";
import { useState } from "react";
import {
  matchesEmploymentType,
  type EmploymentTypeFilter,
} from "@/lib/employmentTypeFilter";

type Employee = {
  id: number;
  name: string;
  jobTitle: string | null;
  department: string | null;
  recruitmentType: "contract" | "perm" | null;
  entryCount: number;
  lastEntry: string | null;
};

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatDate(dt: string | null) {
  if (!dt) return null;
  return new Date(dt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function useWhatsNewCount(ldUserId: number) {
  const { data = [] } = useQuery<any[]>({
    queryKey: ["ld-whats-new", ldUserId],
    queryFn: async () => {
      const res = await fetch(`/api/manager-ld/whats-new-all?ldUserId=${ldUserId}`);
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 60_000,
  });
  return data.length;
}

export default function AllEmployees() {
  const [, navigate] = useLocation();
  const { ldUser } = useLdStore();
  const [search, setSearch] = useState("");
  const [recruitmentTypeFilter, setRecruitmentTypeFilter] =
    useState<EmploymentTypeFilter>("all");

  if (!ldUser) { navigate("/"); return null; }

  const whatsNewCount = useWhatsNewCount(ldUser.id);

  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ["ld-all-employees"],
    queryFn: async () => {
      const res = await fetch(`/api/manager-ld/all-employees`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const filtered = employees.filter(e => {
    const matchesRecruitmentType = matchesEmploymentType(
      e.recruitmentType,
      recruitmentTypeFilter,
    );
    const query = search.toLowerCase();
    const matchesSearch =
      e.name.toLowerCase().includes(query) ||
      (e.department ?? "").toLowerCase().includes(query) ||
      (e.jobTitle ?? "").toLowerCase().includes(query) ||
      (e.recruitmentType ?? "").toLowerCase().includes(query);
    return matchesRecruitmentType && matchesSearch;
  });

  return (
    <Layout whatsNewCount={whatsNewCount}>
      <div className="max-w-5xl mx-auto px-8 py-10">
        <div className="mb-8">
          <h2 className="font-script text-4xl text-foreground">All Employees</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Browse learning records for all employees across the organisation.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-2xl font-bold tabular-nums">{employees.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total employees</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-2xl font-bold tabular-nums">
              {employees.filter(e => e.entryCount > 0).length}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Have learning entries</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-2xl font-bold tabular-nums">
              {employees.reduce((sum, e) => sum + e.entryCount, 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Total training entries</p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search by name, job title, department or recruitment type…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <select
            value={recruitmentTypeFilter}
            onChange={event =>
              setRecruitmentTypeFilter(event.target.value as EmploymentTypeFilter)
            }
            className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All recruitment types</option>
            <option value="perm">Perm</option>
            <option value="contract">Contract</option>
            <option value="unset">Not set</option>
          </select>
        </div>

        {/* Employee list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            {search ? "No employees match your search." : "No employees found."}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Name</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Job title</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Department</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Recruitment</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Entries</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Last entry</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(emp => (
                  <tr
                    key={emp.id}
                    className="hover:bg-muted/30 transition-colors cursor-pointer group"
                    onClick={() => navigate(`/employee/${emp.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-bold text-primary">{getInitials(emp.name)}</span>
                        </div>
                        <span className="text-sm font-medium text-foreground">{emp.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{emp.jobTitle ?? "—"}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{emp.department ?? "—"}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {emp.recruitmentType
                        ? emp.recruitmentType.charAt(0).toUpperCase() + emp.recruitmentType.slice(1)
                        : "Not set"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <BookOpen className="h-3.5 w-3.5" />
                        {emp.entryCount}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {emp.lastEntry ? (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          {formatDate(emp.lastEntry)}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">None yet</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
