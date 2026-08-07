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
