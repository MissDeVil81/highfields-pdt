import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Compass, User, Target, BarChart2, LogOut } from "lucide-react";
import { useSessionStore } from "@/lib/session";

export function Shell({ children }: { children: ReactNode }) {
  const [location, navigate] = useLocation();
  const { currentRoleId, targetRoleId, userName, clearUser } = useSessionStore();

  function handleSwitch() {
    clearUser();
    navigate("/setup");
  }

  const navItems = [
    { href: "/", label: "Path Selection", icon: Compass, exact: true },
    { 
      href: "/current-role", 
      label: "Current Role", 
      icon: User, 
      disabled: !currentRoleId 
    },
    { 
      href: "/target-role", 
      label: "Target Role", 
      icon: Target, 
      disabled: !currentRoleId 
    },
    { 
      href: "/summary", 
      label: "Readiness", 
      icon: BarChart2, 
      disabled: !currentRoleId || !targetRoleId 
    },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      <aside className="w-full md:w-64 border-r border-border bg-card p-6 flex flex-col gap-8">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">CareerTrack</h1>
          <p className="text-sm text-muted-foreground mt-1">Growth & Progression</p>
        </div>
        
        <nav className="flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive = item.exact ? location === item.href : location.startsWith(item.href);
            const Icon = item.icon;
            
            if (item.disabled) {
              return (
                <div key={item.href} className="flex items-center gap-3 px-3 py-2 rounded-md text-muted-foreground/50 cursor-not-allowed">
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
              );
            }
            
            return (
              <Link key={item.href} href={item.href}>
                <div className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer ${
                  isActive 
                    ? "bg-primary text-primary-foreground font-medium" 
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}>
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-4 border-t border-border">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-semibold text-primary">
                {userName?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
              </span>
            </div>
            <span className="text-sm font-medium text-foreground truncate">{userName}</span>
          </div>
          <button
            onClick={handleSwitch}
            className="flex items-center gap-2 w-full px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Switch user
          </button>
        </div>
      </aside>
      
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-6 md:p-12">
          {children}
        </div>
      </main>
    </div>
  );
}
