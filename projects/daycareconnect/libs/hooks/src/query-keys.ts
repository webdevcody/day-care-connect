export const queryKeys = {
  dashboard: {
    all: ["dashboard"] as const,
  },
  children: {
    all: ["children"] as const,
    detail: (id: string) => ["children", id] as const,
  },
  enrollments: {
    all: ["enrollments"] as const,
    detail: (id: string) => ["enrollments", id] as const,
    history: (id: string) => ["enrollments", id, "history"] as const,
  },
  facilities: {
    all: ["facilities"] as const,
    mine: ["facilities", "mine"] as const,
    detail: (id: string) => ["facilities", id] as const,
    search: (params: Record<string, any>) => ["facilities", "search", params] as const,
    active: ["facilities", "active"] as const,
    staff: (id: string) => ["facilities", id, "staff"] as const,
    staffPermissions: (facilityId: string, staffId: string) =>
      ["facilities", facilityId, "staff", staffId, "permissions"] as const,
    staffInvites: (facilityId: string) => ["facilities", facilityId, "staff-invites"] as const,
  },
  favorites: {
    all: ["favorites"] as const,
  },
  activities: {
    children: (childId: string) => ["activities", "children", childId] as const,
    dailyReports: (childId: string) => ["activities", "daily-reports", childId] as const,
    dailyReport: (childId: string, date: string) =>
      ["activities", "daily-report", childId, date] as const,
    photos: (childId: string) => ["activities", "photos", childId] as const,
  },
  notifications: {
    all: ["notifications"] as const,
    unreadCount: ["notifications", "unread-count"] as const,
    preferences: ["notifications", "preferences"] as const,
    quietHours: ["notifications", "quiet-hours"] as const,
  },
  messaging: {
    conversations: ["messaging", "conversations"] as const,
    conversation: (id: string) => ["messaging", "conversations", id] as const,
    messages: (conversationId: string) => ["messaging", "messages", conversationId] as const,
    unreadCount: ["messaging", "unread-count"] as const,
  },
  documents: {
    all: ["documents"] as const,
    detail: (id: string) => ["documents", id] as const,
  },
  billing: {
    invoices: ["billing", "invoices"] as const,
    invoiceDetail: (id: string) => ["billing", "invoices", id] as const,
    payments: ["billing", "payments"] as const,
    paymentMethods: ["billing", "payment-methods"] as const,
    summary: ["billing", "summary"] as const,
  },
  userRoles: {
    all: ["user-roles"] as const,
  },
  account: {
    profile: ["account", "profile"] as const,
  },
  admin: {
    dashboard: (facilityId: string) => ["admin", "dashboard", facilityId] as const,
    attendance: (facilityId: string, date: string) =>
      ["admin", "attendance", facilityId, date] as const,
    activities: (facilityId: string, params?: any) =>
      ["admin", "activities", facilityId, params] as const,
    enrolledChildren: (facilityId: string) => ["admin", "enrolled-children", facilityId] as const,
    dailyReports: (facilityId: string, params?: any) =>
      ["admin", "daily-reports", facilityId, params] as const,
    enrollments: (facilityId: string, status?: string) =>
      ["admin", "enrollments", facilityId, status] as const,
    enrollmentDetail: (facilityId: string, enrollmentId: string) =>
      ["admin", "enrollment-detail", facilityId, enrollmentId] as const,
    billingOverview: (facilityId: string) => ["admin", "billing-overview", facilityId] as const,
    billingInvoices: (facilityId: string) => ["admin", "billing-invoices", facilityId] as const,
    billingInvoiceDetail: (facilityId: string, invoiceId: string) =>
      ["admin", "billing-invoice-detail", facilityId, invoiceId] as const,
    billingParents: (facilityId: string) => ["admin", "billing-parents", facilityId] as const,
    billingPlan: (enrollmentId: string) => ["admin", "billing-plan", enrollmentId] as const,
    documentTemplates: (facilityId: string) => ["admin", "document-templates", facilityId] as const,
    documentInstances: (facilityId: string) => ["admin", "document-instances", facilityId] as const,
    compliance: (facilityId: string) => ["admin", "compliance", facilityId] as const,
    documentParents: (facilityId: string) => ["admin", "document-parents", facilityId] as const,
    enrollmentReport: (facilityId: string) => ["admin", "enrollment-report", facilityId] as const,
    enrollmentAnalytics: (facilityId: string, month?: string) =>
      ["admin", "enrollment-analytics", facilityId, month] as const,
    attendanceReport: (facilityId: string) => ["admin", "attendance-report", facilityId] as const,
    revenueEstimate: (facilityId: string) => ["admin", "revenue-estimate", facilityId] as const,
    roster: (facilityId: string) => ["admin", "roster", facilityId] as const,
    stripeStatus: (facilityId: string) => ["admin", "stripe-status", facilityId] as const,
    reportTemplates: (facilityId: string) => ["admin", "report-templates", facilityId] as const,
    attendanceActivityLog: (facilityId: string) =>
      ["admin", "attendance-activity-log", facilityId] as const,
    childAttendanceHistory: (facilityId: string, childId: string) =>
      ["admin", "child-attendance-history", facilityId, childId] as const,
    invites: (facilityId: string) => ["admin", "invites", facilityId] as const,
    inviteSubmissions: (inviteId: string) => ["admin", "invite-submissions", inviteId] as const,
    enrolledParents: (facilityId: string) => ["admin", "enrolled-parents", facilityId] as const,
    facilityConversations: (facilityId: string, search?: string) =>
      ["admin", "facility-conversations", facilityId, search] as const,
  },
  invites: {
    info: (code: string) => ["invites", code] as const,
  },
  staff: {
    assignments: ["staff", "assignments"] as const,
  },
};
