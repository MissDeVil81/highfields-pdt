import { useLocation } from "wouter";
import { useListUsers } from "@workspace/api-client-react";
import { useManagerStore } from "@/hooks/useManagerStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, ChevronRight, Loader2 } from "lucide-react";
import { useEffect } from "react";

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
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
            <Users className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Manager Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm">Highfield Professional Solutions</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Who are you?</CardTitle>
            <p className="text-sm text-muted-foreground">Select your name to continue</p>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : managers.length === 0 ? (
              <div className="text-center py-10 px-6">
                <p className="text-sm text-muted-foreground">No managers found.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Add managers via the Users API or ask your administrator.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {managers.map((user) => (
                  <li key={user.id}>
                    <button
                      onClick={() => handleSelect(user.id, user.name)}
                      className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-muted/50 transition-colors text-left group"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">{user.name}</p>
                        {user.jobTitle && (
                          <p className="text-xs text-muted-foreground mt-0.5">{user.jobTitle}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {user.department && (
                          <Badge variant="secondary" className="text-xs font-normal">
                            {user.department}
                          </Badge>
                        )}
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
