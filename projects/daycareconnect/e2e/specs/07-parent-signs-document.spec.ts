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

/** Admin creates a template and sends it to all parents. Returns template title. */
async function createAndSendDocument(browser: Browser, facilityId: string, titlePrefix: string): Promise<string> {
  const templateTitle = `${titlePrefix}${Date.now()}`;
  const adminCtx = await browser.newContext({
    storageState: USERS.admin.storageStatePath,
  });
  const adminPage = await adminCtx.newPage();

  // Create template
  await adminPage.goto(`/facility/${facilityId}/documents/templates`);
  await adminPage.getByRole("button", { name: "Create Template" }).click();
  await expect(adminPage.locator("#title")).toBeVisible();

  await adminPage.locator("#title").fill(templateTitle);
  await adminPage.locator("#category").dispatchEvent("click");
  await adminPage.getByRole("option", { name: /Permission/i }).click();
  await adminPage.locator("#content").fill("# Test Document\n\nPlease read and sign this document.");
  await adminPage.locator("[data-slot='dialog-content'] button[type='submit']").dispatchEvent("click");
  await expect(adminPage.getByText(templateTitle)).toBeVisible({ timeout: 10000 });

  // Send to all parents
  await adminPage.goto(`/facility/${facilityId}/documents/send`);
  await expect(adminPage.getByRole("heading", { name: "Send Document" })).toBeVisible({ timeout: 10000 });
  await adminPage.getByRole("combobox").click();
  await adminPage.getByRole("option", { name: new RegExp(templateTitle) }).click();
  await adminPage.locator("#sendToAll").click();
  await adminPage.getByRole("button", { name: "Send Document" }).click();
  await expect(adminPage.locator(".border-green-200")).toBeVisible({ timeout: 10000 });

  await adminCtx.close();
  return templateTitle;
}

test.describe("Parent Signs Document", () => {
  test("full signing flow: admin sends, parent views and signs", async ({ browser }) => {
    const facilityId = await getFacilityId(browser);
    const templateTitle = await createAndSendDocument(browser, facilityId, "SignFlow");

    // --- Parent: open document ---
    const parentCtx = await browser.newContext({
      storageState: USERS.parent.storageStatePath,
    });
    const parentPage = await parentCtx.newPage();
    await parentPage.goto("/parent/documents");

    // Click Review & Sign on the document
    const docCard = parentPage.locator("[data-slot='card']", { hasText: templateTitle }).first();
    await expect(docCard).toBeVisible({ timeout: 10000 });
    await docCard.getByRole("link", { name: "Review & Sign" }).click();
    await parentPage.waitForURL(/\/parent\/documents\/.+/, { timeout: 10000 });

    // Verify document content loaded
    await expect(parentPage.getByText(templateTitle)).toBeVisible({ timeout: 10000 });

    // Sign button should be disabled initially
    await expect(parentPage.getByRole("button", { name: "Sign Document" })).toBeDisabled();

    // Check agree checkbox
    await parentPage.locator("#agree").click();

    // Enter signature name
    await parentPage.locator("#signatureName").fill("Parent User");

    // Sign button should now be enabled
    await expect(parentPage.getByRole("button", { name: "Sign Document" })).toBeEnabled();

    // Click Sign
    await parentPage.getByRole("button", { name: "Sign Document" }).click();

    // Should show signed confirmation
    await expect(parentPage.locator(".border-green-200")).toBeVisible({ timeout: 10000 });
    await expect(parentPage.getByText(/Signed by Parent User/)).toBeVisible();

    // Sign section should be hidden (can't re-sign)
    await expect(parentPage.locator("#agree")).not.toBeVisible();
    await expect(parentPage.locator("#signatureName")).not.toBeVisible();

    await parentCtx.close();
  });

  test("sign button progressively enabled based on agree + name length", async ({ browser }) => {
    const facilityId = await getFacilityId(browser);
    const templateTitle = await createAndSendDocument(browser, facilityId, "ProgressBtn");

    const parentCtx = await browser.newContext({
      storageState: USERS.parent.storageStatePath,
    });
    const parentPage = await parentCtx.newPage();
    await parentPage.goto("/parent/documents");

    const docCard = parentPage.locator("[data-slot='card']", { hasText: templateTitle }).first();
    await expect(docCard).toBeVisible({ timeout: 10000 });
    await docCard.getByRole("link", { name: "Review & Sign" }).click();
    await parentPage.waitForURL(/\/parent\/documents\/.+/, { timeout: 10000 });

    const signButton = parentPage.getByRole("button", { name: "Sign Document" });

    // Initially disabled
    await expect(signButton).toBeDisabled();

    // Check agree only — still disabled (no name)
    await parentPage.locator("#agree").click();
    await expect(signButton).toBeDisabled();

    // Type 1 char — still disabled
    await parentPage.locator("#signatureName").fill("A");
    await expect(signButton).toBeDisabled();

    // Type 2+ chars — now enabled
    await parentPage.locator("#signatureName").fill("AB");
    await expect(signButton).toBeEnabled();

    // Uncheck agree — disabled again
    await parentPage.locator("#agree").click();
    await expect(signButton).toBeDisabled();

    await parentCtx.close();
  });

  test("signed document cannot be re-signed", async ({ browser }) => {
    const facilityId = await getFacilityId(browser);
    const templateTitle = await createAndSendDocument(browser, facilityId, "NoResign");

    // Sign the document first
    const parentCtx = await browser.newContext({
      storageState: USERS.parent.storageStatePath,
    });
    const parentPage = await parentCtx.newPage();
    await parentPage.goto("/parent/documents");

    const docCard = parentPage.locator("[data-slot='card']", { hasText: templateTitle }).first();
    await expect(docCard).toBeVisible({ timeout: 10000 });
    await docCard.getByRole("link", { name: "Review & Sign" }).click();
    await parentPage.waitForURL(/\/parent\/documents\/.+/, { timeout: 10000 });

    // Sign the document
    await parentPage.locator("#agree").click();
    await parentPage.locator("#signatureName").fill("Parent User");
    await parentPage.getByRole("button", { name: "Sign Document" }).click();
    await expect(parentPage.locator(".border-green-200")).toBeVisible({ timeout: 10000 });

    // Reload the page to confirm signed state persists
    await parentPage.reload();
    await expect(parentPage.locator(".border-green-200")).toBeVisible({ timeout: 10000 });

    // Sign form should not be visible
    await expect(parentPage.locator("#agree")).not.toBeVisible();
    await expect(parentPage.locator("#signatureName")).not.toBeVisible();
    await expect(parentPage.getByRole("button", { name: "Sign Document" })).not.toBeVisible();

    // Signed confirmation should still show
    await expect(parentPage.getByText(/Signed by Parent User/)).toBeVisible();

    await parentCtx.close();
  });
});
