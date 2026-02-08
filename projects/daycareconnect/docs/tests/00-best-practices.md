# Playwright E2E Testing — Best Practices

## Project Setup

### Install

```bash
cd projects/daycareconnect
npm i -D @playwright/test
npx playwright install
```

### `playwright.config.ts`

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/specs",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    // Auth setup — runs first, saves storage state for each role
    { name: "setup", testDir: "./e2e/fixtures", testMatch: "auth.setup.ts" },

    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
```

## Folder Structure

```
e2e/
├── fixtures/
│   ├── auth.setup.ts        # Creates storageState files for each role
│   ├── test-data.ts          # Seed user constants
│   └── base.fixture.ts       # Extended test fixture with page objects
├── page-objects/
│   ├── login.page.ts
│   ├── register.page.ts
│   ├── facility-wizard.page.ts
│   ├── child-form.page.ts
│   ├── enrollment-wizard.page.ts
│   ├── document-template.page.ts
│   ├── send-document.page.ts
│   └── sign-document.page.ts
└── specs/
    ├── 01-user-registration.spec.ts
    ├── 02-user-sign-in.spec.ts
    ├── 03-create-facility.spec.ts
    ├── 04-create-children.spec.ts
    ├── 05-enrollment.spec.ts
    ├── 06-document-management.spec.ts
    └── 07-parent-signs-document.spec.ts
```

## Element Selection Strategy

Use selectors in this priority order:

| Priority | Strategy | Example | When to Use |
|----------|----------|---------|-------------|
| 1 | `#id` | `page.locator('#email')` | Input fields with `id` attributes |
| 2 | `getByRole` | `page.getByRole('button', { name: 'Sign In' })` | Buttons, links, headings |
| 3 | `getByLabel` | `page.getByLabel('Email')` | Form fields with `<Label>` |
| 4 | `getByText` | `page.getByText('Forgot password?')` | Static text, links without roles |
| 5 | `data-testid` | `page.getByTestId('error-msg')` | Last resort — requires code changes |

### Why `#id` First?

This app already uses `id` attributes on every form field (`#email`, `#password`, `#firstName`, etc.). These are stable, unique, and fast — no need to add `data-testid` when `id` already exists.

## Auth State Management

### `e2e/fixtures/auth.setup.ts`

```ts
import { test as setup, expect } from "@playwright/test";
import { USERS } from "./test-data";

const roles = ["parent", "admin", "staff"] as const;

for (const role of roles) {
  setup(`authenticate as ${role}`, async ({ page }) => {
    const user = USERS[role];
    await page.goto("/login");
    await page.locator("#email").fill(user.email);
    await page.locator("#password").fill(user.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL(user.dashboardPath);
    await page.context().storageState({ path: user.storageStatePath });
  });
}
```

### Using Storage State in Tests

```ts
import { test } from "@playwright/test";
import { USERS } from "../fixtures/test-data";

test.use({ storageState: USERS.parent.storageStatePath });

test("parent dashboard loads", async ({ page }) => {
  await page.goto("/parent");
  await expect(page).toHaveURL("/parent");
});
```

## Page Object Model

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

## Waiting Strategies

### Do

```ts
// Auto-wait — Playwright waits automatically for elements
await page.locator("#email").fill("test@example.com");

// Wait for navigation
await page.waitForURL("/parent");
await page.waitForURL(/\/facility\/.*\/edit/);

// Wait for element state
await expect(page.locator("#email")).toBeVisible();
await expect(page.getByRole("button", { name: "Submit" })).toBeEnabled();

// Wait for network
await page.waitForResponse((resp) =>
  resp.url().includes("/api/facilities") && resp.status() === 200
);
```

### Never Do

```ts
// NEVER use fixed timeouts
await page.waitForTimeout(2000); // Flaky and slow
```

## App-Specific Patterns

### Multi-Step Wizards

The facility creation and enrollment flows use multi-step wizards. Test step navigation:

```ts
// Fill step 1, click Continue
await page.locator("#name").fill("Test Facility");
await page.getByRole("button", { name: "Continue" }).click();

// Verify step 2 is shown
await expect(page.locator("#address")).toBeVisible();

// Go back and verify values persisted
await page.getByRole("button", { name: "Back" }).click();
await expect(page.locator("#name")).toHaveValue("Test Facility");
```

### Native `<select>` Elements

The registration form (`#role`) and child form (`#gender`) use native `<select>` — use `selectOption`:

```ts
await page.locator("#role").selectOption("admin");
await page.locator("#gender").selectOption("female");
```

### Radix UI Select

The document template form uses Radix UI Select for category. Radix renders a trigger button + a portal dropdown:

```ts
// Click the trigger
await page.locator("#category").click();
// Click the option in the portal
await page.getByRole("option", { name: "Policy" }).click();
```

### Radix UI Checkbox

The template form (`#isRequired`) and send document form (`#sendToAll`) use Radix Checkbox:

```ts
await page.locator("#isRequired").click();
// Verify checked state
await expect(page.locator("#isRequired")).toHaveAttribute("data-state", "checked");
```

### Cross-Role Testing (Multiple Browser Contexts)

For tests where admin and parent interact (enrollment approval, document signing):

```ts
import { test, expect, Browser } from "@playwright/test";
import { USERS } from "../fixtures/test-data";

test("admin approves enrollment, parent sees update", async ({ browser }) => {
  // Parent context
  const parentContext = await browser.newContext({
    storageState: USERS.parent.storageStatePath,
  });
  const parentPage = await parentContext.newPage();

  // Admin context
  const adminContext = await browser.newContext({
    storageState: USERS.admin.storageStatePath,
  });
  const adminPage = await adminContext.newPage();

  // ... test actions across both pages ...

  await parentContext.close();
  await adminContext.close();
});
```

## Test Data Constants

### `e2e/fixtures/test-data.ts`

```ts
import path from "path";

function storagePath(name: string) {
  return path.join(__dirname, `../.auth/${name}.json`);
}

export const USERS = {
  parent: {
    email: "parent@example.com",
    password: "12345678",
    name: "Parent User",
    dashboardPath: "/parent",
    storageStatePath: storagePath("parent"),
  },
  admin: {
    email: "facility@example.com",
    password: "12345678",
    name: "Facility Owner",
    dashboardPath: "/facility",
    storageStatePath: storagePath("admin"),
  },
  staff: {
    email: "staff@example.com",
    password: "12345678",
    name: "Staff Member",
    dashboardPath: "/staff",
    storageStatePath: storagePath("staff"),
  },
} as const;

export const FACILITY = {
  name: "Sunshine Kids Academy",
  address: "123 Elm Street",
  city: "Springfield",
  state: "IL",
  zipCode: "62701",
} as const;

export const CHILD = {
  firstName: "Alex",
  lastName: "User",
  dateOfBirth: "2022-03-15",
} as const;
```

## Running Tests

```bash
# Run all tests
npx playwright test

# Run a specific spec
npx playwright test e2e/specs/01-user-registration.spec.ts

# Run in headed mode (see the browser)
npx playwright test --headed

# Run with UI mode (interactive debugging)
npx playwright test --ui

# Run a specific test by name
npx playwright test -g "register as parent"

# Debug a test
npx playwright test --debug

# View last test report
npx playwright show-report
```
