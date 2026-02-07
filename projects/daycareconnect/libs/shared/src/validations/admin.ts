import { z } from "zod";
import { ABSENCE_REASONS } from "../constants";

export const approveEnrollmentSchema = z.object({
  enrollmentId: z.string().uuid("Invalid enrollment ID"),
  startDate: z.string().optional(),
});

export const rejectEnrollmentSchema = z.object({
  enrollmentId: z.string().uuid("Invalid enrollment ID"),
  reason: z.string().min(1, "Reason is required"),
});

export const bulkEnrollmentActionSchema = z.object({
  enrollmentIds: z.array(z.string().uuid()).min(1, "Select at least one enrollment"),
  action: z.enum(["approve", "reject"]),
  reason: z.string().optional(),
}).refine(
  (data) => data.action !== "reject" || (data.reason && data.reason.length > 0),
  { message: "Reason is required when rejecting", path: ["reason"] }
);

export const checkInSchema = z.object({
  attendanceId: z.string().uuid("Invalid attendance ID"),
});

export const checkOutSchema = z.object({
  attendanceId: z.string().uuid("Invalid attendance ID"),
});

export const markAbsentSchema = z.object({
  attendanceId: z.string().uuid("Invalid attendance ID"),
  reason: z.enum(ABSENCE_REASONS),
  notes: z.string().optional(),
});

export const dateRangeSchema = z.object({
  facilityId: z.string().uuid("Invalid facility ID"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
});

export type ApproveEnrollmentInput = z.infer<typeof approveEnrollmentSchema>;
export type RejectEnrollmentInput = z.infer<typeof rejectEnrollmentSchema>;
export type BulkEnrollmentActionInput = z.infer<typeof bulkEnrollmentActionSchema>;
export type CheckInInput = z.infer<typeof checkInSchema>;
export type CheckOutInput = z.infer<typeof checkOutSchema>;
export type MarkAbsentInput = z.infer<typeof markAbsentSchema>;
export type DateRangeInput = z.infer<typeof dateRangeSchema>;
