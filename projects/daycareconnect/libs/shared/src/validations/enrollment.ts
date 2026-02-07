import { z } from "zod";
import { SCHEDULE_TYPES } from "../constants";

export const createEnrollmentSchema = z.object({
  childId: z.string().uuid("Invalid child ID"),
  facilityId: z.string().uuid("Invalid facility ID"),
  scheduleType: z.enum(SCHEDULE_TYPES),
  startDate: z.string().min(1, "Start date is required"),
  notes: z.string().optional(),
});

export const withdrawEnrollmentSchema = z.object({
  reason: z.string().optional(),
});

export type CreateEnrollmentInput = z.infer<typeof createEnrollmentSchema>;
export type WithdrawEnrollmentInput = z.infer<typeof withdrawEnrollmentSchema>;
