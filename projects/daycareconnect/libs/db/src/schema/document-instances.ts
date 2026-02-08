import { pgTable, uuid, varchar, text, integer, timestamp, index, jsonb } from "drizzle-orm/pg-core";
import { documentTemplates } from "./document-templates";
import { facilities } from "./facilities";
import { users } from "./users";
import { children } from "./children";
import { documentInstanceStatusEnum } from "./enums";

export const documentInstances = pgTable(
  "document_instances",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => documentTemplates.id),
    templateVersion: integer("template_version").notNull(),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => facilities.id, { onDelete: "cascade" }),
    parentId: text("parent_id")
      .notNull()
      .references(() => users.id),
    childId: uuid("child_id").references(() => children.id),
    status: documentInstanceStatusEnum("status").notNull().default("pending"),
    sentBy: text("sent_by")
      .notNull()
      .references(() => users.id),
    contentSnapshot: text("content_snapshot").notNull(),
    formData: jsonb("form_data"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    viewedAt: timestamp("viewed_at", { withTimezone: true }),
    signedAt: timestamp("signed_at", { withTimezone: true }),
    signatureName: varchar("signature_name", { length: 255 }),
    signatureIp: varchar("signature_ip", { length: 45 }),
    signatureUserAgent: text("signature_user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("document_instances_parent_status_idx").on(table.parentId, table.status),
  ]
);
