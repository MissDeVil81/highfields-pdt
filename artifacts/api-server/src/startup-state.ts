export type SeedStatus =
  | "starting"
  | "seeded"
  | "partial"
  | "failed"
  | "not_applicable";

export type SeedState = {
  status: SeedStatus;
  failedSteps: readonly string[];
};

/**
 * Startup readiness flag.
 *
 * Set only after schema setup and the applicable startup data work have
 * finished. This prevents a fresh demo deployment from receiving traffic
 * while its required demo data is still being inserted.
 */
let schemaReady = false;
let seedState: SeedState = { status: "starting", failedSteps: [] };

export function setSchemaReady(): void {
  schemaReady = true;
}

export function isSchemaReady(): boolean {
  return schemaReady;
}

export function setSeedState(
  status: SeedStatus,
  failedSteps: readonly string[] = [],
): void {
  seedState = { status, failedSteps: [...failedSteps] };
}

export function getSeedState(): SeedState {
  return { status: seedState.status, failedSteps: [...seedState.failedSteps] };
}
