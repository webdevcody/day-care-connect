import { test, expect, type Browser } from "@playwright/test";
import { USERS } from "../fixtures/test-data";

/** Navigate as admin to /facility, extract the seed facility's ID from its link href */
async function getFacilityId(browser: Browser): Promise<string> {
  const ctx = await browser.newContext({
    storageState: USERS.admin.storageStatePath,
  });
  const page = await ctx.newPage();
  await page.goto("/facility");
  const link = page.getByRole("link", { name: /Sunshine Kids Academy/i }).first();
  await expect(link).toBeVisible({ timeout: 10000 });
  const href = await link.getAttribute("href");
  await ctx.close();
  return href!.replace("/facility/", "");
}

test.describe("Document Management", () => {
  test("admin creates template, sends to parent, parent sees it", async ({ browser }) => {
    const facilityId = await getFacilityId(browser);
    const templateTitle = `DocTest${Date.now()}`;

    // --- Admin: create template ---
    const adminCtx = await browser.newContext({
      storageState: USERS.admin.storageStatePath,
    });
    const adminPage = await adminCtx.newPage();
    await adminPage.goto(`/facility/${facilityId}/documents/templates`);

    // Open create template dialog
    await adminPage.getByRole("button", { name: "Create Template" }).click();
    await expect(adminPage.locator("#title")).toBeVisible();

    // Fill template form
    await adminPage.locator("#title").fill(templateTitle);
    await adminPage.locator("#description").fill("E2E test document template");

    // Select category (Radix Select — dispatch click to bypass viewport overflow)
    await adminPage.locator("#category").dispatchEvent("click");
    await adminPage.getByRole("option", { name: /Permission/i }).click();

    // Mark as required (Radix Checkbox — dispatch click to bypass viewport overflow)
    await adminPage.locator("#isRequired").dispatchEvent("click");

    // Fill content (use dispatchEvent to focus, then fill)
    await adminPage.locator("#content").fill(
      "# Test Document\n\nThis is an E2E test document that requires a signature."
    );

    // Submit (dialog footer is below viewport — dispatch click on submit button)
    await adminPage.locator("[data-slot='dialog-content'] button[type='submit']").dispatchEvent("click");

    // Template should appear in the list
    await expect(adminPage.getByText(templateTitle)).toBeVisible({ timeout: 10000 });

    // Verify badges on the specific template card
    const templateCard = adminPage.locator("[data-slot='card']", { hasText: templateTitle }).first();
    await expect(templateCard.getByText("permission")).toBeVisible();
    await expect(templateCard.getByText("Required")).toBeVisible();

    // --- Admin: send document to all parents ---
    await adminPage.goto(`/facility/${facilityId}/documents/send`);
    await expect(adminPage.getByRole("heading", { name: "Send Document" })).toBeVisible({ timeout: 10000 });

    // Select template (Radix Select)
    await adminPage.getByRole("combobox").click();
    await adminPage.getByRole("option", { name: new RegExp(templateTitle) }).click();

    // Check "Send to All"
    await adminPage.locator("#sendToAll").click();

    // Click Send
    await adminPage.getByRole("button", { name: "Send Document" }).click();

    // Success confirmation
    await expect(adminPage.locator(".border-green-200")).toBeVisible({ timeout: 10000 });
    await expect(adminPage.getByText(/Document sent to \d+ parent/)).toBeVisible();

    await adminCtx.close();

    // --- Parent: verify document is visible ---
    const parentCtx = await browser.newContext({
      storageState: USERS.parent.storageStatePath,
    });
    const parentPage = await parentCtx.newPage();
    await parentPage.goto("/parent/documents");
    await expect(parentPage.getByText(templateTitle).first()).toBeVisible({ timeout: 10000 });

    await parentCtx.close();
  });

  test("create template with only required fields", async ({ browser }) => {
    const facilityId = await getFacilityId(browser);
    const templateTitle = `MinimalDoc${Date.now()}`;

    const adminCtx = await browser.newContext({
      storageState: USERS.admin.storageStatePath,
    });
    const adminPage = await adminCtx.newPage();
    await adminPage.goto(`/facility/${facilityId}/documents/templates`);

    await adminPage.getByRole("button", { name: "Create Template" }).click();
    await expect(adminPage.locator("#title")).toBeVisible();

    await adminPage.locator("#title").fill(templateTitle);

    // Select a category (dispatch click to bypass viewport overflow)
    await adminPage.locator("#category").dispatchEvent("click");
    await adminPage.getByRole("option").first().click();

    await adminPage.locator("#content").fill("This is a minimal test document.");

    // Submit (dialog footer is below viewport — dispatch click on submit button)
    await adminPage.locator("[data-slot='dialog-content'] button[type='submit']").dispatchEvent("click");
    await expect(adminPage.getByText(templateTitle)).toBeVisible({ timeout: 10000 });

    await adminCtx.close();
  });

  test("send button is disabled when no template is selected", async ({ browser }) => {
    const facilityId = await getFacilityId(browser);

    const adminCtx = await browser.newContext({
      storageState: USERS.admin.storageStatePath,
    });
    const adminPage = await adminCtx.newPage();
    await adminPage.goto(`/facility/${facilityId}/documents/send`);

    await expect(adminPage.getByRole("heading", { name: "Send Document" })).toBeVisible({ timeout: 10000 });

    // Without selecting a template, send should be disabled
    await expect(adminPage.getByRole("button", { name: "Send Document" })).toBeDisabled();

    await adminCtx.close();
  });
});
