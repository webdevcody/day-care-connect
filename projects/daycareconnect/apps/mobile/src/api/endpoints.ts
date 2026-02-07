import { api } from "./client";

// Auth (Better Auth REST endpoints)
export async function signIn(email: string, password: string) {
  return api.post<{ token: string; user: User }>("/api/auth/sign-in/email", {
    email,
    password,
  });
}

export async function signUp(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  name: string;
  role: string;
}) {
  return api.post<{ token: string; user: User }>("/api/auth/sign-up/email", data);
}

export async function getSession() {
  return api.get<{ session: Session; user: User }>("/api/auth/get-session");
}

// Dashboard
export async function getDashboard() {
  return api.get<DashboardResponse>("/api/mobile/dashboard");
}

// Children
export async function getMyChildren() {
  return api.get<{ children: Child[] }>("/api/mobile/children");
}

export async function getChild(childId: string) {
  return api.get<{ child: Child; enrollments: Enrollment[] }>(
    `/api/mobile/children/${childId}`,
  );
}

export async function getChildActivities(
  childId: string,
  cursor?: string | null,
) {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  return api.get<{ activities: Activity[]; nextCursor: string | null }>(
    `/api/mobile/children/${childId}/activities?${params}`,
  );
}

export async function getChildDailyReports(childId: string) {
  return api.get<{ reports: DailyReport[] }>(
    `/api/mobile/children/${childId}/daily-reports`,
  );
}

// Notifications
export async function getNotifications(cursor?: string | null) {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  return api.get<{ notifications: Notification[]; nextCursor: string | null }>(
    `/api/mobile/notifications?${params}`,
  );
}

export async function getUnreadCount() {
  return api.get<{ count: number }>("/api/mobile/notifications/unread-count");
}

export async function markAllRead() {
  return api.post<{ success: boolean }>("/api/mobile/notifications/read-all");
}

export async function markRead(notificationId: string) {
  return api.post<{ success: boolean }>(
    `/api/mobile/notifications/${notificationId}/read`,
  );
}

// Push
export async function registerPushToken(token: string) {
  return api.post<{ success: boolean }>("/api/mobile/push/register", {
    token,
  });
}

export async function unregisterPushToken() {
  return api.post<{ success: boolean }>("/api/mobile/push/unregister");
}

// Types
export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  image: string | null;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
}

export interface Child {
  id: string;
  parentId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string | null;
  allergies: string | null;
  medicalNotes: string | null;
  photo: string | null;
  createdAt: string;
}

export interface Enrollment {
  id: string;
  status: string;
  scheduleType: string;
  startDate: string | null;
  endDate: string | null;
  facilityName: string | null;
  facilityId: string | null;
}

export interface Activity {
  id: string;
  childId: string;
  facilityId: string;
  staffId: string;
  type: string;
  data: Record<string, unknown> | null;
  photoUrl: string | null;
  occurredAt: string;
  createdAt: string;
  facilityName: string | null;
}

export interface DailyReport {
  id: string;
  childId: string;
  facilityId: string;
  date: string;
  summary: string | null;
  status: string;
  publishedAt: string | null;
  facilityName: string | null;
}

export interface AppNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  actionUrl: string | null;
  data: unknown;
  isRead: boolean;
  createdAt: string;
}

export interface DashboardResponse {
  children: Child[];
  stats: {
    totalChildren: number;
    activeEnrollments: number;
  };
  recentActivities: Activity[];
}
