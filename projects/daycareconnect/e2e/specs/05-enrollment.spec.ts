import { test, expect, type Browser, type Page } from "@playwright/test";
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

/** Create a child and enroll it at the given facility. Returns child first name. */
async function createChildAndEnroll(
  browser: Browser,
  facilityId: string,
  childFirstName: string,
): Promise<void> {
  const parentCtx = await browser.newContext({
    storageState: USERS.parent.storageStatePath,
  });
  const page = await parentCtx.newPage();

  // Create child
  await page.goto("/parent/children/new");
  await expect(page.locator("#firstName")).toBeVisible();
  await page.locator("#firstName").fill(childFirstName);
  await page.locator("#lastName").fill("E2E");
  await page.locator("#dateOfBirth").fill("2022-01-10");
  await page.getByRole("button", { name: /Add Child|Save/ }).click();
  await page.waitForURL("/parent/children", { timeout: 15000 });

  // Navigate to enrollment wizard
  await page.goto(`/facilities/${facilityId}/enroll`);
  await expect(page.getByText("Select a Child")).toBeVisible({ timeout: 10000 });

  // Step 1: Select child
  await page.getByText(childFirstName).first().click();
  await page.getByRole("button", { name: "Next" }).click();

  // Step 2: Schedule + start date
  await expect(page.locator("#startDate")).toBeVisible();
  await page.locator("#startDate").fill("2025-09-01");
  await page.getByRole("button", { name: "Next" }).click();

  // Step 3: Notes → review
  await expect(page.locator("#notes")).toBeVisible();
  await page.getByRole("button", { name: "Review Application" }).click();

  // Step 4: Submit
  await expect(page.getByText("Review & Submit")).toBeVisible({ timeout: 5000 });
  await page.getByRole("button", { name: "Submit Application" }).click();
  await page.waitForURL("/parent", { timeout: 15000 });

  await parentCtx.close();
}

/** Click the Review button for the enrollment card matching childName */
async function clickReviewForChild(page: Page, childName: string) {
  // Find the card containing this child's name
  const card = page.locator("[data-slot='card']", { hasText: childName }).first();
  await card.getByRole("button", { name: "Review" }).click();
}

test.describe("Enrollment", () => {
  test("full enrollment flow: parent submits, admin approves", async ({ browser }) => {
    const facilityId = await getFacilityId(browser);
    const childName = `Approve${Date.now()}`;

    await createChildAndEnroll(browser, facilityId, childName);

    // --- Admin: verify pending and approve ---
    const adminCtx = await browser.newContext({
      storageState: USERS.admin.storageStatePath,
    });
    const adminPage = await adminCtx.newPage();
    await adminPage.goto(`/facility/${facilityId}/enrollments?status=pending`);

    // Should see the pending enrollment
    await expect(adminPage.getByText(childName).first()).toBeVisible({ timeout: 10000 });

    // Click Review for this specific enrollment
    await clickReviewForChild(adminPage, childName);
    await expect(adminPage.getByText("Review Enrollment")).toBeVisible({ timeout: 10000 });

    // Approve — use dispatchEvent to handle dialog scroll overflow
    await adminPage.getByRole("button", { name: "Approve" }).dispatchEvent("click");

    // Dialog should close
    await expect(adminPage.getByText("Review Enrollment")).not.toBeVisible({ timeout: 10000 });

    // Check the active tab
    await adminPage.getByRole("button", { name: /^active$/i }).click();
    await expect(adminPage.getByText(childName).first()).toBeVisible({ timeout: 15000 });

    await adminCtx.close();
  });

  test("admin rejects pending enrollment with reason", async ({ browser }) => {
    const facilityId = await getFacilityId(browser);
    const childName = `Reject${Date.now()}`;

    await createChildAndEnroll(browser, facilityId, childName);

    // Admin rejects
    const adminCtx = await browser.newContext({
      storageState: USERS.admin.storageStatePath,
    });
    const adminPage = await adminCtx.newPage();
    await adminPage.goto(`/facility/${facilityId}/enrollments?status=pending`);
    await expect(adminPage.getByText(childName).first()).toBeVisible({ timeout: 10000 });

    await clickReviewForChild(adminPage, childName);
    await expect(adminPage.getByText("Review Enrollment")).toBeVisible({ timeout: 10000 });

    // Click Reject to show reason form
    await adminPage.getByRole("button", { name: "Reject" }).dispatchEvent("click");

    // Fill rejection reason and confirm
    await expect(adminPage.locator("#rejectReason")).toBeVisible();
    await adminPage.locator("#rejectReason").fill("Facility at capacity");
    await adminPage.getByRole("button", { name: "Confirm Reject" }).dispatchEvent("click");

    // Dialog should close
    await expect(adminPage.getByText("Review Enrollment")).not.toBeVisible({ timeout: 10000 });

    // Check the rejected tab
    await adminPage.getByRole("button", { name: /^rejected$/i }).click();
    await expect(adminPage.getByText(childName).first()).toBeVisible({ timeout: 15000 });

    await adminCtx.close();
  });

  test("Next button is disabled until a child is selected", async ({ browser }) => {
    const facilityId = await getFacilityId(browser);

    const parentCtx = await browser.newContext({
      storageState: USERS.parent.storageStatePath,
    });
    const page = await parentCtx.newPage();
    await page.goto(`/facilities/${facilityId}/enroll`);

    // Wait for children to load
    await expect(page.getByText("Select a Child")).toBeVisible({ timeout: 10000 });

    // Next button should be disabled initially
    await expect(page.getByRole("button", { name: "Next" })).toBeDisabled();

    // Select a child
    await page.getByText("Alex").first().click();

    // Now Next should be enabled
    await expect(page.getByRole("button", { name: "Next" })).toBeEnabled();

    await parentCtx.close();
  });
});
