import { z } from "zod";
import { DOCUMENT_CATEGORIES } from "../constants";

export const createDocumentTemplateSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().max(1000).optional(),
  content: z.string().min(1, "Content is required"),
  category: z.enum(DOCUMENT_CATEGORIES),
  isRequired: z.boolean().optional().default(false),
});

export const updateDocumentTemplateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
  content: z.string().min(1).optional(),
  category: z.enum(DOCUMENT_CATEGORIES).optional(),
  isRequired: z.boolean().optional(),
});

export const sendDocumentSchema = z.object({
  templateId: z.string().uuid(),
  parentIds: z.array(z.string()).min(1, "At least one parent is required"),
  childId: z.string().uuid().optional(),
  expiresAt: z.string().optional(),
});

export const sendBulkDocumentSchema = z.object({
  templateId: z.string().uuid(),
  facilityId: z.string().uuid(),
  childId: z.string().uuid().optional(),
  expiresAt: z.string().optional(),
});

export const signDocumentSchema = z.object({
  signatureName: z.string().min(2, "Signature name must be at least 2 characters").max(255),
});

export type CreateDocumentTemplateInput = z.infer<typeof createDocumentTemplateSchema>;
export type UpdateDocumentTemplateInput = z.infer<typeof updateDocumentTemplateSchema>;
export type SendDocumentInput = z.infer<typeof sendDocumentSchema>;
export type SendBulkDocumentInput = z.infer<typeof sendBulkDocumentSchema>;
export type SignDocumentInput = z.infer<typeof signDocumentSchema>;
