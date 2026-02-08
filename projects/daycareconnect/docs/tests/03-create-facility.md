# Test Scenario: Create Facility (5-Step Wizard)

**Source**: `apps/web/src/routes/_facility/facility/new.tsx`
**Route**: `/facility/new`
**Auth**: Facility admin (`facility@example.com`)

## Wizard Steps

| Step | Title | Key Fields |
|------|-------|------------|
| 1 — Basic Info | Basic Information | `#name`*, `#description`, `#phone`*, `#email`, `#website` |
| 2 — Address | Address | `#address`*, `#city`*, `#state`* (2-char, auto-uppercase), `#zipCode`* |
| 3 — Capacity & Pricing | Capacity & Pricing | `#capacity`*, `#ageRangeMin`, `#ageRangeMax`, `#hourlyRate`, `#dailyRate`, `#weeklyRate`, `#monthlyRate` |
| 4 — Licensing | Licensing | `#licenseNumber`, `#licenseExpiry`, `#licensingAuthority` |
| 5 — Review | Review & Create | Read-only summary; "Create Facility" button |

Navigation: "Continue" advances, "Back" returns, step indicator circles are clickable.

## Selectors

| Element | Selector |
|---------|----------|
| Facility Name | `#name` |
| Description | `#description` |
| Phone | `#phone` |
| Email (facility) | `#email` |
| Website | `#website` |
| Street Address | `#address` |
| City | `#city` |
| State | `#state` |
| Zip Code | `#zipCode` |
| Capacity | `#capacity` |
| Min Age | `#ageRangeMin` |
| Max Age | `#ageRangeMax` |
| Hourly Rate | `#hourlyRate` |
| Daily Rate | `#dailyRate` |
| Weekly Rate | `#weeklyRate` |
| Monthly Rate | `#monthlyRate` |
| License Number | `#licenseNumber` |
| License Expiry | `#licenseExpiry` |
| Licensing Authority | `#licensingAuthority` |
| Continue Button | `button:has-text("Continue")` |
| Back Button | `button:has-text("Back")` |
| Create Button | `button:has-text("Create Facility")` |
| Validation Error | `.text-destructive` |

## Page Object

```ts
// e2e/page-objects/facility-wizard.page.ts
import type { Page, Locator } from "@playwright/test";

export class FacilityWizardPage {
  readonly page: Page;

  // Step 1 — Basic Info
  readonly nameInput: Locator;
  readonly descriptionInput: Locator;
  readonly phoneInput: Locator;
  readonly emailInput: Locator;
  readonly websiteInput: Locator;

  // Step 2 — Address
  readonly addressInput: Locator;
  readonly cityInput: Locator;
  readonly stateInput: Locator;
  readonly zipCodeInput: Locator;

  // Step 3 — Capacity & Pricing
  readonly capacityInput: Locator;
  readonly monthlyRateInput: Locator;

  // Step 4 — Licensing
  readonly licenseNumberInput: Locator;
  readonly licenseExpiryInput: Locator;
  readonly licensingAuthorityInput: Locator;

  // Navigation
  readonly continueButton: Locator;
  readonly backButton: Locator;
  readonly createButton: Locator;
  readonly validationError: Locator;

  constructor(page: Page) {
    this.page = page;

    this.nameInput = page.locator("#name");
    this.descriptionInput = page.locator("#description");
    this.phoneInput = page.locator("#phone");
    this.emailInput = page.locator("#email");
    this.websiteInput = page.locator("#website");

    this.addressInput = page.locator("#address");
    this.cityInput = page.locator("#city");
    this.stateInput = page.locator("#state");
    this.zipCodeInput = page.locator("#zipCode");

    this.capacityInput = page.locator("#capacity");
    this.monthlyRateInput = page.locator("#monthlyRate");

    this.licenseNumberInput = page.locator("#licenseNumber");
    this.licenseExpiryInput = page.locator("#licenseExpiry");
    this.licensingAuthorityInput = page.locator("#licensingAuthority");

    this.continueButton = page.getByRole("button", { name: "Continue" });
    this.backButton = page.getByRole("button", { name: "Back" });
    this.createButton = page.getByRole("button", { name: "Create Facility" });
    this.validationError = page.locator(".text-destructive");
  }

  async goto() {
    await this.page.goto("/facility/new");
  }

  async fillBasicInfo(data: { name: string; phone: string; description?: string }) {
    await this.nameInput.fill(data.name);
    await this.phoneInput.fill(data.phone);
    if (data.description) await this.descriptionInput.fill(data.description);
    await this.continueButton.click();
  }

  async fillAddress(data: { address: string; city: string; state: string; zipCode: string }) {
    await this.addressInput.fill(data.address);
    await this.cityInput.fill(data.city);
    await this.stateInput.fill(data.state);
    await this.zipCodeInput.fill(data.zipCode);
    await this.continueButton.click();
  }

  async fillCapacity(data: { capacity?: number; monthlyRate?: string }) {
    if (data.capacity !== undefined) {
      await this.capacityInput.fill(String(data.capacity));
    }
    if (data.monthlyRate) await this.monthlyRateInput.fill(data.monthlyRate);
    await this.continueButton.click();
  }

  async fillLicensing(data: {
    licenseNumber?: string;
    licenseExpiry?: string;
    licensingAuthority?: string;
  }) {
    if (data.licenseNumber) await this.licenseNumberInput.fill(data.licenseNumber);
    if (data.licenseExpiry) await this.licenseExpiryInput.fill(data.licenseExpiry);
    if (data.licensingAuthority) await this.licensingAuthorityInput.fill(data.licensingAuthority);
    await this.continueButton.click();
  }

  /** Fill all steps and land on review */
  async completeAllSteps() {
    await this.fillBasicInfo({ name: "Test Facility", phone: "555-9999" });
    await this.fillAddress({ address: "456 Oak Ave", city: "Portland", state: "OR", zipCode: "97201" });
    await this.fillCapacity({ capacity: 30, monthlyRate: "1500" });
    await this.fillLicensing({ licenseNumber: "OR-2025-100", licenseExpiry: "2027-01-01", licensingAuthority: "Oregon DHS" });
  }
}
```

