import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import IdentityPicker from "@/pages/IdentityPicker";
import Home from "@/pages/Home";
import Development from "@/pages/Development";
import LdRecords from "@/pages/LdRecords";
import EmployeeLearning from "@/pages/EmployeeLearning";
import EmployeeProbation from "@/pages/EmployeeProbation";
import { EnvironmentBanner } from "@/components/EnvironmentBanner";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={IdentityPicker} />
      <Route path="/home" component={Home} />
      <Route path="/development" component={Development} />
      <Route path="/ld-records/employee/:id" component={EmployeeLearning} />
      <Route path="/ld-records" component={LdRecords} />
      <Route path="/employee/:id/probation" component={EmployeeProbation} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
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
