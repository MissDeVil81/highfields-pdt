import { useState, useEffect } from "react";
import { useSessionStore } from "@/lib/session";

interface ApiUser {
  id: number;
  name: string;
  email: string | null;
  roles: string[];
  jobTitle: string | null;
  department: string | null;
  probationStatus: string | null;
  targetRoleId: number | null;
}

// For users with a target role, pre-set their career path in the session.
// Key = targetRoleId; values tell the career tracker which current role and path to load.
const CAREER_OVERRIDES: Record<number, { currentRoleId: number; careerPathId: number }> = {
  58: { currentRoleId: 56, careerPathId: 1 }, // Senior RC Perm → current RC Perm, 360 path
  57: { currentRoleId: 55, careerPathId: 1 }, // Senior RC Contract → current RC Contract, 360 path
  43: { currentRoleId: 41, careerPathId: 2 }, // Senior RC Perm (180) → current RC Perm, 180 path
  44: { currentRoleId: 42, careerPathId: 2 }, // Senior RC Contract (180)
};

function getSubtitle(user: ApiUser): string {
  if (user.probationStatus === "in_progress") return "Probation in Progress";
  if (user.probationStatus === "passed") return "Probation Passed";
  if (user.targetRoleId) return "Working Towards Promotion";
  return user.jobTitle ?? "Employee";
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getHandoffUserId(): number | null {
  const rawUserId = new URLSearchParams(window.location.search).get("userId");
  if (!rawUserId || !/^[1-9]\d*$/.test(rawUserId)) return null;
  const userId = Number(rawUserId);
  return Number.isSafeInteger(userId) ? userId : null;
}

export default function IdentityGate({ children }: { children: React.ReactNode }) {
  const { userId, setUser, setCurrentRoleId, setTargetRoleId, setCareerPathId, setTargetCareerPathId } =
    useSessionStore();
  const [users, setUsers] = useState<ApiUser[]>([]);
  const handoffUserId = getHandoffUserId();
  const [loading, setLoading] = useState(true);
  const [handoffLoading, setHandoffLoading] = useState(handoffUserId !== null);

  function applyCareerDefaults(user: ApiUser) {
    if (user.targetRoleId) {
      const overrides = CAREER_OVERRIDES[user.targetRoleId];
      if (overrides) {
        setCurrentRoleId(overrides.currentRoleId);
        setTargetRoleId(user.targetRoleId);
        setCareerPathId(overrides.careerPathId);
        setTargetCareerPathId(overrides.careerPathId);
      } else {
        setTargetRoleId(user.targetRoleId);
      }
    }
  }

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data: ApiUser[]) => {
        setUsers(data.filter((u) => u.roles.includes("employee")));
        if (handoffUserId !== null) {
          const handoffUser = data.find((u) => u.id === handoffUserId);
          if (handoffUser && handoffUser.roles.includes("employee")) {
            if (userId !== handoffUser.id) {
              setCurrentRoleId(null);
              setTargetRoleId(null);
              setCareerPathId(null);
              setTargetCareerPathId(null);
            }
            setUser(handoffUser.id, handoffUser.name, handoffUser.email ?? "");
            applyCareerDefaults(handoffUser);
          }
        }
        setLoading(false);
        setHandoffLoading(false);
      })
      .catch(() => {
        setLoading(false);
        setHandoffLoading(false);
      });
  }, [handoffUserId]);

  if (handoffLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-5 w-5 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  if (userId) return <>{children}</>;

  function handleSelect(user: ApiUser) {
    if (userId !== user.id) {
      setCurrentRoleId(null);
      setTargetRoleId(null);
      setCareerPathId(null);
      setTargetCareerPathId(null);
    }
    setUser(user.id, user.name, user.email ?? "");
    applyCareerDefaults(user);
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 mb-4">
            <svg
              className="h-7 w-7 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Career Tracker</h1>
          <p className="text-sm text-muted-foreground mt-1">Highfield Professional Solutions</p>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-base font-semibold text-foreground">Who are you?</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Select your name to continue
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <svg
                className="h-5 w-5 animate-spin text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            </div>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10 px-5">
              No users found.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {users.map((user) => (
                <li key={user.id}>
                  <button
                    onClick={() => handleSelect(user)}
                    className="w-full flex items-center gap-3.5 px-5 py-3.5 hover:bg-muted/50 transition-colors text-left group"
                  >
                    <div className="flex-shrink-0 h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-semibold text-primary">
                        {getInitials(user.name)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{getSubtitle(user)}</p>
                    </div>
                    <svg
                      className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Contact your manager or HR if you don't see your name.
        </p>
      </div>
    </div>
  );
}
