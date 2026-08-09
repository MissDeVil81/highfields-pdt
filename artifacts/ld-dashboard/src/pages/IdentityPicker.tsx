import { useLocation } from "wouter";
import { useListUsers } from "@workspace/api-client-react";
import { useLdStore } from "@/hooks/useLdStore";
import { ChevronRight, Loader2 } from "lucide-react";
import { useEffect } from "react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function IdentityPicker() {
  const [, navigate] = useLocation();
  const { ldUser, setLdUser } = useLdStore();
  const { data: users = [], isLoading } = useListUsers();

  useEffect(() => {
    if (ldUser) navigate("/home");
  }, [ldUser]);

  const ldUsers = users.filter((u) => u.roles?.includes("ld"));

  const handleSelect = async (id: number, name: string) => {
    try {
      await fetch(`${BASE}/api/manager-ld/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: id }),
      });
    } catch { /* non-blocking */ }
    setLdUser({ id, name });
    navigate("/home");
  };

  return (
    <div className="min-h-screen bg-sidebar flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-5"
          style={{ background: "radial-gradient(circle, #F5C346 0%, transparent 70%)" }} />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full opacity-5"
          style={{ background: "radial-gradient(circle, #F5C346 0%, transparent 70%)" }} />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-sidebar-primary/15 mb-5">
            <svg className="h-7 w-7 text-sidebar-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <p className="text-xs font-semibold tracking-widest uppercase text-sidebar-primary mb-1.5">
            Highfield Professional Solutions
          </p>
          <h1 className="font-script text-4xl text-sidebar-primary leading-none mb-1">L&amp;D Dashboard</h1>
          <p className="text-sm text-sidebar-foreground/50 mt-1">Learning &amp; Development portal</p>
        </div>

        <div className="bg-card border border-sidebar-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-base font-semibold text-foreground">Who are you?</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Select your name to continue</p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : ldUsers.length === 0 ? (
            <div className="text-center py-10 px-6">
              <p className="text-sm text-muted-foreground">No L&amp;D users found.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Ask your administrator to assign the L&amp;D role.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {ldUsers.map((user) => (
                <li key={user.id}>
                  <button
                    onClick={() => handleSelect(user.id, user.name)}
                    className="w-full flex items-center gap-3.5 px-5 py-3.5 hover:bg-muted/50 transition-colors text-left group"
                  >
                    <div className="flex-shrink-0 h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-semibold text-primary">{getInitials(user.name)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                      {user.jobTitle && <p className="text-xs text-muted-foreground mt-0.5 truncate">{user.jobTitle}</p>}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-center text-xs text-sidebar-foreground/30 mt-5">
          Contact your administrator if you don't see your name.
        </p>
      </div>
    </div>
  );
}
