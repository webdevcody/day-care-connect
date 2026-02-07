import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { conversations } from "./conversations";
import { users } from "./users";
import { messageStatusEnum } from "./enums";

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderId: text("sender_id")
      .notNull()
      .references(() => users.id),
    content: text("content").notNull(),
    status: messageStatusEnum("status").notNull().default("sent"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("messages_conversation_created_idx").on(table.conversationId, table.createdAt)]
);
