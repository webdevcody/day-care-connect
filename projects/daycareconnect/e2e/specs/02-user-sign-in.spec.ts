import { test, expect } from "@playwright/test";
import { LoginPage } from "../page-objects/login.page";

test.describe("User Sign-In", () => {
  test("parent login redirects to /parent", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login("parent@example.com", "12345678");
    await page.waitForURL("/parent", { timeout: 15000 });
    await expect(page).toHaveURL(/\/parent/);
  });

  test("admin login redirects to /facility", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login("facility@example.com", "12345678");
    await page.waitForURL("/facility", { timeout: 15000 });
    await expect(page).toHaveURL(/\/facility/);
  });

  test("staff login redirects to /staff", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login("staff@example.com", "12345678");
    await page.waitForURL("/staff", { timeout: 15000 });
    await expect(page).toHaveURL(/\/staff/);
  });

  test("invalid password shows error message", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login("parent@example.com", "wrongpassword");

    await expect(loginPage.errorMessage).toBeVisible({ timeout: 10000 });
  });

  test("non-existent email shows error message", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login("nobody@example.com", "12345678");

    await expect(loginPage.errorMessage).toBeVisible({ timeout: 10000 });
  });

  test("empty fields prevent submission via browser validation", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.submitButton.click();

    // Form should not submit — browser required-field validation fires
    await expect(page).toHaveURL(/\/login/);
    await expect(loginPage.errorMessage).not.toBeVisible();
  });

  test("forgot password and register links are present and correct", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await expect(loginPage.forgotPasswordLink).toBeVisible();
    await expect(loginPage.forgotPasswordLink).toHaveAttribute("href", "/forgot-password");

    await expect(loginPage.createAccountLink).toBeVisible();
    await expect(loginPage.createAccountLink).toHaveAttribute("href", "/register");
  });
});
