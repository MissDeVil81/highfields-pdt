import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import express, { type Router } from "express";

import { insertLearningLogEntrySchema, isValidLearningDate } from "@workspace/db/schema";
import {
  optionalLearningDateSchema,
  requiredLearningDateSchema,
} from "../lib/learningDateValidation";
import companyLearningRouter from "./companyLearning";
import ldFeedbackRouter from "./ldFeedback";
import learningLogRouter from "./learningLog";

const learningLogEntry = {
  userId: 1,
  dateOfLearning: "2026-09-21",
  training: "Course",
  deliveredBy: "Trainer",
  whatDidILearn: "Something useful",
  furtherTrainingNeeded: "",
};

async function postToRouter(
  path: string,
  router: Router,
  body: Record<string, unknown>,
): Promise<Response> {
  const app = express();
  app.use(express.json());
  app.use(path, router);

  const server = createServer(app);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("Test server did not expose a port.");
  }

  try {
    return await fetch(`http://127.0.0.1:${address.port}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close(error => (error ? reject(error) : resolve()));
    });
  }
}

test("accepts ISO and UK learning-date formats", () => {
  for (const value of [
    "2026-09-21",
    "2026-09-21T23:30:00-05:00",
    "1/9/2026",
    "30/09/26",
  ]) {
    assert.equal(isValidLearningDate(value), true, value);
    assert.equal(requiredLearningDateSchema.safeParse(value).success, true, value);
  }
});

test("rejects malformed and impossible calendar dates", () => {
  for (const value of [
    "",
    "   ",
    "2026-02-30",
    "31/04/2026",
    "2026/09/21",
    "21-09-2026",
    "not-a-date",
  ]) {
    assert.equal(isValidLearningDate(value), false, value);
    assert.equal(requiredLearningDateSchema.safeParse(value).success, false, value);
  }
});

test("keeps blank feedback dates optional while rejecting invalid values", () => {
  assert.equal(optionalLearningDateSchema.safeParse("").success, true);
  assert.equal(optionalLearningDateSchema.safeParse("   ").success, true);
  assert.equal(optionalLearningDateSchema.safeParse("2026-02-30").success, false);
  assert.equal(optionalLearningDateSchema.safeParse("30/09/2026").success, true);
});

test("requires a valid date when creating an individual learning record", () => {
  assert.equal(
    insertLearningLogEntrySchema.safeParse(learningLogEntry).success,
    true,
  );
  assert.equal(
    insertLearningLogEntrySchema.safeParse({
      ...learningLogEntry,
      dateOfLearning: "",
    }).success,
    false,
  );
  assert.equal(
    insertLearningLogEntrySchema.safeParse({
      ...learningLogEntry,
      dateOfLearning: "2026-02-30",
    }).success,
    false,
  );
});

test("returns HTTP 400 for invalid dates at each learning create endpoint", async () => {
  const cases = [
    {
      path: "/company-learning",
      router: companyLearningRouter,
      body: {
        title: "Course",
        dateOfLearning: "2026-02-30",
        trainer: "Trainer",
        description: "",
        recipientUserIds: [1],
      },
    },
    {
      path: "/learning-log",
      router: learningLogRouter,
      body: {
        ...learningLogEntry,
        dateOfLearning: "31/04/2026",
      },
    },
    {
      path: "/ld-feedback",
      router: ldFeedbackRouter,
      body: {
        userId: 1,
        authorName: "L&D",
        title: "Feedback",
        content: "Content",
        feedbackDate: "not-a-date",
      },
    },
  ];

  for (const testCase of cases) {
    const response = await postToRouter(
      testCase.path,
      testCase.router,
      testCase.body,
    );
    const body = (await response.json()) as { error?: string };

    assert.equal(response.status, 400, testCase.path);
    assert.match(body.error ?? "", /valid ISO date or UK date/, testCase.path);
  }
});