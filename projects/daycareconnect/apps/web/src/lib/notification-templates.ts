import type { NotificationType } from "@daycare-hub/shared";

type TemplateData = Record<string, unknown>;

interface NotificationTemplate {
  title: (data: TemplateData) => string;
  body: (data: TemplateData) => string;
}

export const NOTIFICATION_TEMPLATES: Record<NotificationType, NotificationTemplate> = {
  new_message: {
    title: (data) => `New message from ${data.senderName || "someone"}`,
    body: (data) => String(data.preview || "You have a new message"),
  },
  enrollment_submitted: {
    title: (data) => `New enrollment application`,
    body: (data) =>
      `${data.parentName || "A parent"} submitted an enrollment for ${data.childName || "their child"} at ${data.facilityName || "your facility"}`,
  },
  enrollment_approved: {
    title: () => `Enrollment approved`,
    body: (data) =>
      `Your enrollment for ${data.childName || "your child"} at ${data.facilityName || "the facility"} has been approved`,
  },
  enrollment_rejected: {
    title: () => `Enrollment update`,
    body: (data) =>
      `Your enrollment for ${data.childName || "your child"} at ${data.facilityName || "the facility"} was not approved`,
  },
  enrollment_withdrawn: {
    title: () => `Enrollment withdrawn`,
    body: (data) =>
      `${data.parentName || "A parent"} withdrew ${data.childName || "their child"} from ${data.facilityName || "your facility"}`,
  },
  check_in: {
    title: () => `Child checked in`,
    body: (data) =>
      `${data.childName || "Your child"} has been checked in at ${data.facilityName || "the facility"}`,
  },
  check_out: {
    title: () => `Child checked out`,
    body: (data) =>
      `${data.childName || "Your child"} has been checked out from ${data.facilityName || "the facility"}`,
  },
  new_activity_update: {
    title: () => `New activity update`,
    body: (data) =>
      `New ${data.activityType || "activity"} logged for ${data.childName || "your child"} at ${data.facilityName || "the facility"}`,
  },
  daily_report_published: {
    title: () => `Daily report available`,
    body: (data) =>
      `${data.childName || "Your child"}'s daily report for ${data.date || "today"} is now available from ${data.facilityName || "the facility"}`,
  },
  document_requested: {
    title: () => `Document requires your signature`,
    body: (data) =>
      `${data.facilityName || "A facility"} has sent you "${data.documentTitle || "a document"}" to review and sign`,
  },
  document_reminder: {
    title: () => `Document signature reminder`,
    body: (data) =>
      `Reminder: "${data.documentTitle || "A document"}" from ${data.facilityName || "a facility"} is still waiting for your signature`,
  },
  invoice_sent: {
    title: () => `New invoice received`,
    body: (data) =>
      `${data.facilityName || "A facility"} sent you invoice ${data.invoiceNumber || ""} for $${data.total || "0.00"}, due ${data.dueDate || "soon"}`,
  },
  payment_received: {
    title: () => `Payment confirmed`,
    body: (data) =>
      `Your payment of $${data.amount || "0.00"} for invoice ${data.invoiceNumber || ""} has been received`,
  },
  payment_failed: {
    title: () => `Payment failed`,
    body: (data) =>
      `Your payment for invoice ${data.invoiceNumber || ""} could not be processed. Please try again.`,
  },
  review_posted: {
    title: () => `New review posted`,
    body: (data) =>
      `${data.parentName || "A parent"} left a ${data.rating || ""}-star review for ${data.facilityName || "your facility"}`,
  },
  review_response: {
    title: () => `Response to your review`,
    body: (data) =>
      `${data.facilityName || "A facility"} responded to your review`,
  },
};

export const NOTIFICATION_TYPE_LABELS: Record<
  NotificationType,
  { label: string; description: string }
> = {
  new_message: {
    label: "New Messages",
    description: "When you receive a new message",
  },
  enrollment_submitted: {
    label: "Enrollment Applications",
    description: "When a new enrollment application is submitted",
  },
  enrollment_approved: {
    label: "Enrollment Approved",
    description: "When your enrollment application is approved",
  },
  enrollment_rejected: {
    label: "Enrollment Rejected",
    description: "When your enrollment application is not approved",
  },
  enrollment_withdrawn: {
    label: "Enrollment Withdrawn",
    description: "When an enrollment is withdrawn",
  },
  check_in: {
    label: "Check-In",
    description: "When your child is checked in at the facility",
  },
  check_out: {
    label: "Check-Out",
    description: "When your child is checked out from the facility",
  },
  new_activity_update: {
    label: "Activity Updates",
    description: "When a new activity is logged for your child",
  },
  daily_report_published: {
    label: "Daily Reports",
    description: "When your child's daily report is published",
  },
  document_requested: {
    label: "Document Requests",
    description: "When a facility sends you a document to sign",
  },
  document_reminder: {
    label: "Document Reminders",
    description: "When a facility sends a reminder to sign a document",
  },
  invoice_sent: {
    label: "Invoices",
    description: "When a facility sends you a new invoice",
  },
  payment_received: {
    label: "Payment Confirmations",
    description: "When your payment has been successfully processed",
  },
  payment_failed: {
    label: "Payment Failures",
    description: "When a payment attempt fails",
  },
  review_posted: {
    label: "New Reviews",
    description: "When a parent posts a review for your facility",
  },
  review_response: {
    label: "Review Responses",
    description: "When a facility responds to your review",
  },
};
