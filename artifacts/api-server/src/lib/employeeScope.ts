import { pool } from "@workspace/db";

export function parsePositiveIntegerQuery(value: unknown): number | null {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) {
    return null;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export async function employeeExists(userId: number): Promise<boolean> {
  const result = await pool.query(
    "SELECT 1 FROM users WHERE id = $1 LIMIT 1",
    [userId],
  );
  return result.rowCount === 1;
}