import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Splash from "@/pages/splash";
import Home from "@/pages/home";
import CurrentRole from "@/pages/current-role";
import TargetRole from "@/pages/target-role";
import Summary from "@/pages/summary";
import Probation from "@/pages/probation";
import LearningLog from "@/pages/learning-log";
import Layout from "@/components/Layout";
import IdentityGate from "@/components/IdentityGate";
import { EnvironmentBanner } from "@/components/EnvironmentBanner";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Splash} />
      <Route>
        <IdentityGate>
          <Layout>
            <Switch>
              <Route path="/setup" component={Home} />
              <Route path="/current-role" component={CurrentRole} />
              <Route path="/target-role" component={TargetRole} />
              <Route path="/summary" component={Summary} />
              <Route path="/probation" component={Probation} />
              <Route path="/learning-log" component={LearningLog} />
              <Route component={NotFound} />
            </Switch>
          </Layout>
        </IdentityGate>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <EnvironmentBanner />
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
