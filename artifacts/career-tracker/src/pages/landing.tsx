import { useSignIn } from "@clerk/react";
import { useLocation } from "wouter";
import { BarChart3, Briefcase, Target, CheckCircle2 } from "lucide-react";

export default function LandingPage() {
  const { isLoaded } = useSignIn();
  const [, navigate] = useLocation();

  const handleSignIn = () => {
    if (!isLoaded) return;
    navigate("/sign-in");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-8 py-4 flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-sidebar flex items-center justify-center">
          <BarChart3 className="h-4 w-4 text-sidebar-foreground" />
        </div>
        <div>
          <span className="text-sm font-semibold text-foreground">360° Career Progression</span>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="max-w-xl">
          <h1 className="text-4xl font-bold text-foreground tracking-tight mb-4">
            Your path to promotion, made clear
          </h1>
          <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
            Rate yourself against your current role competencies, build evidence for your target role, 
            and track your readiness for promotion — all in one place.
          </p>

          <button
            onClick={handleSignIn}
            disabled={!isLoaded}
            className="inline-flex items-center gap-3 px-6 py-3 rounded-lg bg-[#2f2f2f] text-white text-sm font-medium hover:bg-[#1a1a1a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg viewBox="0 0 21 21" className="h-5 w-5" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
              <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
              <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
              <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
            </svg>
            Sign in with Microsoft
          </button>
        </div>

        {/* Feature highlights */}
        <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl w-full text-left">
          <div className="flex flex-col gap-2">
            <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Rate your current role</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Self-assess against every competency in your current role using red, amber and green ratings.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
              <Target className="h-4 w-4 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Build evidence for your target role</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Record real examples of your work against the competencies of the role you want next.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Track your promotion readiness</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              See your readiness score in real time and walk into promotion conversations with confidence.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-border px-8 py-4 text-center">
        <p className="text-xs text-muted-foreground">360° Career Progression Tool</p>
      </footer>
    </div>
  );
}
