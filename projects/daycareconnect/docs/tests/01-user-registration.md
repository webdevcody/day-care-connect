# Test Scenario: User Registration

**Source**: `apps/web/src/routes/_auth/register.tsx`
**Route**: `/register`

## Selectors

| Element | Selector | Type |
|---------|----------|------|
| First Name | `#firstName` | Input (required) |
| Last Name | `#lastName` | Input (required) |
| Email | `#email` | Input[type=email] (required) |
| Password | `#password` | Input[type=password] (required, minLength=8) |
| Role | `#role` | Native `<select>` (options: parent, admin, staff) |
| Submit Button | `button:has-text("Create Account")` | Button (disabled while loading) |
| Error Message | `.bg-destructive\\/10` | Div |
| Sign-in Link | `a[href="/login"]` | Link ("Sign in") |

## Page Object

```ts
// e2e/page-objects/register.page.ts
import type { Page, Locator } from "@playwright/test";

export class RegisterPage {
  readonly page: Page;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly roleSelect: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly signInLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.firstNameInput = page.locator("#firstName");
    this.lastNameInput = page.locator("#lastName");
    this.emailInput = page.locator("#email");
    this.passwordInput = page.locator("#password");
    this.roleSelect = page.locator("#role");
    this.submitButton = page.getByRole("button", { name: "Create Account" });
    this.errorMessage = page.locator(".bg-destructive\\/10");
    this.signInLink = page.getByRole("link", { name: "Sign in" });
  }

  async goto() {
    await this.page.goto("/register");
  }

  async register(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role?: "parent" | "admin" | "staff";
  }) {
    await this.firstNameInput.fill(data.firstName);
    await this.lastNameInput.fill(data.lastName);
    await this.emailInput.fill(data.email);
    await this.passwordInput.fill(data.password);
    if (data.role) {
      await this.roleSelect.selectOption(data.role);
    }
    await this.submitButton.click();
  }
}
```

## Test Cases

### TC-REG-01: Register as parent

**Preconditions**: Unauthenticated user, fresh database (seed data)

```ts
test("register as parent redirects to /parent", async ({ page }) => {
  const registerPage = new RegisterPage(page);
  await registerPage.goto();

  await registerPage.register({
    firstName: "Jane",
    lastName: "Doe",
    email: "jane.doe@example.com",
    password: "securepass1",
    role: "parent",
  });

  await page.waitForURL("/parent");
  await expect(page).toHaveURL("/parent");
});
```

### TC-REG-02: Register as facility admin

```ts
test("register as facility admin redirects to /facility", async ({ page }) => {
  const registerPage = new RegisterPage(page);
  await registerPage.goto();

  await registerPage.register({
    firstName: "John",
    lastName: "Admin",
    email: "john.admin@example.com",
    password: "securepass1",
    role: "admin",
  });

  await page.waitForURL("/facility");
  await expect(page).toHaveURL("/facility");
});
```

### TC-REG-03: Duplicate email shows error

**Preconditions**: `parent@example.com` already exists from seed data

```ts
test("duplicate email shows error message", async ({ page }) => {
  const registerPage = new RegisterPage(page);
  await registerPage.goto();

  await registerPage.register({
    firstName: "Duplicate",
    lastName: "User",
    email: "parent@example.com",
    password: "securepass1",
  });

  await expect(registerPage.errorMessage).toBeVisible();
  await expect(registerPage.errorMessage).toContainText(/failed|exists|already/i);
});
```

### TC-REG-04: Missing required fields trigger HTML5 validation

```ts
test("missing required fields prevent submission", async ({ page }) => {
  const registerPage = new RegisterPage(page);
  await registerPage.goto();

  // Leave all fields empty and click submit
  await registerPage.submitButton.click();

  // Form should not navigate — browser validation prevents submit
  await expect(page).toHaveURL(/\/register/);
});
```

### TC-REG-05: Password shorter than 8 characters fails validation

```ts
test("short password triggers validation", async ({ page }) => {
  const registerPage = new RegisterPage(page);
  await registerPage.goto();

  await registerPage.register({
    firstName: "Short",
    lastName: "Pass",
    email: "shortpass@example.com",
    password: "1234567", // 7 chars — minLength is 8
  });

  // Browser minLength validation prevents submission
  await expect(page).toHaveURL(/\/register/);
});
```
