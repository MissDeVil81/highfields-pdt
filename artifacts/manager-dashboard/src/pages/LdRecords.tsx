import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useManagerStore } from "@/hooks/useManagerStore";
import { Layout } from "@/components/Layout";
import { useWhatsNewCount } from "@/hooks/useWhatsNewCount";
import {
  Users, BookOpen, Clock, ChevronRight, Loader2, Sparkles, Check, ChevronDown, ChevronUp, X
} from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type TeamMember = {
  id: number;
  name: string;
  jobTitle: string | null;
  entryCount: number;
  lastEntry: string | null;
};

type Team = { id: number; name: string };

type WhatsNewEntry = {
  id: number;
  userId: number;
  training: string;
  dateOfLearning: string;
  deliveredBy: string;
  whatDidILearn: string;
  furtherTrainingNeeded: string;
  createdAt: string;
  employeeName: string;
  employeeJobTitle: string | null;
};

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatDate(dt: string | null) {
  if (!dt) return "Never";
  return new Date(dt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function MemberCard({ member, onClick }: { member: TeamMember; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-card border border-border rounded-xl p-4 text-left hover:border-primary/40 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-primary">{getInitials(member.name)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-sm text-foreground truncate">{member.name}</p>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
          </div>
          {member.jobTitle && <p className="text-xs text-muted-foreground mt-0.5">{member.jobTitle}</p>}
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <BookOpen className="h-3.5 w-3.5" />
              <span>{member.entryCount} {member.entryCount === 1 ? "entry" : "entries"}</span>
            </div>
            {member.lastEntry && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>Last: {formatDate(member.lastEntry)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function WhatsNewEntry({ entry, managerId, onViewed }: {
  entry: WhatsNewEntry;
  managerId: number;
  onViewed: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const queryClient = useQueryClient();

  const markViewed = useMutation({
    mutationFn: async () => {
      await fetch(`${BASE}/api/manager-ld/viewed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ managerId, entryId: entry.id }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whats-new", managerId] });
      onViewed();
    },
  });

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-start gap-3 px-5 py-4">
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-xs font-bold text-primary">{getInitials(entry.employeeName)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-sm text-foreground">{entry.training}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {entry.employeeName}
                {entry.employeeJobTitle ? ` · ${entry.employeeJobTitle}` : ""}
                {" · "}
                {entry.dateOfLearning}
              </p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => setExpanded(v => !v)}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
              >
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              <button
                onClick={() => markViewed.mutate()}
                disabled={markViewed.isPending}
                title="Mark as viewed"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-green-600 hover:bg-green-50 transition-colors"
              >
                <Check className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
      {expanded && (
        <div className="px-5 pb-4 space-y-3 border-t border-border pt-3 ml-11">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">What did they learn?</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{entry.whatDidILearn}</p>
          </div>
          {entry.furtherTrainingNeeded && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Further training needed</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{entry.furtherTrainingNeeded}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TeamOverview({ manager }: { manager: NonNullable<ReturnType<typeof useManagerStore>["manager"]> }) {
  const [, navigate] = useLocation();
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(manager.selectedTeamId ?? null);
  const [selectedTeamName, setSelectedTeamName] = useState<string | null>(manager.selectedTeamName ?? null);
  const { setSelectedTeam } = useManagerStore();

  const isDirector = manager.role === "director";

  const { data: teams = [], isLoading: teamsLoading } = useQuery<Team[]>({
    queryKey: ["user-teams", manager.id],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/manager-ld/user-teams?userId=${manager.id}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isDirector,
  });

  const teamId = isDirector ? selectedTeamId : null;

  const { data: members = [], isLoading } = useQuery<TeamMember[]>({
    queryKey: isDirector ? ["team-by-team", teamId] : ["team-members", manager.id],
    queryFn: async () => {
      if (isDirector) {
        if (!teamId) return [];
        const res = await fetch(`${BASE}/api/manager-ld/team-by-team?teamId=${teamId}&directorId=${manager.id}`);
        if (!res.ok) return [];
        return res.json();
      } else {
        const res = await fetch(`${BASE}/api/manager-ld/team-members?managerId=${manager.id}`);
        if (!res.ok) return [];
        return res.json();
      }
    },
    enabled: isDirector ? !!teamId : true,
  });

  // For directors with 1 team, auto-select
  if (isDirector && !teamsLoading && teams.length === 1 && !selectedTeamId) {
    setSelectedTeamId(teams[0].id);
    setSelectedTeamName(teams[0].name);
    setSelectedTeam(teams[0].id, teams[0].name);
  }

  const handleSelectTeam = (team: Team) => {
    setSelectedTeamId(team.id);
    setSelectedTeamName(team.name);
    setSelectedTeam(team.id, team.name);
  };

  // Director: show team selector if multiple teams and none selected
  if (isDirector && !teamsLoading && teams.length > 1 && !selectedTeamId) {
    return (
      <div>
        <h3 className="font-semibold text-base text-foreground mb-4">Select a team to view</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {teams.map(team => (
            <button
              key={team.id}
              onClick={() => handleSelectTeam(team)}
              className="bg-card border border-border rounded-xl p-5 text-left hover:border-primary/40 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">{team.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">View team's learning records</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto group-hover:text-foreground transition-colors" />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {isDirector && selectedTeamName && (
        <div className="flex items-center gap-2 mb-4">
          <p className="text-sm text-muted-foreground">Viewing team:</p>
          <span className="text-sm font-semibold text-foreground">{selectedTeamName}</span>
          {teams.length > 1 && (
            <button
              onClick={() => { setSelectedTeamId(null); setSelectedTeamName(null); setSelectedTeam(null, null); }}
              className="ml-1 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <X className="h-3 w-3" /> Change
            </button>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : members.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground text-sm">
          No team members found.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {members.map(member => (
            <MemberCard
              key={member.id}
              member={member}
              onClick={() => navigate(`/ld-records/employee/${member.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function WhatsNew({ manager }: { manager: NonNullable<ReturnType<typeof useManagerStore>["manager"]> }) {
  const queryClient = useQueryClient();

  const { data: entries = [], isLoading } = useQuery<WhatsNewEntry[]>({
    queryKey: ["whats-new", manager.id],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/manager-ld/whats-new?managerId=${manager.id}`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center">
        <Sparkles className="h-7 w-7 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm font-medium text-foreground">You're all caught up</p>
        <p className="text-xs text-muted-foreground mt-1">No new training records since your last login.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {entries.length} new training {entries.length === 1 ? "record" : "records"} since your last login. Click the ✓ to dismiss.
      </p>
      {entries.map(entry => (
        <WhatsNewEntry
          key={entry.id}
          entry={entry}
          managerId={manager.id}
          onViewed={() => queryClient.invalidateQueries({ queryKey: ["whats-new", manager.id] })}
        />
      ))}
    </div>
  );
}

export default function LdRecords() {
  const [location, navigate] = useLocation();
  const { manager } = useManagerStore();
  const whatsNewCount = useWhatsNewCount();

  if (!manager) { navigate("/"); return null; }

  const isWhatsNew = location === "/ld-records/whats-new";

  return (
    <Layout whatsNewCount={whatsNewCount}>
      <div className="max-w-5xl mx-auto px-8 py-10">
        <div className="mb-8">
          <h2 className="font-script text-4xl text-foreground">L&amp;D Records</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            View your team's learning and development activity.
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mb-6 border-b border-border">
          <button
            onClick={() => navigate("/ld-records")}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
              !isWhatsNew
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Users className="h-4 w-4" />
            Team Overview
          </button>
          <button
            onClick={() => navigate("/ld-records/whats-new")}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
              isWhatsNew
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Sparkles className="h-4 w-4" />
            What's New
            {whatsNewCount > 0 && (
              <span className="text-xs font-semibold bg-primary/15 text-primary rounded-full px-1.5 py-0.5 leading-none">
                {whatsNewCount}
              </span>
            )}
          </button>
        </div>

        {isWhatsNew
          ? <WhatsNew manager={manager} />
          : <TeamOverview manager={manager} />
        }
      </div>
    </Layout>
  );
}
