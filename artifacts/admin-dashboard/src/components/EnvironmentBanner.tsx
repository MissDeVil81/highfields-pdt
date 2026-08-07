const APP_ENV = (import.meta.env.VITE_APP_ENV as string) || "development";

export function EnvironmentBanner() {
  if (APP_ENV === "production") return null;

  if (APP_ENV === "demo") {
    return (
      <div className="w-full bg-amber-400 text-amber-950 text-center py-2 px-4 text-sm font-semibold tracking-wide z-50 shrink-0">
        DEMO ENVIRONMENT · Contains demonstration data only
      </div>
    );
  }

  return (
    <div className="w-full bg-red-600 text-white text-center py-2 px-4 text-sm font-bold tracking-widest uppercase z-50 shrink-0">
      ⚠ DEVELOPMENT ENVIRONMENT
    </div>
  );
}

/** Small pill shown in the admin sidebar when APP_ENV === "production" */
export function LiveEnvironmentPill() {
  if (APP_ENV !== "production") return null;
  return (
    <span className="inline-flex items-center rounded-full bg-green-600/20 border border-green-600/40 px-2 py-0.5 text-[10px] font-bold text-green-400 tracking-wider uppercase ml-2">
      LIVE
    </span>
  );
}
