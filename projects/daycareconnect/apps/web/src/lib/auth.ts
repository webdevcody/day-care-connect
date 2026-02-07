import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { bearer } from "better-auth/plugins";
import {
  db,
  users,
  sessions,
  accounts,
  verifications,
  userRoles,
} from "@daycare-hub/db";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
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
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const firstName = (user as any).firstName || "";
          const lastName = (user as any).lastName || "";
          return {
            data: {
              ...user,
              name: `${firstName} ${lastName}`.trim() || user.name,
            },
          };
        },
        after: async (user) => {
          const role = (user as any).role || "parent";
          await db
            .insert(userRoles)
            .values({ userId: user.id, role })
            .onConflictDoNothing();
        },
      },
    },
  },
  plugins: [tanstackStartCookies(), bearer()],
});
