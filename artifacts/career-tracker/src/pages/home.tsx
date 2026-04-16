import { useListCareerPaths, useListRoles } from "@workspace/api-client-react";
import { useSessionStore } from "@/lib/session";
import { useLocation } from "wouter";
import { ChevronRight, Briefcase, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Home() {
  const [, navigate] = useLocation();
  const { careerPathId, currentRoleId, setCareerPathId, setCurrentRoleId, setTargetRoleId } = useSessionStore();

  const { data: careerPaths, isLoading: pathsLoading } = useListCareerPaths();
  const { data: roles, isLoading: rolesLoading } = useListRoles(
    { careerPathId: careerPathId ?? undefined },
    { query: { enabled: !!careerPathId } }
  );

  function handleSelectPath(id: number) {
    if (id !== careerPathId) {
      setCareerPathId(id);
      setCurrentRoleId(null);
      setTargetRoleId(null);
    }
  }

  function handleSelectRole(id: number) {
    setCurrentRoleId(id);
    setTargetRoleId(null);
  }

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground tracking-tight">Welcome</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Choose your career path and current role to get started with your promotion readiness assessment.
        </p>
      </div>

      {/* Step 1: Career Path */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">1</div>
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Select Career Path</h3>
        </div>
        {pathsLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : !careerPaths?.length ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-muted-foreground text-sm">
            No career paths configured yet. Please ask your administrator to set them up.
          </div>
        ) : (
          <div className="space-y-2">
            {careerPaths.map(path => (
              <button
                key={path.id}
                onClick={() => handleSelectPath(path.id)}
                className={cn(
                  "w-full text-left rounded-xl border p-4 transition-all duration-150 cursor-pointer",
                  careerPathId === path.id
                    ? "border-primary bg-accent shadow-sm"
                    : "border-border bg-card hover:border-primary/40 hover:bg-accent/50"
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-foreground text-sm">{path.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{path.description}</div>
                  </div>
                  {careerPathId === path.id && (
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
        )}
      </div>

      {/* Step 2: Current Role */}
      {careerPathId && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">2</div>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Select Your Current Role</h3>
          </div>
          {rolesLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : !roles?.length ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-muted-foreground text-sm">
              No roles found for this career path.
            </div>
          ) : (
            <div className="space-y-2">
              {roles.map(role => (
                <button
                  key={role.id}
                  onClick={() => handleSelectRole(role.id)}
                  className={cn(
                    "w-full text-left rounded-xl border p-4 transition-all duration-150 cursor-pointer",
                    currentRoleId === role.id
                      ? "border-primary bg-accent shadow-sm"
                      : "border-border bg-card hover:border-primary/40 hover:bg-accent/50"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted text-muted-foreground flex-shrink-0">
                        <Briefcase className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground text-sm">{role.title}</div>
                        <div className="text-xs text-muted-foreground">Level {role.level}</div>
                      </div>
                    </div>
                    {currentRoleId === role.id && (
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
          )}
        </div>
      )}

      {/* CTA */}
      {currentRoleId && (
        <button
          onClick={() => navigate("/current-role")}
          className="flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          Start Self-Assessment
          <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
