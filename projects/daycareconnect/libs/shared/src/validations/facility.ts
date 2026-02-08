import { z } from "zod";

const optionalRate = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== "" ? v.trim() : undefined))
  .refine((v) => v === undefined || !isNaN(Number(v)), {
    message: "Must be a valid number",
  });

export const createFacilitySchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional(),
  address: z.string().min(1, "Address is required").max(500),
  city: z.string().min(1, "City is required").max(100),
  state: z.string().length(2, "State must be 2 characters"),
  zipCode: z.string().min(5, "Zip code is required").max(10),
  phone: z.string().min(1, "Phone is required").max(20),
  email: z.string().email("Invalid email").max(255).optional().or(z.literal("")),
  website: z.string().url("Invalid URL").max(500).optional().or(z.literal("")),
  capacity: z.number().int().min(1, "Capacity must be at least 1"),
  ageRangeMin: z.number().int().min(0).default(0),
  ageRangeMax: z.number().int().min(0).default(12),
  monthlyRate: optionalRate,
  hourlyRate: optionalRate,
  dailyRate: optionalRate,
  weeklyRate: optionalRate,
  licenseNumber: z.string().max(100).optional(),
  licenseExpiry: z.string().optional(),
  licensingAuthority: z.string().max(255).optional(),
});

export const updateFacilitySchema = createFacilitySchema.partial();

export const facilityHoursEntrySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  openTime: z.string().regex(/^\d{2}:\d{2}$/, "Time must be HH:MM format"),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/, "Time must be HH:MM format"),
});

export const facilityPhotoSchema = z.object({
  url: z.string().url("Invalid URL").max(500),
  altText: z.string().max(255).optional(),
});

export const reorderPhotosSchema = z.object({
  photoIds: z.array(z.string().uuid()),
});

export const facilityServicesSchema = z.object({
  services: z.array(z.string().min(1).max(100)),
});

export type CreateFacilityInput = z.infer<typeof createFacilitySchema>;
export type UpdateFacilityInput = z.infer<typeof updateFacilitySchema>;
export type FacilityHoursEntry = z.infer<typeof facilityHoursEntrySchema>;
export type FacilityPhotoInput = z.infer<typeof facilityPhotoSchema>;
export type FacilityServicesInput = z.infer<typeof facilityServicesSchema>;
