import { useListUsers } from "@workspace/api-client-react";
import { useAdmin } from "./AdminProvider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlertIcon } from "lucide-react";

export function AdminIdentityPicker() {
  const { setAdminUserId } = useAdmin();
  const { data: users, isLoading } = useListUsers();

  const admins = (users || []).filter(u => u.roles.includes("admin") && u.isActive === "active");

  return (
    <div className="min-h-screen bg-sidebar flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-2xl border-sidebar-border bg-sidebar text-sidebar-foreground">
        <CardHeader className="text-center pb-8 pt-8">
          <div className="mx-auto w-12 h-12 rounded-full bg-sidebar-primary flex items-center justify-center mb-4">
            <ShieldAlertIcon className="h-6 w-6 text-sidebar-primary-foreground" />
          </div>
          <CardTitle className="text-2xl text-sidebar-foreground">Select Admin Identity</CardTitle>
          <CardDescription className="text-sidebar-foreground/70">
            Choose your admin account to access the dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pb-8 px-8">
          {isLoading ? (
            <div className="text-center text-sm text-sidebar-foreground/70 py-4">Loading admins...</div>
          ) : admins.length === 0 ? (
             <div className="text-center text-sm text-sidebar-foreground/70 py-4">No active admin users found.</div>
          ) : (
            admins.map(admin => (
              <Button 
                key={admin.id} 
                variant="outline" 
                className="w-full justify-start h-12 bg-sidebar-accent border-sidebar-accent-border text-sidebar-accent-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground hover:border-sidebar-primary transition-all" 
                onClick={() => setAdminUserId(admin.id)}
              >
                <div className="flex flex-col items-start leading-none text-left">
                  <span className="font-semibold">{admin.name}</span>
                  <span className="text-[10px] opacity-70 mt-1">{admin.email}</span>
                </div>
              </Button>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
