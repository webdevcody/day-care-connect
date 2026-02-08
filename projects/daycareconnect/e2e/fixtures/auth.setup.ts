import { test as setup, expect } from "@playwright/test";
import { USERS } from "./test-data";

const roles = ["parent", "admin", "staff"] as const;

for (const role of roles) {
  setup(`authenticate as ${role}`, async ({ page }) => {
    const user = USERS[role];
    await page.goto("/login");

    // Wait for the form to be interactive
    await expect(page.locator("#email")).toBeVisible();

    await page.locator("#email").fill(user.email);
    await page.locator("#password").fill(user.password);

    // Listen for console errors for debugging
    page.on("console", (msg) => {
      if (msg.type() === "error") console.log(`CONSOLE ERROR: ${msg.text()}`);
    });

    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL(user.dashboardPath, { timeout: 30000 });
    await page.context().storageState({ path: user.storageStatePath });
  });
}
