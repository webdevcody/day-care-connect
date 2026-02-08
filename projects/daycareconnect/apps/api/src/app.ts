import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "@hono/node-server/serve-static";
import { errorHandler } from "./middleware/error-handler";
import { authMiddleware } from "./middleware/auth";
import { auth } from "./lib/auth";

// Route imports
import { authRoutes } from "./routes/auth";
import { inviteRoutes } from "./routes/invites";
import { uploadRoutes } from "./routes/uploads";
import { accountRoutes } from "./routes/account";
import { dashboardRoutes } from "./routes/dashboard";
import { onboardingRoutes } from "./routes/onboarding";
import { childrenRoutes } from "./routes/children";
import { enrollmentsRoutes } from "./routes/enrollments";
import { facilitiesRoutes } from "./routes/facilities";
import { favoritesRoutes } from "./routes/favorites";
import { activitiesRoutes } from "./routes/activities";
import { notificationsRoutes } from "./routes/notifications";
import { messagingRoutes } from "./routes/messaging";
import { documentsRoutes } from "./routes/documents";
import { billingRoutes } from "./routes/billing";
import { userRolesRoutes } from "./routes/user-roles";
import { adminDashboardRoutes } from "./routes/admin/dashboard";
import { adminAttendanceRoutes } from "./routes/admin/attendance";
import { adminActivitiesRoutes } from "./routes/admin/activities";
import { adminDailyReportsRoutes } from "./routes/admin/daily-reports";
import { adminEnrollmentsRoutes } from "./routes/admin/enrollments";
import { adminBillingRoutes } from "./routes/admin/billing";
import { adminDocumentsRoutes } from "./routes/admin/documents";
import { adminReportsRoutes } from "./routes/admin/reports";
import { adminRosterRoutes } from "./routes/admin/roster";
import { adminStripeRoutes } from "./routes/admin/stripe";
import { adminReportTemplatesRoutes } from "./routes/admin/report-templates";
import { adminInvitesRoutes } from "./routes/admin/invites";
import { adminEmailsRoutes } from "./routes/admin/emails";
import { adminMessagingRoutes } from "./routes/admin/messaging";
import { staffRoutes } from "./routes/staff/index";
import { staffInviteRoutes } from "./routes/staff-invites";
import { stripeWebhookRoutes } from "./routes/webhooks/stripe";

const app = new Hono();

// CORS
app.use(
  "*",
  cors({
    origin: process.env.WEB_URL || "http://localhost:3000",
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization", "Cookie"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  })
);

// Error handler
app.onError(errorHandler);

// Health check
app.get("/health", (c) => c.json({ status: "ok" }));

// Auth routes (no auth middleware - these handle auth)
app.route("/api/auth", authRoutes);

// Stripe webhooks (no auth middleware - verified by signature)
app.route("/api/webhooks", stripeWebhookRoutes);

// Public invite info route (no auth middleware - public access)
app.route("/api/invites", inviteRoutes);

// Public staff invite routes (no auth middleware - public access)
app.route("/api/staff-invite", staffInviteRoutes);

// Static file serving for uploads
app.use("/uploads/*", serveStatic({ root: "./" }));

// Protected routes
app.use("/api/*", authMiddleware);
app.route("/api/uploads", uploadRoutes);
app.route("/api/account", accountRoutes);
app.route("/api/dashboard", dashboardRoutes);
app.route("/api/onboarding", onboardingRoutes);
app.route("/api/children", childrenRoutes);
app.route("/api/enrollments", enrollmentsRoutes);
app.route("/api/facilities", facilitiesRoutes);
app.route("/api/favorites", favoritesRoutes);
app.route("/api/activities", activitiesRoutes);
app.route("/api/notifications", notificationsRoutes);
app.route("/api/messaging", messagingRoutes);
app.route("/api/documents", documentsRoutes);
app.route("/api/billing", billingRoutes);
app.route("/api/user-roles", userRolesRoutes);
app.route("/api/admin/dashboard", adminDashboardRoutes);
app.route("/api/admin/attendance", adminAttendanceRoutes);
app.route("/api/admin/activities", adminActivitiesRoutes);
app.route("/api/admin/daily-reports", adminDailyReportsRoutes);
app.route("/api/admin/enrollments", adminEnrollmentsRoutes);
app.route("/api/admin/billing", adminBillingRoutes);
app.route("/api/admin/documents", adminDocumentsRoutes);
app.route("/api/admin/reports", adminReportsRoutes);
app.route("/api/admin/roster", adminRosterRoutes);
app.route("/api/admin/stripe", adminStripeRoutes);
app.route("/api/admin/report-templates", adminReportTemplatesRoutes);
app.route("/api/admin/invites", adminInvitesRoutes);
app.route("/api/admin/emails", adminEmailsRoutes);
app.route("/api/admin/messaging", adminMessagingRoutes);
app.route("/api/staff", staffRoutes);

export { app };
