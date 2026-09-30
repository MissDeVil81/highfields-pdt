import { Link, useLocation } from "wouter";
import { useAdmin } from "./AdminProvider";
import { UsersIcon, UsersRoundIcon, ShieldAlertIcon, NetworkIcon, LogOutIcon } from "lucide-react";
import { LiveBadge } from "./EnvironmentBanner";
import { useListUsers } from "@workspace/api-client-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReactNode } from "react";
import { getActiveAdminUsers } from "@/lib/userRoles";

export function AdminIdentityPicker() {
  const { setAdminUserId } = useAdmin();
  const { data: users, isLoading } = useListUsers();
  const admins = getActiveAdminUsers(users ?? []);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center pb-2">
          <ShieldAlertIcon className="h-10 w-10 mx-auto mb-2 text-primary" />
          <CardTitle className="text-xl">Admin Access</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Select your admin account to continue</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-center text-muted-foreground py-4 text-sm">Loading…</p>
          ) : admins.length === 0 ? (
            <p className="text-center text-muted-foreground py-4 text-sm">No admin users found. Please create an admin user first.</p>
          ) : (
            admins.map((u) => (
              <Button key={u.id} variant="outline" className="w-full justify-start h-11" onClick={() => setAdminUserId(u.id)}>
                <span className="font-medium">{u.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">{u.email ?? ""}</span>
              </Button>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function AdminLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { viewAsUserId, setViewAsUserId, adminUserId, setAdminUserId } = useAdmin();
  const { data: users } = useListUsers();

  const activeUsers = (users || []).filter(u => u.isActive === "active");
  const viewAsUser = activeUsers.find(u => u.id === viewAsUserId);
  const adminUser = activeUsers.find(u => u.id === adminUserId);

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="p-5 border-b border-sidebar-border">
          <h2 className="text-xl font-bold text-sidebar-foreground flex items-center gap-2">
            <ShieldAlertIcon className="h-6 w-6 text-sidebar-primary" />
            Highfield Admin
            <LiveBadge />
          </h2>
          {adminUser && (
            <p className="text-xs text-sidebar-foreground/70 mt-1">Welcome, {adminUser.name}</p>
          )}
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <NavLink href="/" icon={UsersIcon} current={location}>Users</NavLink>
          <NavLink href="/teams" icon={UsersRoundIcon} current={location}>Teams</NavLink>
          <NavLink href="/hierarchy" icon={NetworkIcon} current={location}>Hierarchy</NavLink>
          <NavLink href="/audit" icon={ShieldAlertIcon} current={location}>Access & Audit</NavLink>
        </nav>

        {/* View as User Control */}
        <div className="p-4 border-t border-sidebar-border space-y-3">
          <p className="text-[11px] font-bold text-sidebar-foreground/60 uppercase tracking-wider">View As User</p>
          <Select 
            value={viewAsUserId ? String(viewAsUserId) : "none"} 
            onValueChange={v => setViewAsUserId(v === "none" ? null : Number(v))}
          >
            <SelectTrigger className="bg-sidebar-accent border-sidebar-accent-border text-sidebar-accent-foreground h-9">
              <SelectValue placeholder="Select user..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None (Admin)</SelectItem>
              {activeUsers.map(u => (
                <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="p-4 border-t border-sidebar-border">
          <Button variant="ghost" className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent" onClick={() => setAdminUserId(null)}>
            <LogOutIcon className="mr-2 h-4 w-4" />
            Change Admin
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        {viewAsUserId && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 p-3 px-6 flex items-center justify-between text-amber-900 dark:text-amber-200">
            <span className="font-medium flex items-center gap-2 text-sm">
              <span className="text-lg">👁</span> Viewing as <strong>{viewAsUser?.name}</strong> — you are seeing their access level
            </span>
            <Button variant="outline" size="sm" onClick={() => setViewAsUserId(null)} className="border-amber-500/50 hover:bg-amber-500/20 text-amber-900 dark:text-amber-200 h-8">
              Exit Simulation
            </Button>
          </div>
        )}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

function NavLink({ href, icon: Icon, current, children }: { href: string, icon: any, current: string, children: React.ReactNode }) {
  const isActive = href === "/" ? current === "/" || current.startsWith("/users") : current.startsWith(href);
  return (
    <Link href={href} className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}>
      <Icon className="h-4 w-4" />
      {children}
    </Link>
  );
}
