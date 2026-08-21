import { useEffect, useState } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { ClerkProvider, SignIn, SignUp, useAuth } from "@clerk/react";
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
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

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

type AppUser = { id: number; name: string; roles: string[] };
function SignInPage() { return <div className="min-h-screen grid place-items-center bg-muted p-4"><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /></div>; }
function SignUpPage() { return <div className="min-h-screen grid place-items-center bg-muted p-4"><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} /></div>; }
function LiveAccess({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [env, setEnv] = useState<string>();
  const [user, setUser] = useState<AppUser | null>(null);
  const [error, setError] = useState<string>();
  useEffect(() => { fetch("/api/env").then((r) => r.json()).then((data) => setEnv(data.appEnv)).catch(() => setEnv("development")); }, []);
  useEffect(() => { if (env === "production" && isSignedIn) fetch("/api/auth/me").then(async (r) => { if (!r.ok) throw new Error((await r.json()).error || "Your account has not been approved."); return r.json(); }).then((profile: AppUser) => { const role = profile.roles.includes("director") ? "director" : "manager"; localStorage.setItem("manager_identity", JSON.stringify({ id: profile.id, name: profile.name, role })); setUser(profile); }).catch((err) => setError(err.message)); }, [env, isSignedIn]);
  if (!env || !isLoaded) return <div className="min-h-screen bg-muted" />;
  if (env !== "production") return <>{children}</>;
  if (!isSignedIn) return <Switch><Route path="/sign-in/*?" component={SignInPage} /><Route path="/sign-up/*?" component={SignUpPage} /><Route><div className="min-h-screen grid place-items-center p-6 text-center"><div><h1 className="text-3xl font-bold">Manager Dashboard</h1><p className="mt-3 text-muted-foreground">Sign in with your approved work account.</p><a className="mt-6 inline-block rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground" href={`${basePath}/sign-in`}>Sign in</a></div></div></Route></Switch>;
  if (error || (user && !user.roles.some((role) => role === "manager" || role === "director"))) return <div className="min-h-screen grid place-items-center p-6 text-center"><div><h1 className="text-2xl font-bold">Manager access required</h1><p className="mt-3 text-muted-foreground">{error ?? "Your account is not approved for this dashboard."}</p></div></div>;
  if (!user) return <div className="min-h-screen bg-muted" />;
  return <>{children}</>;
}

export default function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProvider publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl} appearance={{ variables: { colorPrimary: "#1f4c5c", fontFamily: "inherit" } }} signInUrl={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`}>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <EnvironmentBanner />
            <LiveAccess><Router /></LiveAccess>
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </ClerkProvider>
    </WouterRouter>
  );
}
