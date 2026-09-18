import { Link, useLocation, useSearch } from "wouter";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/lib/session";
import { ChevronRight, LayoutDashboard, Briefcase, Target, BarChart3, ClipboardCheck, BookOpen, Users, ExternalLink } from "lucide-react";

interface NavItemProps {
  href: string;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
}

function NavItem({ href, label, icon, disabled }: NavItemProps) {
  const [location] = useLocation();
  const isActive = location === href || (href === "/setup" && location === "/");

  if (disabled) {
    return (
      <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/40 cursor-not-allowed select-none">
        {icon}
        <span>{label}</span>
      </div>
    );
  }

  return (
    <Link href={href}>
      <div className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors duration-150",
        isActive
          ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      )}>
        {icon}
        <span>{label}</span>
        {isActive && <ChevronRight className="ml-auto h-4 w-4 opacity-60" />}
      </div>
    </Link>
  );
}

const LEARNING_LOG_ITEMS = [
  { tab: "company-learning", label: "Company Learning" },
  { tab: "my-learning",      label: "My Learning" },
  { tab: "ld-feedback",      label: "L&D Feedback" },
];

function LearningLogNav() {
  const [location] = useLocation();
  const search = useSearch();
  const isLearning = location === "/learning-log";
  const activeTab = isLearning ? (new URLSearchParams(search).get("tab") ?? "my-learning") : null;

  return (
    <div>
      <div className="pt-2 pb-1">
        <p className="px-3 text-xs font-semibold text-sidebar-foreground/30 uppercase tracking-wider flex items-center gap-2">
          <BookOpen className="h-3.5 w-3.5" />
          My Learning Log
        </p>
      </div>
      <div className="space-y-0.5">
        {LEARNING_LOG_ITEMS.map(item => {
          const isActive = isLearning && activeTab === item.tab;
          return (
            <Link key={item.tab} href={`/learning-log?tab=${item.tab}`}>
              <div className={cn(
                "flex items-center gap-3 pl-6 pr-3 py-2 rounded-lg text-sm cursor-pointer transition-colors duration-150",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}>
                <span>{item.label}</span>
                {isActive && <ChevronRight className="ml-auto h-4 w-4 opacity-60" />}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

const PROBATION_ITEMS = [
  { tab: "overview", label: "Welcome" },
  { tab: "month1",   label: "Month 1" },
  { tab: "month3",   label: "Month 3" },
  { tab: "month5",   label: "Month 5" },
  { tab: "month6",   label: "Month 6" },
];

function ProbationNav() {
  const [location] = useLocation();
  const search = useSearch();
  const isProbation = location === "/probation";
  const activeTab = isProbation
    ? (new URLSearchParams(search).get("tab") ?? "overview")
    : null;

  return (
    <div>
      <div className="pt-2 pb-1">
        <p className="px-3 text-xs font-semibold text-sidebar-foreground/30 uppercase tracking-wider flex items-center gap-2">
          <ClipboardCheck className="h-3.5 w-3.5" />
          New Starters
        </p>
      </div>
      <div className="space-y-0.5">
        {PROBATION_ITEMS.map(item => {
          const isActive = isProbation && activeTab === item.tab;
          return (
            <Link key={item.tab} href={`/probation?tab=${item.tab}`}>
              <div className={cn(
                "flex items-center gap-3 pl-6 pr-3 py-2 rounded-lg text-sm cursor-pointer transition-colors duration-150",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}>
                <span>{item.label}</span>
                {isActive && <ChevronRight className="ml-auto h-4 w-4 opacity-60" />}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function hasMatchingManagerIdentity(userId: number | null) {
  if (userId == null) return false;
  try {
    const stored = localStorage.getItem("manager_identity");
    if (!stored) return false;
    const manager = JSON.parse(stored) as { id?: number };
    return manager.id === userId;
  } catch {
    return false;
  }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { currentRoleId, userId, returnToManagerDashboard } = useSessionStore();
  const showManagerDashboardLink =
    returnToManagerDashboard || hasMatchingManagerIdentity(userId);
  const managerDashboardUrl = `${window.location.origin}/manager/home`;

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 bg-sidebar text-sidebar-foreground flex flex-col">
        <div className="px-4 py-5 border-b border-sidebar-border">
          <h1 className="font-script text-2xl text-sidebar-primary leading-tight">Career Progression</h1>
          <p className="text-xs text-sidebar-foreground/50 mt-0.5">Your path to promotion</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          <ProbationNav />
          <div>
            <div className="pt-2 pb-1">
              <p className="px-3 text-xs font-semibold text-sidebar-foreground/30 uppercase tracking-wider flex items-center gap-2">
                <BarChart3 className="h-3.5 w-3.5" />
                Performance
              </p>
            </div>
            <div className="space-y-0.5">
              <NavItem href="/setup" label="Setup" icon={<LayoutDashboard className="h-4 w-4" />} />
              <NavItem
                href="/current-role"
                label="Current Role"
                icon={<Briefcase className="h-4 w-4" />}
                disabled={!currentRoleId}
              />
              <NavItem
                href="/target-role"
                label="Target Role"
                icon={<Target className="h-4 w-4" />}
                disabled={!currentRoleId}
              />
              <NavItem
                href="/summary"
                label="Readiness Summary"
                icon={<BarChart3 className="h-4 w-4" />}
                disabled={!currentRoleId}
              />
            </div>
          </div>
          <LearningLogNav />
        </nav>
        {showManagerDashboardLink && (
          <div className="px-3 pb-3 border-t border-sidebar-border pt-3">
            <a
              href={managerDashboardUrl}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-sidebar-primary/60 bg-sidebar-primary text-sidebar-primary-foreground text-xs font-semibold shadow-sm hover:brightness-110 transition-all"
            >
              <Users className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1 whitespace-nowrap">Manager Dashboard</span>
              <ExternalLink className="h-3.5 w-3.5 opacity-80 flex-shrink-0" />
            </a>
          </div>
        )}
        <div className="px-4 py-4 border-t border-sidebar-border">
          <p className="text-xs text-sidebar-foreground/40 leading-relaxed">
            Rate your competencies and track evidence to prepare for your next role.
          </p>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-background">
        {children}
      </main>
    </div>
  );
}
