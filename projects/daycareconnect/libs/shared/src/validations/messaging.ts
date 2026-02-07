import { z } from "zod";

export const createConversationSchema = z.object({
  facilityId: z.string().uuid("Invalid facility ID"),
});

export const sendMessageSchema = z.object({
  conversationId: z.string().uuid("Invalid conversation ID"),
  content: z.string().min(1, "Message cannot be empty").max(5000, "Message too long"),
});

export const getMessagesSchema = z.object({
  conversationId: z.string().uuid("Invalid conversation ID"),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export const markReadSchema = z.object({
  conversationId: z.string().uuid("Invalid conversation ID"),
});

export const muteConversationSchema = z.object({
  conversationId: z.string().uuid("Invalid conversation ID"),
  isMuted: z.boolean(),
});

export const conversationListSchema = z.object({
  search: z.string().optional(),
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type GetMessagesInput = z.infer<typeof getMessagesSchema>;
export type MarkReadInput = z.infer<typeof markReadSchema>;
export type MuteConversationInput = z.infer<typeof muteConversationSchema>;
export type ConversationListInput = z.infer<typeof conversationListSchema>;
