import { z } from "zod";

export const facilitySearchSchema = z.object({
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  radius: z.number().min(1).max(100).default(25).optional(),
  name: z.string().optional(),
  city: z.string().optional(),
  age: z.number().int().min(0).max(18).optional(),
  maxPrice: z.number().min(0).optional(),
  services: z.array(z.string()).optional(),
  available: z.boolean().optional(),
  openBefore: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  sort: z.enum(["distance", "price_asc", "price_desc", "name"]).default("distance").optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(50).default(12),
});

export const toggleFavoriteSchema = z.object({
  facilityId: z.string().uuid(),
});

export const discoverSearchParamsSchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radius: z.coerce.number().min(1).max(100).optional(),
  name: z.string().optional(),
  city: z.string().optional(),
  age: z.coerce.number().int().min(0).max(18).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  services: z
    .union([z.string(), z.array(z.string())])
    .transform((v) => (Array.isArray(v) ? v : v ? v.split(",") : []))
    .optional(),
  available: z
    .union([z.boolean(), z.string()])
    .transform((v) => v === true || v === "true")
    .optional(),
  openBefore: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  sort: z.enum(["distance", "price_asc", "price_desc", "name"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  view: z.enum(["split", "map", "list"]).optional(),
  q: z.string().optional(),
});

export type FacilitySearchInput = z.infer<typeof facilitySearchSchema>;
export type ToggleFavoriteInput = z.infer<typeof toggleFavoriteSchema>;
export type DiscoverSearchParams = z.infer<typeof discoverSearchParamsSchema>;
