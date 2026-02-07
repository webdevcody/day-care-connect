import { pgEnum } from "drizzle-orm/pg-core";
import {
  ENROLLMENT_STATUSES,
  SCHEDULE_TYPES,
  STAFF_ROLES,
  ATTENDANCE_STATUSES,
  MESSAGE_STATUSES,
  DEVICE_TYPES,
  ACTIVITY_TYPES,
  DAILY_REPORT_STATUSES,
  DOCUMENT_CATEGORIES,
  DOCUMENT_INSTANCE_STATUSES,
  BILLING_FREQUENCIES,
  INVOICE_STATUSES,
  PAYMENT_STATUSES,
} from "@daycare-hub/shared";

export const enrollmentStatusEnum = pgEnum("enrollment_status", ENROLLMENT_STATUSES);
export const scheduleTypeEnum = pgEnum("schedule_type", SCHEDULE_TYPES);
export const staffRoleEnum = pgEnum("staff_role", STAFF_ROLES);
export const attendanceStatusEnum = pgEnum("attendance_status", ATTENDANCE_STATUSES);
export const messageStatusEnum = pgEnum("message_status", MESSAGE_STATUSES);
export const deviceTypeEnum = pgEnum("device_type", DEVICE_TYPES);
export const activityTypeEnum = pgEnum("activity_type", ACTIVITY_TYPES);
export const dailyReportStatusEnum = pgEnum("daily_report_status", DAILY_REPORT_STATUSES);
export const documentCategoryEnum = pgEnum("document_category", DOCUMENT_CATEGORIES);
export const documentInstanceStatusEnum = pgEnum("document_instance_status", DOCUMENT_INSTANCE_STATUSES);
export const billingFrequencyEnum = pgEnum("billing_frequency", BILLING_FREQUENCIES);
export const invoiceStatusEnum = pgEnum("invoice_status", INVOICE_STATUSES);
export const paymentStatusEnum = pgEnum("payment_status", PAYMENT_STATUSES);
