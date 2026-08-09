import { useLocation } from "wouter";
import { useManagerStore } from "@/hooks/useManagerStore";
import {
  ClipboardCheck,
  TrendingUp,
  BookOpen,
  Users,
  Sparkles,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EnvironmentBanner } from "./EnvironmentBanner";

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function NavItem({
  href,
  label,
  icon,
  badge,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}) {
  const [location, navigate] = useLocation();
  const isActive = location === href;

  return (
    <button
      onClick={() => navigate(href)}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors duration-150 text-left",
        isActive
          ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      )}
    >
      <span className={cn("flex-shrink-0", isActive ? "opacity-100" : "opacity-60")}>{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {badge != null && badge > 0 && (
        <span className={cn(
          "text-xs font-semibold rounded-full px-1.5 py-0.5 leading-none",
          isActive ? "bg-white/20 text-white" : "bg-sidebar-primary/15 text-sidebar-primary"
        )}>
          {badge}
        </span>
      )}
      {isActive && <ChevronRight className="h-3.5 w-3.5 opacity-60 flex-shrink-0" />}
    </button>
  );
}

function SubNavItem({ href, label }: { href: string; label: string }) {
  const [location, navigate] = useLocation();
  // For tab-based sub-nav, check both path and query
  const fullPath = window.location.pathname + window.location.search;
  const isActive = fullPath.replace(/^\/manager/, "") === href || location === href;

  return (
    <button
      onClick={() => navigate(href)}
      className={cn(
        "w-full flex items-center gap-3 pl-8 pr-3 py-2 rounded-lg text-sm transition-colors duration-150 text-left",
        isActive
          ? "bg-sidebar-primary/80 text-sidebar-primary-foreground font-medium"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      )}
    >
      <span className="flex-1 truncate">{label}</span>
      {isActive && <ChevronRight className="h-3.5 w-3.5 opacity-60 flex-shrink-0" />}
    </button>
  );
}

function SectionLabel({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <div className="pt-2 pb-1 flex items-center gap-2 px-3">
      <span className="opacity-40 flex-shrink-0">{icon}</span>
      <p className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider">
        {label}
      </p>
    </div>
  );
}

interface LayoutProps {
  children: React.ReactNode;
  whatsNewCount?: number;
}

export function Layout({ children, whatsNewCount }: LayoutProps) {
  const [, navigate] = useLocation();
  const { manager, clearManager } = useManagerStore();

  const handleLogout = () => {
    clearManager();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex bg-background">
      <EnvironmentBanner />

      {/* Sidebar */}
      <aside className="w-60 shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-sidebar-border">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-sidebar-primary/60 mb-0.5">
            Highfield Professional Solutions
          </p>
          <h1 className="font-script text-xl text-sidebar-primary leading-tight">Manager Dashboard</h1>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">

          {/* Probation */}
          <SectionLabel label="Probation" icon={<ClipboardCheck className="h-3.5 w-3.5" />} />
          <NavItem href="/home" label="My Team" icon={<Users className="h-4 w-4" />} />

          {/* Personal Development */}
          <SectionLabel label="Personal Development" icon={<TrendingUp className="h-3.5 w-3.5" />} />
          <NavItem href="/development" label="Development Plans" icon={<TrendingUp className="h-4 w-4" />} />

          {/* L&D Records */}
          <SectionLabel label="L&D Records" icon={<BookOpen className="h-3.5 w-3.5" />} />
          <NavItem href="/ld-records" label="Team Overview" icon={<Users className="h-4 w-4" />} />
          <NavItem
            href="/ld-records/whats-new"
            label="What's New"
            icon={<Sparkles className="h-4 w-4" />}
            badge={whatsNewCount}
          />
        </nav>

        {/* User */}
        {manager && (
          <div className="px-3 py-4 border-t border-sidebar-border">
            <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
              <div className="h-7 w-7 rounded-full bg-sidebar-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] font-bold text-sidebar-primary">{getInitials(manager.name)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-sidebar-foreground truncate">{manager.name}</p>
                <p className="text-[10px] text-sidebar-foreground/40 capitalize">{manager.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-md hover:bg-white/10 text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
                title="Switch user"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
