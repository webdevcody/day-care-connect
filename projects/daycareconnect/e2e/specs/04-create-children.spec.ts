import { test, expect } from "@playwright/test";
import { USERS } from "../fixtures/test-data";
import { ChildFormPage } from "../page-objects/child-form.page";

test.use({ storageState: USERS.parent.storageStatePath });

test.describe("Create Children", () => {
  test("add child with required fields", async ({ page }) => {
    const childForm = new ChildFormPage(page);
    await childForm.goto();

    await childForm.fillRequired({
      firstName: "Emma",
      lastName: "Smith",
      dateOfBirth: "2021-06-15",
    });

    await childForm.submitButton.click();

    await page.waitForURL("/parent/children", { timeout: 15000 });
    await expect(page.getByText("Emma").first()).toBeVisible({ timeout: 10000 });
  });

  test("add child with all fields including medical and emergency", async ({ page }) => {
    const childForm = new ChildFormPage(page);
    await childForm.goto();

    await childForm.fillFull({
      firstName: "Liam",
      lastName: "Jones",
      dateOfBirth: "2020-09-01",
      gender: "male",
      allergies: "Peanuts, Tree nuts",
      medicalNotes: "Uses inhaler for mild asthma",
      emergencyContactName: "Sarah Jones",
      emergencyContactPhone: "555-0200",
    });

    await childForm.submitButton.click();
    await page.waitForURL("/parent/children", { timeout: 15000 });
    await expect(page.getByText("Liam").first()).toBeVisible({ timeout: 10000 });
  });

  test("seed child Alex User appears in children list", async ({ page }) => {
    await page.goto("/parent/children");
    await expect(page.getByText("Alex")).toBeVisible({ timeout: 10000 });
  });

  test("cancel navigates back without saving", async ({ page }) => {
    const childForm = new ChildFormPage(page);
    await childForm.goto();

    await childForm.firstNameInput.fill("Should Not Save");
    await childForm.cancelButton.click();

    await page.waitForURL("/parent/children", { timeout: 10000 });
    await expect(page.getByText("Should Not Save")).not.toBeVisible();
  });

  test("submitting without required fields triggers validation", async ({ page }) => {
    const childForm = new ChildFormPage(page);
    await childForm.goto();

    // Leave required fields empty, click submit
    await childForm.submitButton.click();

    // Browser HTML5 validation prevents submission
    await expect(page).toHaveURL(/\/parent\/children\/new/);
  });

  test("Add Child button on list navigates to new child form", async ({ page }) => {
    await page.goto("/parent/children");

    // Wait for the list to load
    await expect(page.getByText("My Children")).toBeVisible({ timeout: 10000 });

    await page.getByRole("link", { name: "Add Child" }).click();

    await page.waitForURL("/parent/children/new", { timeout: 10000 });
    await expect(page.locator("#firstName")).toBeVisible();
  });
});
