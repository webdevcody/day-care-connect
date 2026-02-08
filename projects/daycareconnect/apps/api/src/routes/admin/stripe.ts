import { Hono } from "hono";
import { db, stripeAccounts, facilities, eq } from "@daycare-hub/db";
import { assertFacilityPermission } from "../../lib/facility-auth";
import { getStripe } from "../../lib/stripe";

const app = new Hono();

// GET /:facilityId/status - Get Stripe account status
app.get("/:facilityId/status", async (c) => {
  const userId = c.get("userId") as string;
  const facilityId = c.req.param("facilityId");

  await assertFacilityPermission(facilityId, userId, "billing:manage");

  const [account] = await db
    .select()
    .from(stripeAccounts)
    .where(eq(stripeAccounts.facilityId, facilityId))
    .limit(1);

  if (!account) {
    return c.json({ connected: false, isOnboarded: false, stripeAccountId: null });
  }

  return c.json({
    connected: true,
    isOnboarded: account.isOnboarded,
    stripeAccountId: account.stripeAccountId,
  });
});

// POST /:facilityId/connect - Create Stripe Connect link
app.post("/:facilityId/connect", async (c) => {
  const userId = c.get("userId") as string;
  const facilityId = c.req.param("facilityId");

  await assertFacilityPermission(facilityId, userId, "billing:manage");

  const stripe = getStripe();

  // Check if account already exists
  let [existing] = await db
    .select()
    .from(stripeAccounts)
    .where(eq(stripeAccounts.facilityId, facilityId))
    .limit(1);

  if (!existing) {
    // Get facility info for the account
    const [facility] = await db
      .select({ name: facilities.name, email: facilities.email })
      .from(facilities)
      .where(eq(facilities.id, facilityId))
      .limit(1);

    const account = await stripe.accounts.create({
      type: "standard",
      email: facility?.email || undefined,
      business_profile: {
        name: facility?.name,
      },
    });

    [existing] = await db
      .insert(stripeAccounts)
      .values({
        facilityId,
        stripeAccountId: account.id,
      })
      .returning();
  }

  const accountLink = await stripe.accountLinks.create({
    account: existing.stripeAccountId,
    refresh_url: `${process.env.BETTER_AUTH_URL}/facility/${facilityId}/billing`,
    return_url: `${process.env.BETTER_AUTH_URL}/facility/${facilityId}/billing`,
    type: "account_onboarding",
  });

  return c.json({ url: accountLink.url });
});

// POST /:facilityId/dashboard - Get Stripe dashboard link
app.post("/:facilityId/dashboard", async (c) => {
  const userId = c.get("userId") as string;
  const facilityId = c.req.param("facilityId");

  await assertFacilityPermission(facilityId, userId, "billing:manage");

  const [account] = await db
    .select()
    .from(stripeAccounts)
    .where(eq(stripeAccounts.facilityId, facilityId))
    .limit(1);

  if (!account || !account.isOnboarded) {
    throw new Error("Stripe account not connected or not onboarded");
  }

  const stripe = getStripe();
  const loginLink = await stripe.accounts.createLoginLink(account.stripeAccountId);

  return c.json({ url: loginLink.url });
});

export { app as adminStripeRoutes };
