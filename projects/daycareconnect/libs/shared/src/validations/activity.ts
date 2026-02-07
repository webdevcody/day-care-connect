import { z } from "zod";
import { ACTIVITY_TYPES, DAILY_REPORT_STATUSES } from "../constants";

export const createActivityEntrySchema = z.object({
  childId: z.string().uuid("Invalid child ID"),
  facilityId: z.string().uuid("Invalid facility ID"),
  type: z.enum(ACTIVITY_TYPES),
  data: z.record(z.unknown()).default({}),
  photoUrl: z.string().url().nullable().optional(),
  occurredAt: z.string().min(1, "Occurred at is required"),
});

export const bulkCreateActivityEntrySchema = z.object({
  childIds: z.array(z.string().uuid("Invalid child ID")).min(1, "At least one child required"),
  facilityId: z.string().uuid("Invalid facility ID"),
  type: z.enum(ACTIVITY_TYPES),
  data: z.record(z.unknown()).default({}),
  photoUrl: z.string().url().nullable().optional(),
  occurredAt: z.string().min(1, "Occurred at is required"),
});

export const updateActivityEntrySchema = z.object({
  activityId: z.string().uuid("Invalid activity ID"),
  data: z.record(z.unknown()).optional(),
  photoUrl: z.string().url().nullable().optional(),
  occurredAt: z.string().optional(),
});

export const deleteActivityEntrySchema = z.object({
  activityId: z.string().uuid("Invalid activity ID"),
});

export const getActivityEntriesSchema = z.object({
  facilityId: z.string().uuid("Invalid facility ID"),
  childId: z.string().uuid().optional(),
  date: z.string().optional(),
});

export const getChildActivitiesSchema = z.object({
  childId: z.string().uuid("Invalid child ID"),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export const createOrGetDailyReportSchema = z.object({
  childId: z.string().uuid("Invalid child ID"),
  facilityId: z.string().uuid("Invalid facility ID"),
  date: z.string().min(1, "Date is required"),
});

export const updateDailyReportSchema = z.object({
  reportId: z.string().uuid("Invalid report ID"),
  summary: z.string().optional(),
});

export const publishDailyReportSchema = z.object({
  reportId: z.string().uuid("Invalid report ID"),
});

export const getDailyReportsSchema = z.object({
  facilityId: z.string().uuid("Invalid facility ID"),
  date: z.string().optional(),
  status: z.enum(DAILY_REPORT_STATUSES).optional(),
});

export const getChildDailyReportsSchema = z.object({
  childId: z.string().uuid("Invalid child ID"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const getChildDailyReportSchema = z.object({
  childId: z.string().uuid("Invalid child ID"),
  date: z.string().min(1, "Date is required"),
});

export const getChildPhotosSchema = z.object({
  childId: z.string().uuid("Invalid child ID"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const createReportTemplateSchema = z.object({
  facilityId: z.string().uuid("Invalid facility ID"),
  name: z.string().min(1, "Name is required").max(255),
  entries: z.array(z.record(z.unknown())),
});

export const getReportTemplatesSchema = z.object({
  facilityId: z.string().uuid("Invalid facility ID"),
});

export type CreateActivityEntryInput = z.infer<typeof createActivityEntrySchema>;
export type BulkCreateActivityEntryInput = z.infer<typeof bulkCreateActivityEntrySchema>;
export type UpdateActivityEntryInput = z.infer<typeof updateActivityEntrySchema>;
export type DeleteActivityEntryInput = z.infer<typeof deleteActivityEntrySchema>;
export type GetActivityEntriesInput = z.infer<typeof getActivityEntriesSchema>;
export type GetChildActivitiesInput = z.infer<typeof getChildActivitiesSchema>;
export type CreateOrGetDailyReportInput = z.infer<typeof createOrGetDailyReportSchema>;
export type UpdateDailyReportInput = z.infer<typeof updateDailyReportSchema>;
export type PublishDailyReportInput = z.infer<typeof publishDailyReportSchema>;
export type GetDailyReportsInput = z.infer<typeof getDailyReportsSchema>;
export type GetChildDailyReportsInput = z.infer<typeof getChildDailyReportsSchema>;
export type GetChildDailyReportInput = z.infer<typeof getChildDailyReportSchema>;
export type GetChildPhotosInput = z.infer<typeof getChildPhotosSchema>;
export type CreateReportTemplateInput = z.infer<typeof createReportTemplateSchema>;
export type GetReportTemplatesInput = z.infer<typeof getReportTemplatesSchema>;
