import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import IdentityPicker from "@/pages/IdentityPicker";
import Home from "@/pages/Home";
import Team from "@/pages/Team";
import EmployeeProbation from "@/pages/EmployeeProbation";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={IdentityPicker} />
      <Route path="/home" component={Home} />
      <Route path="/team" component={Team} />
      <Route path="/employee/:id/probation" component={EmployeeProbation} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
