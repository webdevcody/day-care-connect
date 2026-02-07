import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "../auth";
import { db, stripeAccounts, facilities, eq } from "@daycare-hub/db";
import { assertFacilityManager } from "../facility-auth";
import { getStripe } from "../stripe";

export const getStripeAccountStatus = createServerFn({ method: "GET" })
  .inputValidator((data: { facilityId: string }) => data)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await assertFacilityManager(data.facilityId, session.user.id);

    const [account] = await db
      .select()
      .from(stripeAccounts)
      .where(eq(stripeAccounts.facilityId, data.facilityId))
      .limit(1);

    if (!account) {
      return { connected: false, isOnboarded: false, stripeAccountId: null };
    }

    return {
      connected: true,
      isOnboarded: account.isOnboarded,
      stripeAccountId: account.stripeAccountId,
    };
  });

export const createStripeConnectLink = createServerFn({ method: "POST" })
  .inputValidator((data: { facilityId: string }) => data)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await assertFacilityManager(data.facilityId, session.user.id);

    const stripe = getStripe();

    // Check if account already exists
    let [existing] = await db
      .select()
      .from(stripeAccounts)
      .where(eq(stripeAccounts.facilityId, data.facilityId))
      .limit(1);

    if (!existing) {
      // Get facility info for the account
      const [facility] = await db
        .select({ name: facilities.name, email: facilities.email })
        .from(facilities)
        .where(eq(facilities.id, data.facilityId))
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
          facilityId: data.facilityId,
          stripeAccountId: account.id,
        })
        .returning();
    }

    const accountLink = await stripe.accountLinks.create({
      account: existing.stripeAccountId,
      refresh_url: `${process.env.BETTER_AUTH_URL}/facility/${data.facilityId}/billing`,
      return_url: `${process.env.BETTER_AUTH_URL}/facility/${data.facilityId}/billing`,
      type: "account_onboarding",
    });

    return { url: accountLink.url };
  });

export const getStripeDashboardLink = createServerFn({ method: "POST" })
  .inputValidator((data: { facilityId: string }) => data)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await assertFacilityManager(data.facilityId, session.user.id);

    const [account] = await db
      .select()
      .from(stripeAccounts)
      .where(eq(stripeAccounts.facilityId, data.facilityId))
      .limit(1);

    if (!account || !account.isOnboarded) {
      throw new Error("Stripe account not connected or not onboarded");
    }

    const stripe = getStripe();
    const loginLink = await stripe.accounts.createLoginLink(account.stripeAccountId);

    return { url: loginLink.url };
  });
