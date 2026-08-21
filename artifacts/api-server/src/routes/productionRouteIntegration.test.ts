import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import test from "node:test";
import express, { type Express, type RequestHandler } from "express";
import { db, type User } from "@workspace/db";
import { createApiRouter } from "./index";

const manager = makeUser({
  id: 10,
  name: "Morgan Manager",
  roles: ["manager"],
});
const otherManager = makeUser({
  id: 20,
  name: "Taylor Manager",
  roles: ["manager"],
});
const employee = makeUser({
  id: 11,
  name: "Avery Employee",
  managerId: manager.id,
});
const otherEmployee = makeUser({
  id: 21,
  name: "Riley Employee",
  managerId: otherManager.id,
});
const authorizationUsers = [manager, otherManager, employee, otherEmployee] as const;

function makeUser(overrides: Partial<User> & Pick<User, "id" | "name">): User {
  const { id, name, ...providedFields } = overrides;
  return {
    email: `${id}@example.test`,
    clerkUserId: `clerk_fixture_${id}`,
    roles: ["employee"],
    managerId: null,
    department: "Test",
    jobTitle: "Test role",
    startDate: "2026-01-01",
    probationStatus: null,
    targetRoleId: null,
    isActive: "active",
    mustChangePassword: false,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...providedFields,
    id,
    name,
  };
}

function fixtureAuthentication(actor: User): RequestHandler {
  return (req, _res, next) => {
    req.appUser = actor;
    req.productionAuthorizationUsers = authorizationUsers;
    next();
  };
}

function fixtureApp(actor: User): Express {
  const app = express();
  app.use(express.json());
  app.use("/api", createApiRouter(fixtureAuthentication(actor)));
  return app;
}

async function withServer<T>(app: Express, callback: (baseUrl: string) => Promise<T>): Promise<T> {
  const server = createServer(app);
  await listen(server);
  const address = server.address();
  if (!address || typeof address === "string") {
    await close(server);
    throw new Error("Test server did not expose a TCP address");
  }

  try {
    return await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    await close(server);
  }
}

function listen(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
}

function close(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function request(
  app: Express,
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<{ status: number; body: Record<string, unknown> }> {
  return withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    return {
      status: response.status,
      body: (await response.json()) as Record<string, unknown>,
    };
  });
}

function assertForbidden(result: { status: number; body: Record<string, unknown> }) {
  assert.equal(result.status, 403);
  assert.equal(typeof result.body.error, "string");
}

test("an employee cannot read or mutate another employee's user-scoped records", async () => {
  const app = fixtureApp(employee);

  assertForbidden(await request(app, "GET", `/api/assessments?userId=${otherEmployee.id}`));
  assertForbidden(
    await request(app, "POST", "/api/assessments", {
      userId: otherEmployee.id,
      competencyId: 1,
      roleId: 1,
      rating: "green",
    }),
  );
  assertForbidden(
    await request(
      app,
      "GET",
      `/api/financial-progress?userId=${otherEmployee.id}&roleId=1`,
    ),
  );
  assertForbidden(
    await request(app, "POST", "/api/learning-log", {
      userId: otherEmployee.id,
      dateOfLearning: "21/08/26",
      training: "Unauthorized update",
      deliveredBy: "Avery Employee",
      whatDidILearn: "Should not be stored",
      furtherTrainingNeeded: "",
    }),
  );
});

test("an employee cannot mutate another employee's record by changing its record ID", async () => {
  const existingRecord = { id: 9001, userId: otherEmployee.id };
  const database = db as unknown as {
    select: () => { from: () => { where: () => Promise<unknown[]> } };
  };
  const originalSelect = database.select;
  database.select = () => ({
    from: () => ({
      where: async () => [existingRecord],
    }),
  });

  try {
    assertForbidden(
      await request(fixtureApp(employee), "PUT", `/api/evidence/${existingRecord.id}`, {
        title: "Unauthorized update",
        description: "Should not be stored",
        rating: "red",
      }),
    );
  } finally {
    database.select = originalSelect;
  }
});

test("a manager cannot request another manager's team or dashboard", async () => {
  const app = fixtureApp(manager);

  assertForbidden(await request(app, "GET", `/api/manager/team?managerId=${otherManager.id}`));
  assertForbidden(
    await request(app, "GET", `/api/manager/dashboard-stats?managerId=${otherManager.id}`),
  );
});

test("manager-only accounts cannot use team-wide reporting", async () => {
  const result = await request(
    fixtureApp(manager),
    "GET",
    `/api/manager-ld/team-by-team?teamId=999&directorId=${otherManager.id}`,
  );

  assertForbidden(result);
});

test("an employee cannot submit manager-only probation fields for their own record", async () => {
  const app = fixtureApp(employee);

  assertForbidden(
    await request(app, "POST", "/api/probation/assessments", {
      userId: employee.id,
      itemId: 1,
      reviewPeriod: "month1",
      managerRating: "red",
      managerComment: "Employee must not set this",
    }),
  );
  assertForbidden(
    await request(app, "POST", "/api/probation/manager-reviews", {
      userId: employee.id,
      reviewPeriod: "month1",
      goingWell: "Employee-authored manager review",
    }),
  );
});
