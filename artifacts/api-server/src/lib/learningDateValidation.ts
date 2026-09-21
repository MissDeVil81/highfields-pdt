import { z } from "zod";
import {
  invalidLearningDateMessage,
  isValidLearningDate,
} from "@workspace/db/schema";

export const requiredLearningDateSchema = z
  .string()
  .trim()
  .min(1, "Learning date is required.")
  .refine(isValidLearningDate, invalidLearningDateMessage);

export const optionalLearningDateSchema = z
  .string()
  .trim()
  .refine(
    value => value === "" || isValidLearningDate(value),
    invalidLearningDateMessage,
  );