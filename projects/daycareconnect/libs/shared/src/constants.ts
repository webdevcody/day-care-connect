export const APP_NAME = "DayCareConnect";

export const USER_ROLES = ["parent", "admin", "staff"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ENROLLMENT_STATUSES = ["pending", "approved", "active", "withdrawn", "rejected"] as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

export const SCHEDULE_TYPES = ["full_time", "part_time", "drop_in"] as const;
export type ScheduleType = (typeof SCHEDULE_TYPES)[number];

export const STAFF_ROLES = ["lead_teacher", "assistant_teacher", "aide", "director"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

// ─── Fine-Grained Staff Permissions ─────────────────────────────────────────
export const STAFF_PERMISSIONS = [
  "attendance:manage",
  "activities:manage",
  "daily_reports:manage",
  "messaging:send",
  "roster:view",
  "enrollments:manage",
  "billing:manage",
  "documents:manage",
  "reports:view",
  "staff:manage",
  "facility:edit",
  "invites:manage",
  "reviews:manage",
] as const;
export type StaffPermission = (typeof STAFF_PERMISSIONS)[number];

export const STAFF_PERMISSION_LABELS: Record<StaffPermission, string> = {
  "attendance:manage": "Manage Attendance",
  "activities:manage": "Log Activities",
  "daily_reports:manage": "Daily Reports",
  "messaging:send": "Send Messages",
  "roster:view": "View Roster",
  "enrollments:manage": "Manage Enrollments",
  "billing:manage": "Manage Billing",
  "documents:manage": "Manage Documents",
  "reports:view": "View Reports",
  "staff:manage": "Manage Staff",
  "facility:edit": "Edit Facility",
  "invites:manage": "Manage Invites",
  "reviews:manage": "Respond to Reviews",
};

export const STAFF_PERMISSION_DESCRIPTIONS: Record<StaffPermission, string> = {
  "attendance:manage": "Check children in/out and manage attendance records",
  "activities:manage": "Log meals, naps, activities, and other child updates",
  "daily_reports:manage": "Create, edit, and publish daily reports for parents",
  "messaging:send": "Send and receive messages with parents",
  "roster:view": "View the list of enrolled children and their details",
  "enrollments:manage": "Approve, reject, and manage enrollment applications",
  "billing:manage": "Create invoices, manage billing plans, and process payments",
  "documents:manage": "Create and manage document templates and send to parents",
  "reports:view": "View facility reports (enrollment, attendance, revenue)",
  "staff:manage": "Add and remove staff members, update their permissions",
  "facility:edit": "Edit facility details, hours, photos, and services",
  "invites:manage": "Create and manage invite links for parent onboarding",
  "reviews:manage": "Respond to and manage facility reviews",
};

/** Default permissions granted to each staff role */
export const DEFAULT_ROLE_PERMISSIONS: Record<StaffRole, StaffPermission[]> = {
  aide: [
    "attendance:manage",
    "activities:manage",
    "daily_reports:manage",
    "messaging:send",
    "roster:view",
  ],
  assistant_teacher: [
    "attendance:manage",
    "activities:manage",
    "daily_reports:manage",
    "messaging:send",
    "roster:view",
  ],
  lead_teacher: [
    "attendance:manage",
    "activities:manage",
    "daily_reports:manage",
    "messaging:send",
    "roster:view",
    "enrollments:manage",
  ],
  director: [
    "attendance:manage",
    "activities:manage",
    "daily_reports:manage",
    "messaging:send",
    "roster:view",
    "enrollments:manage",
    "billing:manage",
    "documents:manage",
    "reports:view",
    "staff:manage",
    "facility:edit",
    "invites:manage",
    "reviews:manage",
  ],
};

export const FACILITY_SERVICES_SUGGESTIONS = [
  "Meals Included",
  "Outdoor Play",
  "STEM Programs",
  "Bilingual",
  "Arts & Crafts",
  "Music",
  "Transportation",
  "Before/After School Care",
  "Special Needs Support",
  "Potty Training",
] as const;

export const ATTENDANCE_STATUSES = ["expected", "present", "absent", "late"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const ABSENCE_REASONS = ["sick", "family", "vacation", "other"] as const;
export type AbsenceReason = (typeof ABSENCE_REASONS)[number];

export const MESSAGE_STATUSES = ["sent", "read"] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

export const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const ACTIVITY_TYPES = [
  "meal",
  "nap",
  "activity",
  "milestone",
  "mood",
  "bathroom",
  "incident",
  "photo",
  "note",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const DAILY_REPORT_STATUSES = ["draft", "published"] as const;
export type DailyReportStatus = (typeof DAILY_REPORT_STATUSES)[number];

export const MEAL_TYPES = ["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner"] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export const AMOUNT_EATEN = ["none", "some", "half", "most", "all"] as const;
export type AmountEaten = (typeof AMOUNT_EATEN)[number];

export const NAP_QUALITY = ["restless", "fair", "good", "excellent"] as const;
export type NapQuality = (typeof NAP_QUALITY)[number];

export const ACTIVITY_CATEGORIES = [
  "outdoor_play",
  "art",
  "music",
  "reading",
  "stem",
  "free_play",
  "circle_time",
  "gross_motor",
  "fine_motor",
  "sensory",
  "other",
] as const;
export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

export const MOODS = ["happy", "calm", "tired", "fussy", "sad", "excited", "anxious"] as const;
export type Mood = (typeof MOODS)[number];

export const BATHROOM_TYPES = ["diaper_wet", "diaper_dirty", "potty_success", "potty_attempt", "accident"] as const;
export type BathroomType = (typeof BATHROOM_TYPES)[number];

export const INCIDENT_SEVERITY = ["minor", "moderate", "serious"] as const;
export type IncidentSeverity = (typeof INCIDENT_SEVERITY)[number];

export const NOTIFICATION_TYPES = [
  "new_message",
  "enrollment_submitted",
  "enrollment_approved",
  "enrollment_rejected",
  "enrollment_withdrawn",
  "check_in",
  "check_out",
  "new_activity_update",
  "daily_report_published",
  "document_requested",
  "document_reminder",
  "invoice_sent",
  "payment_received",
  "payment_failed",
  "review_posted",
  "review_response",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const DOCUMENT_CATEGORIES = ["enrollment", "medical", "permission", "policy", "other"] as const;
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export const DOCUMENT_INSTANCE_STATUSES = ["pending", "viewed", "signed", "expired", "voided"] as const;
export type DocumentInstanceStatus = (typeof DOCUMENT_INSTANCE_STATUSES)[number];

export const BILLING_FREQUENCIES = ["weekly", "biweekly", "monthly"] as const;
export type BillingFrequency = (typeof BILLING_FREQUENCIES)[number];

export const INVOICE_STATUSES = ["draft", "sent", "paid", "void", "overdue"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const PAYMENT_STATUSES = ["pending", "succeeded", "failed", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const DEVICE_TYPES = ["web", "mobile"] as const;
export type DeviceType = (typeof DEVICE_TYPES)[number];

export const REVIEW_SORT_OPTIONS = ["recent", "highest", "lowest"] as const;
export type ReviewSortOption = (typeof REVIEW_SORT_OPTIONS)[number];

export const REVIEW_ELIGIBLE_STATUSES = ["active", "approved", "withdrawn"] as const;

export const FORM_TYPES = ["markdown", "pdf", "custom_form"] as const;
export type FormType = (typeof FORM_TYPES)[number];

export const FORM_FIELD_TYPES = ["text", "textarea", "checkbox", "select", "date", "email", "phone", "number"] as const;
export type FormFieldType = (typeof FORM_FIELD_TYPES)[number];

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  parent: "Parent",
  admin: "Facility Admin",
  staff: "Staff Member",
};

export const ROLE_DASHBOARD_PATHS: Record<UserRole, string> = {
  parent: "/parent",
  admin: "/facility",
  staff: "/staff",
};
