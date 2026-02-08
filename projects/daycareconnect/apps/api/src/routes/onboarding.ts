import { Hono } from "hono";
import { db, users, children, eq } from "@daycare-hub/db";
import { onboardingSchema } from "@daycare-hub/shared";

const app = new Hono();

app.post("/complete", async (c) => {
  const userId = c.get("userId") as string;
  const body = await c.req.json();

  // Validate the request body
  const validationResult = onboardingSchema.safeParse(body);
  if (!validationResult.success) {
    return c.json({ error: "Validation failed", details: validationResult.error.errors }, 400);
  }

  const { phone, address, city, state, zipCode, children: childrenData } = validationResult.data;

  // Use a transaction to ensure atomicity
  try {
    await db.transaction(async (tx) => {
      // Update user profile
      await tx
        .update(users)
        .set({
          phone,
          address,
          city,
          state,
          zipCode,
          onboardingCompleted: true,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      // Bulk insert children
      if (childrenData.length > 0) {
        await tx.insert(children).values(
          childrenData.map((child) => ({
            parentId: userId,
            firstName: child.firstName,
            lastName: child.lastName,
            dateOfBirth: child.dateOfBirth,
            gender: child.gender,
            allergies: child.allergies,
            medicalNotes: child.medicalNotes,
            emergencyContactName: child.emergencyContactName,
            emergencyContactPhone: child.emergencyContactPhone,
          }))
        );
      }
    });

    return c.json({ success: true });
  } catch (error) {
    console.error("Onboarding completion error:", error);
    return c.json({ error: "Failed to complete onboarding" }, 500);
  }
});

export { app as onboardingRoutes };
