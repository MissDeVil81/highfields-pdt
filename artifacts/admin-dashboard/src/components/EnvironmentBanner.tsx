import { useQuery } from "@tanstack/react-query";

type AppEnv = "development" | "demo" | "production";

async function fetchAppEnv(): Promise<AppEnv | "unknown"> {
  try {
    const res = await fetch("/api/env");
    if (!res.ok) return "unknown";
    const data = await res.json();
    const env = data.appEnv;
    if (env === "development" || env === "demo" || env === "production") return env;
    return "unknown";
  } catch {
    return "unknown";
  }
}

export function EnvironmentBanner() {
  const { data: appEnv } = useQuery({
    queryKey: ["app-env"],
    queryFn: fetchAppEnv,
    staleTime: Infinity,
    retry: false,
  });

  if (!appEnv || appEnv === "production") return null;

  if (appEnv === "development") {
    return (
      <div className="w-full bg-red-600 text-white text-center text-sm font-semibold py-1.5 tracking-wide z-50">
        ⚠ DEVELOPMENT ENVIRONMENT — Data is for testing only
      </div>
    );
  }

  if (appEnv === "demo") {
    return (
      <div className="w-full bg-amber-500 text-white text-center text-sm font-semibold py-1.5 tracking-wide z-50">
        DEMO ENVIRONMENT · Contains demonstration data only
      </div>
    );
  }

  if (appEnv === "unknown") {
    return (
      <div className="w-full bg-gray-700 text-white text-center text-sm font-semibold py-1.5 tracking-wide z-50">
        ⚠ ENVIRONMENT UNKNOWN — Server may be misconfigured
      </div>
    );
  }

  return null;
}

/** Small "LIVE" pill shown in the admin sidebar when APP_ENV=production */
export function LiveBadge() {
  const { data: appEnv } = useQuery({
    queryKey: ["app-env"],
    queryFn: fetchAppEnv,
    staleTime: Infinity,
    retry: false,
  });

  if (appEnv !== "production") return null;

  return (
    <span className="inline-flex items-center rounded-full bg-green-600 px-2 py-0.5 text-xs font-semibold text-white tracking-wide">
      LIVE
    </span>
  );
}
