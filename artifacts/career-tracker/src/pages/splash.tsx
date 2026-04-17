import { useLocation } from "wouter";
import { ArrowRight } from "lucide-react";

export default function Splash() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-sidebar flex flex-col items-center justify-center px-8 relative overflow-hidden">

      {/* Subtle background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-5"
          style={{ background: "radial-gradient(circle, #F5C346 0%, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full opacity-5"
          style={{ background: "radial-gradient(circle, #F5C346 0%, transparent 70%)" }}
        />
      </div>

      <div className="relative z-10 text-center max-w-xl">

        {/* Main heading */}
        <h1
          className="font-script text-sidebar-primary leading-none mb-4"
          style={{ fontSize: "clamp(3.5rem, 10vw, 6rem)" }}
        >
          Career Progression
        </h1>

        {/* Divider line */}
        <div className="mx-auto mb-6 h-px w-24 bg-sidebar-primary opacity-50" />

        {/* Tagline */}
        <p className="text-sidebar-foreground text-xl font-semibold tracking-wide mb-4">
          Your path to promotion
        </p>

        {/* Description */}
        <p className="text-sidebar-foreground/60 text-base leading-relaxed mb-10 max-w-md mx-auto">
          Rate your competencies and track evidence to prepare for your next role.
        </p>

        {/* CTA */}
        <button
          onClick={() => navigate("/setup")}
          className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-base transition-all duration-200 hover:scale-105 active:scale-100 shadow-lg"
          style={{ backgroundColor: "#F5C346", color: "#1c1c2e" }}
        >
          Get Started
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
