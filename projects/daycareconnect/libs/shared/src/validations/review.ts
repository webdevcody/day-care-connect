import { z } from "zod";

const ratingField = z.number().int().min(1).max(5);

export const createReviewSchema = z.object({
  facilityId: z.string().uuid(),
  overallRating: ratingField,
  safetyRating: ratingField.optional(),
  staffRating: ratingField.optional(),
  activitiesRating: ratingField.optional(),
  valueRating: ratingField.optional(),
  title: z.string().max(100).optional(),
  body: z.string().max(2000).optional(),
  wouldRecommend: z.boolean().optional(),
});

export const updateReviewSchema = z.object({
  overallRating: ratingField,
  safetyRating: ratingField.optional(),
  staffRating: ratingField.optional(),
  activitiesRating: ratingField.optional(),
  valueRating: ratingField.optional(),
  title: z.string().max(100).optional(),
  body: z.string().max(2000).optional(),
  wouldRecommend: z.boolean().optional(),
});

export const createReviewResponseSchema = z.object({
  body: z.string().min(1).max(2000),
});

export const updateReviewResponseSchema = z.object({
  body: z.string().min(1).max(2000),
});

export const getReviewsSchema = z.object({
  facilityId: z.string().uuid(),
  sort: z.enum(["recent", "highest", "lowest"]).default("recent"),
  rating: z.number().int().min(1).max(5).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(50).default(10),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
export type CreateReviewResponseInput = z.infer<typeof createReviewResponseSchema>;
export type UpdateReviewResponseInput = z.infer<typeof updateReviewResponseSchema>;
export type GetReviewsInput = z.infer<typeof getReviewsSchema>;
