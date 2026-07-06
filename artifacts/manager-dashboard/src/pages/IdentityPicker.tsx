import { useLocation } from "wouter";
import { useListUsers } from "@workspace/api-client-react";
import { useManagerStore } from "@/hooks/useManagerStore";
import { ChevronRight, Loader2 } from "lucide-react";
import { useEffect } from "react";

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function IdentityPicker() {
  const [, navigate] = useLocation();
  const { manager, setManager } = useManagerStore();
  const { data: users = [], isLoading } = useListUsers();

  useEffect(() => {
    if (manager) navigate("/home");
  }, [manager]);

  const managers = users.filter((u) => u.roles?.includes("manager"));

  const handleSelect = (id: number, name: string) => {
    setManager({ id, name });
    navigate("/home");
  };

  return (
    <div className="min-h-screen bg-sidebar flex items-center justify-center px-4 relative overflow-hidden">

      {/* Subtle background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-5"
          style={{ background: "radial-gradient(circle, #F5C346 0%, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full opacity-5"
          style={{ background: "radial-gradient(circle, #F5C346 0%, transparent 70%)" }}
        />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-sidebar-primary/15 mb-5">
            <svg className="h-7 w-7 text-sidebar-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-xs font-semibold tracking-widest uppercase text-sidebar-primary mb-1.5">
            Highfield Professional Solutions
          </p>
          <h1 className="font-script text-4xl text-sidebar-primary leading-none mb-1">Manager Dashboard</h1>
          <p className="text-sm text-sidebar-foreground/50 mt-1">
            Track your team's probation progress
          </p>
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
          ) : managers.length === 0 ? (
            <div className="text-center py-10 px-6">
              <p className="text-sm text-muted-foreground">No managers found.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {managers.map((user) => (
                <li key={user.id}>
                  <button
                    onClick={() => handleSelect(user.id, user.name)}
                    className="w-full flex items-center gap-3.5 px-5 py-3.5 hover:bg-muted/50 transition-colors text-left group"
                  >
                    <div className="flex-shrink-0 h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-semibold text-primary">
                        {getInitials(user.name)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                      {user.jobTitle && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{user.jobTitle}</p>
                      )}
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
