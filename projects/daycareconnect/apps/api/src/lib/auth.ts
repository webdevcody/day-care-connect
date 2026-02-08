import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer } from "better-auth/plugins";
import { db, users, sessions, accounts, verifications, userRoles } from "@daycare-hub/db";

if (!process.env.BETTER_AUTH_SECRET) {
  console.error("BETTER_AUTH_SECRET environment variable is required");
  throw new Error("BETTER_AUTH_SECRET environment variable is required");
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:4000",
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "parent",
        input: true,
      },
      firstName: {
        type: "string",
        required: true,
        input: true,
      },
      lastName: {
        type: "string",
        required: true,
        input: true,
      },
      phone: {
        type: "string",
        required: false,
        input: true,
      },
      address: {
        type: "string",
        required: false,
        input: true,
      },
      city: {
        type: "string",
        required: false,
        input: true,
      },
      state: {
        type: "string",
        required: false,
        input: true,
      },
      zipCode: {
        type: "string",
        required: false,
        input: true,
      },
      onboardingCompleted: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: true,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          try {
            const firstName = (user as any).firstName || "";
            const lastName = (user as any).lastName || "";
            return {
              data: {
                ...user,
                name: `${firstName} ${lastName}`.trim() || user.name,
              },
            };
          } catch (error) {
            console.error("Error in user create before hook:", error);
            throw error;
          }
        },
        after: async (user) => {
          try {
            const role = (user as any).role || "parent";
            await db.insert(userRoles).values({ userId: user.id, role }).onConflictDoNothing();
          } catch (error) {
            console.error("Error in user create after hook:", error);
            // Don't throw - allow user creation to succeed even if role insert fails
            // The role can be added later if needed
          }
        },
      },
    },
  },
  trustedOrigins: [process.env.WEB_URL || "http://localhost:3000"],
  plugins: [bearer()],
});
