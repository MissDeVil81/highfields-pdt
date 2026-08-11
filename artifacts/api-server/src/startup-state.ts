/**
 * Startup readiness flag.
 *
 * Set to true after ensureSchemaExists() completes successfully.
 * The health check returns 503 until this is set so Cloud Run does not
 * route production traffic before the schema is confirmed ready.
 */
let schemaReady = false;

export function setSchemaReady(): void {
  schemaReady = true;
}

export function isSchemaReady(): boolean {
  return schemaReady;
}
