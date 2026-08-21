import { useEffect, useState } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { ClerkProvider, SignIn, useAuth } from "@clerk/react";
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
import { useSessionStore } from "@/lib/session";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

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

type AppUser = { id: number; name: string; email: string | null; roles: string[]; mustChangePassword: boolean };

function SignInPage() {
  return <div className="min-h-screen grid place-items-center bg-sidebar p-4"><SignIn routing="path" path={`${basePath}/sign-in`} withSignUp={false} transferable={false} /></div>;
}

function TemporaryPasswordGate({ onComplete }: { onComplete: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (newPassword !== confirmation) return setError("Your new passwords do not match.");
    setSaving(true);
    setError("");
    const response = await fetch("/api/auth/change-temporary-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "We could not change your password. Please try again.");
      setSaving(false);
      return;
    }
    onComplete();
  }

  return <div className="min-h-screen grid place-items-center bg-sidebar p-4 text-sidebar-foreground"><form onSubmit={submit} className="w-full max-w-md rounded-xl bg-background p-7 text-foreground shadow-xl"><h1 className="text-2xl font-bold">Choose a new password</h1><p className="mt-2 text-sm text-muted-foreground">For your security, replace the temporary password before continuing. Contact Claire or Amelia if you need a new temporary password.</p><div className="mt-6 space-y-4"><input aria-label="Temporary password" className="w-full rounded-md border bg-background px-3 py-2" type="password" autoComplete="current-password" placeholder="Temporary password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /><input aria-label="New password" className="w-full rounded-md border bg-background px-3 py-2" type="password" autoComplete="new-password" placeholder="New password (at least 8 characters)" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required minLength={8} /><input aria-label="Confirm new password" className="w-full rounded-md border bg-background px-3 py-2" type="password" autoComplete="new-password" placeholder="Confirm new password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required minLength={8} /></div>{error && <p className="mt-3 text-sm text-destructive">{error}</p>}<button className="mt-6 w-full rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:opacity-50" type="submit" disabled={saving}>{saving ? "Updating password…" : "Set new password"}</button></form></div>;
}

function LiveAccess({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { setUser } = useSessionStore();
  const [env, setEnv] = useState<string>();
  const [user, setUserProfile] = useState<AppUser | null>(null);
  const [error, setError] = useState<string>();

  useEffect(() => { fetch("/api/env").then((r) => r.json()).then((data) => setEnv(data.appEnv)).catch(() => setEnv("development")); }, []);
  useEffect(() => {
    if (env !== "production" || !isSignedIn) return;
    fetch("/api/auth/me").then(async (res) => {
      if (!res.ok) throw new Error((await res.json()).error || "Your account has not been approved.");
      return res.json();
    }).then((profile: AppUser) => { setUserProfile(profile); setUser(profile.id, profile.name, profile.email ?? ""); }).catch((err) => setError(err.message));
  }, [env, isSignedIn, setUser]);

  if (!env || !isLoaded) return <div className="min-h-screen bg-sidebar" />;
  if (env !== "production") return <>{children}</>;
  if (!isSignedIn) return <Switch><Route path="/sign-in/*?" component={SignInPage} /><Route><div className="min-h-screen grid place-items-center bg-sidebar p-6 text-center text-sidebar-foreground"><div><h1 className="text-3xl font-bold">Career Progression</h1><p className="mt-3 text-sidebar-foreground/70">Sign in with your approved work account to continue.</p><a className="mt-6 inline-block rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground" href={`${basePath}/sign-in`}>Sign in</a></div></div></Route></Switch>;
  if (error) return <div className="min-h-screen grid place-items-center p-6 text-center"><div><h1 className="text-2xl font-bold">Access not available</h1><p className="mt-3 text-muted-foreground">{error}</p></div></div>;
  if (!user) return <div className="min-h-screen bg-sidebar" />;
  if (user.mustChangePassword) return <TemporaryPasswordGate onComplete={() => setUserProfile({ ...user, mustChangePassword: false })} />;
  if (!user.roles.includes("employee")) return <div className="min-h-screen grid place-items-center p-6 text-center"><div><h1 className="text-2xl font-bold">Employee access required</h1><p className="mt-3 text-muted-foreground">Your approved account does not have access to the Career Tracker.</p></div></div>;
  return <>{children}</>;
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProvider publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl} appearance={{ variables: { colorPrimary: "#f5c346", fontFamily: "inherit" } }} signInUrl={`${basePath}/sign-in`}>
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

export default App;
