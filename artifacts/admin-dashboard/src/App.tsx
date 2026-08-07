import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import UsersPage from "@/pages/UsersPage";
import UserFormPage from "@/pages/UserFormPage";
import TeamsPage from "@/pages/TeamsPage";
import HierarchyPage from "@/pages/HierarchyPage";
import AuditLogPage from "@/pages/AuditLogPage";
import { AdminProvider, useAdmin } from "@/components/AdminProvider";
import { AdminLayout, AdminIdentityPicker } from "@/components/AdminLayout";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

function AuthenticatedApp() {
  const { adminUserId } = useAdmin();
  if (!adminUserId) return <AdminIdentityPicker />;

  return (
    <AdminLayout>
      <Switch>
        <Route path="/" component={UsersPage} />
        <Route path="/users/new" component={UserFormPage} />
        <Route path="/users/:id/edit" component={UserFormPage} />
        <Route path="/teams" component={TeamsPage} />
        <Route path="/hierarchy" component={HierarchyPage} />
        <Route path="/audit" component={AuditLogPage} />
        <Route component={NotFound} />
      </Switch>
    </AdminLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AdminProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AuthenticatedApp />
          </WouterRouter>
        </AdminProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
