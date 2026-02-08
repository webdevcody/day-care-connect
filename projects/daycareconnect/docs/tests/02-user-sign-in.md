# Test Scenario: User Sign-In

**Source**: `apps/web/src/routes/_auth/login.tsx`
**Route**: `/login`

## Selectors

| Element | Selector | Type |
|---------|----------|------|
| Email | `#email` | Input[type=email] (required) |
| Password | `#password` | Input[type=password] (required) |
| Submit Button | `button:has-text("Sign In")` | Button (disabled while loading) |
| Error Message | `.bg-destructive\\/10` | Div (text: "Invalid email or password") |
| Forgot Password Link | `a[href="/forgot-password"]` | Link ("Forgot password?") |
| Create Account Link | `a[href="/register"]` | Link ("Create account") |

## Page Object

```ts
// e2e/page-objects/login.page.ts
import type { Page, Locator } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly forgotPasswordLink: Locator;
  readonly createAccountLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator("#email");
    this.passwordInput = page.locator("#password");
    this.submitButton = page.getByRole("button", { name: "Sign In" });
    this.errorMessage = page.locator(".bg-destructive\\/10");
    this.forgotPasswordLink = page.getByText("Forgot password?");
    this.createAccountLink = page.getByText("Create account");
  }

  async goto() {
    await this.page.goto("/login");
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
```

## Test Cases

### TC-LOGIN-01: Parent logs in and lands on /parent

**Preconditions**: Seed user `parent@example.com` / `12345678`

```ts
test("parent login redirects to /parent", async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login("parent@example.com", "12345678");
  await page.waitForURL("/parent");
  await expect(page).toHaveURL("/parent");
});
```

### TC-LOGIN-02: Facility admin logs in and lands on /facility

```ts
test("admin login redirects to /facility", async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login("facility@example.com", "12345678");
  await page.waitForURL("/facility");
  await expect(page).toHaveURL("/facility");
});
```

### TC-LOGIN-03: Staff logs in and lands on /staff

```ts
test("staff login redirects to /staff", async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login("staff@example.com", "12345678");
  await page.waitForURL("/staff");
  await expect(page).toHaveURL("/staff");
});
```

### TC-LOGIN-04: Invalid password shows error

```ts
test("invalid password shows error message", async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login("parent@example.com", "wrongpassword");

  await expect(loginPage.errorMessage).toBeVisible();
  await expect(loginPage.errorMessage).toContainText(/invalid/i);
});
```

### TC-LOGIN-05: Non-existent email shows error

```ts
test("non-existent email shows error message", async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login("nobody@example.com", "12345678");

  await expect(loginPage.errorMessage).toBeVisible();
  await expect(loginPage.errorMessage).toContainText(/invalid/i);
});
```

### TC-LOGIN-06: Empty fields trigger HTML5 validation

```ts
test("empty fields prevent submission via browser validation", async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();

  await loginPage.submitButton.click();

  // Form should not submit — browser required-field validation fires
  await expect(page).toHaveURL(/\/login/);
  await expect(loginPage.errorMessage).not.toBeVisible();
});
```

### TC-LOGIN-07: Verify navigation links

```ts
test("forgot password and register links are present and correct", async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();

  await expect(loginPage.forgotPasswordLink).toBeVisible();
  await expect(loginPage.forgotPasswordLink).toHaveAttribute("href", "/forgot-password");

  await expect(loginPage.createAccountLink).toBeVisible();
  await expect(loginPage.createAccountLink).toHaveAttribute("href", "/register");
});
```