## Test Cases

### TC-FAC-01: Complete wizard end-to-end

**Preconditions**: Logged in as admin (`storageState: USERS.admin`)

```ts
test.use({ storageState: USERS.admin.storageStatePath });

test("create facility through all 5 steps", async ({ page }) => {
  const wizard = new FacilityWizardPage(page);
  await wizard.goto();

  // Step 1 — Basic Info
  await wizard.fillBasicInfo({ name: "Happy Days Daycare", phone: "555-0001" });
  await expect(wizard.addressInput).toBeVisible(); // now on step 2

  // Step 2 — Address
  await wizard.fillAddress({ address: "100 Pine St", city: "Austin", state: "TX", zipCode: "73301" });
  await expect(wizard.capacityInput).toBeVisible(); // step 3

  // Step 3 — Capacity & Pricing
  await wizard.fillCapacity({ capacity: 40, monthlyRate: "1100" });
  await expect(wizard.licenseNumberInput).toBeVisible(); // step 4

  // Step 4 — Licensing
  await wizard.fillLicensing({
    licenseNumber: "TX-2025-200",
    licenseExpiry: "2027-06-30",
    licensingAuthority: "Texas HHS",
  });

  // Step 5 — Review
  await expect(page.getByText("Happy Days Daycare")).toBeVisible();
  await expect(page.getByText("100 Pine St")).toBeVisible();

  await wizard.createButton.click();

  // Redirects to /facility/<id>/edit on success
  await page.waitForURL(/\/facility\/.*\/edit/);
});
```

### TC-FAC-02: Validation error on review submit with missing required fields

```ts
test("submitting with missing name shows validation error", async ({ page }) => {
  const wizard = new FacilityWizardPage(page);
  await wizard.goto();

  // Skip filling name, just navigate through
  await wizard.phoneInput.fill("555-0001");
  await wizard.continueButton.click();
  await wizard.fillAddress({ address: "100 Pine St", city: "Austin", state: "TX", zipCode: "73301" });
  await wizard.fillCapacity({});
  await wizard.fillLicensing({});

  // On review, click Create Facility
  await wizard.createButton.click();

  // Zod validation error appears
  await expect(wizard.validationError).toBeVisible();
});
```

### TC-FAC-03: Back/forth navigation preserves field values

```ts
test("navigating back preserves previously entered values", async ({ page }) => {
  const wizard = new FacilityWizardPage(page);
  await wizard.goto();

  await wizard.nameInput.fill("Preserve Test");
  await wizard.phoneInput.fill("555-1234");
  await wizard.continueButton.click();

  // Now on Address step — go back
  await wizard.backButton.click();

  // Values should be preserved (React state is not reset)
  await expect(wizard.nameInput).toHaveValue("Preserve Test");
  await expect(wizard.phoneInput).toHaveValue("555-1234");
});
```

### TC-FAC-04: State field auto-uppercases and limits to 2 characters

```ts
test("state field auto-uppercases and limits to 2 chars", async ({ page }) => {
  const wizard = new FacilityWizardPage(page);
  await wizard.goto();

  // Navigate to address step
  await wizard.fillBasicInfo({ name: "State Test", phone: "555-0000" });

  // Type lowercase with more than 2 chars
  await wizard.stateInput.fill("california");

  // Field should auto-uppercase and truncate to 2 chars
  // The onChange does: value.toUpperCase().slice(0, 2) and maxLength=2
  await expect(wizard.stateInput).toHaveValue("CA");
});
```
