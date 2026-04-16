import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Compass, User, Target, BarChart2 } from "lucide-react";
import { useSessionStore } from "@/lib/session";

export function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { currentRoleId, targetRoleId } = useSessionStore();

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
      </aside>
      
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-6 md:p-12">
          {children}
        </div>
      </main>
    </div>
  );
}
