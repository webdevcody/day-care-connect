import { z } from "zod";
import { FORM_FIELD_TYPES } from "../constants";

export const formFieldDefinitionSchema = z.object({
  id: z.string().min(1),
  type: z.enum(FORM_FIELD_TYPES),
  label: z.string().min(1),
  required: z.boolean().default(false),
  placeholder: z.string().optional(),
  options: z.array(z.string()).optional(),
});

export const createFacilityInviteSchema = z.object({
  name: z.string().max(255).optional(),
  expiresAt: z.string().optional(),
});

export const submitFormDataSchema = z.object({
  templateId: z.string().uuid(),
  formData: z.record(z.string(), z.unknown()).optional(),
  signatureName: z.string().min(2).max(255).optional(),
});

export const createChildForInviteSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.string().max(20).optional(),
  allergies: z.string().optional(),
  medicalNotes: z.string().optional(),
  emergencyContactName: z.string().max(100).optional(),
  emergencyContactPhone: z.string().max(20).optional(),
});

export type FormFieldDefinition = z.infer<typeof formFieldDefinitionSchema>;
export type CreateFacilityInviteInput = z.infer<typeof createFacilityInviteSchema>;
export type SubmitFormDataInput = z.infer<typeof submitFormDataSchema>;
export type CreateChildForInviteInput = z.infer<typeof createChildForInviteSchema>;
