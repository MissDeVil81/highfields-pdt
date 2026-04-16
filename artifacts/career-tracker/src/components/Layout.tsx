import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/lib/session";
import { useClerk, useUser } from "@clerk/react";
import { ChevronRight, LayoutDashboard, Briefcase, Target, BarChart3, LogOut } from "lucide-react";

interface NavItemProps {
  href: string;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
}

function NavItem({ href, label, icon, disabled }: NavItemProps) {
  const [location] = useLocation();
  const isActive = location === href;

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

export default function Layout({ children }: { children: React.ReactNode }) {
  const { currentRoleId } = useSessionStore();
  const { signOut } = useClerk();
  const { user } = useUser();

  const displayName = user?.firstName
    ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
    : user?.primaryEmailAddress?.emailAddress ?? "You";

  const initials = user?.firstName
    ? `${user.firstName[0]}${user.lastName?.[0] ?? ""}`.toUpperCase()
    : (user?.primaryEmailAddress?.emailAddress?.[0] ?? "U").toUpperCase();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 bg-sidebar text-sidebar-foreground flex flex-col">
        <div className="px-4 py-5 border-b border-sidebar-border">
          <h1 className="text-base font-semibold text-sidebar-foreground tracking-tight">Career Progression</h1>
          <p className="text-xs text-sidebar-foreground/50 mt-0.5">Your path to promotion</p>
        </div>

        {/* User info */}
        <div className="px-4 py-3 border-b border-sidebar-border flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground text-xs font-bold shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-sidebar-foreground truncate">{displayName}</p>
            <p className="text-xs text-sidebar-foreground/40 truncate">
              {user?.primaryEmailAddress?.emailAddress}
            </p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
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
        </nav>

        <div className="px-3 py-3 border-t border-sidebar-border">
          <button
            onClick={() => signOut({ redirectUrl: "/" })}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-background">
        {children}
      </main>
    </div>
  );
}
