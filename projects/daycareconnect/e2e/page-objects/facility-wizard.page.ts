import { expect, type Page, type Locator } from "@playwright/test";

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
    await expect(this.nameInput).toBeVisible();
  }

  async fillBasicInfo(data: { name: string; phone: string; description?: string }) {
    await expect(this.nameInput).toBeVisible();
    await this.nameInput.fill(data.name);
    await this.phoneInput.fill(data.phone);
    if (data.description) await this.descriptionInput.fill(data.description);
    await this.continueButton.click();
  }

  async fillAddress(data: { address: string; city: string; state: string; zipCode: string }) {
    await expect(this.addressInput).toBeVisible();
    await this.addressInput.fill(data.address);
    await this.cityInput.fill(data.city);
    await this.stateInput.fill(data.state);
    await this.zipCodeInput.fill(data.zipCode);
    await this.continueButton.click();
  }

  async fillCapacity(data?: { capacity?: number; monthlyRate?: string }) {
    await expect(this.capacityInput).toBeVisible();
    if (data?.capacity !== undefined) {
      await this.capacityInput.fill(String(data.capacity));
    }
    if (data?.monthlyRate) await this.monthlyRateInput.fill(data.monthlyRate);
    await this.continueButton.click();
  }

  async fillLicensing(data?: {
    licenseNumber?: string;
    licenseExpiry?: string;
    licensingAuthority?: string;
  }) {
    await expect(this.licenseNumberInput).toBeVisible();
    if (data?.licenseNumber) await this.licenseNumberInput.fill(data.licenseNumber);
    if (data?.licenseExpiry) await this.licenseExpiryInput.fill(data.licenseExpiry);
    if (data?.licensingAuthority) await this.licensingAuthorityInput.fill(data.licensingAuthority);
    await this.continueButton.click();
  }
}
