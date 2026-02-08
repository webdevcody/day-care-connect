import { test, expect } from "@playwright/test";
import { RegisterPage } from "../page-objects/register.page";

test.describe("User Registration", () => {
  test("register as parent redirects to /parent", async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    await registerPage.register({
      firstName: "Jane",
      lastName: "Doe",
      email: `jane.doe+${Date.now()}@example.com`,
      password: "securepass1",
      role: "parent",
    });

    await page.waitForURL("/parent", { timeout: 15000 });
    await expect(page).toHaveURL(/\/parent/);
  });

  test("register as facility admin redirects to /facility", async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    await registerPage.register({
      firstName: "John",
      lastName: "Admin",
      email: `john.admin+${Date.now()}@example.com`,
      password: "securepass1",
      role: "admin",
    });

    await page.waitForURL("/facility", { timeout: 15000 });
    await expect(page).toHaveURL(/\/facility/);
  });

  test("duplicate email shows error message", async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    await registerPage.register({
      firstName: "Duplicate",
      lastName: "User",
      email: "parent@example.com",
      password: "securepass1",
    });

    await expect(registerPage.errorMessage).toBeVisible({ timeout: 10000 });
  });

  test("missing required fields prevent submission", async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    await registerPage.submitButton.click();

    // Form should not navigate — browser validation prevents submit
    await expect(page).toHaveURL(/\/register/);
  });

  test("short password triggers validation", async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    await registerPage.firstNameInput.fill("Short");
    await registerPage.lastNameInput.fill("Pass");
    await registerPage.emailInput.fill("shortpass@example.com");
    await registerPage.passwordInput.fill("1234567"); // 7 chars — minLength is 8

    await registerPage.submitButton.click();

    // Browser minLength validation prevents submission
    await expect(page).toHaveURL(/\/register/);
  });
});
