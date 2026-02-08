import { z } from "zod";
import { createChildSchema } from "./child";

export const onboardingSchema = z.object({
  phone: z.string().min(1, "Phone number is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(1, "Zip code is required"),
  children: z.array(createChildSchema).min(1, "Add at least one child"),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
