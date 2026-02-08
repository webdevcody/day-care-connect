import { expect, type Page, type Locator } from "@playwright/test";

export class ChildFormPage {
  readonly page: Page;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly dateOfBirthInput: Locator;
  readonly genderSelect: Locator;
  readonly allergiesInput: Locator;
  readonly medicalNotesInput: Locator;
  readonly emergencyContactNameInput: Locator;
  readonly emergencyContactPhoneInput: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.firstNameInput = page.locator("#firstName");
    this.lastNameInput = page.locator("#lastName");
    this.dateOfBirthInput = page.locator("#dateOfBirth");
    this.genderSelect = page.locator("#gender");
    this.allergiesInput = page.locator("#allergies");
    this.medicalNotesInput = page.locator("#medicalNotes");
    this.emergencyContactNameInput = page.locator("#emergencyContactName");
    this.emergencyContactPhoneInput = page.locator("#emergencyContactPhone");
    this.submitButton = page.getByRole("button", { name: /Add Child|Save/ });
    this.cancelButton = page.getByRole("button", { name: "Cancel" });
    this.errorMessage = page.locator(".bg-destructive\\/10");
  }

  async goto() {
    await this.page.goto("/parent/children/new");
    await expect(this.firstNameInput).toBeVisible();
  }

  async fillRequired(data: { firstName: string; lastName: string; dateOfBirth: string }) {
    await this.firstNameInput.fill(data.firstName);
    await this.lastNameInput.fill(data.lastName);
    await this.dateOfBirthInput.fill(data.dateOfBirth);
  }

  async fillFull(data: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender?: string;
    allergies?: string;
    medicalNotes?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
  }) {
    await this.fillRequired(data);
    if (data.gender) await this.genderSelect.selectOption(data.gender);
    if (data.allergies) await this.allergiesInput.fill(data.allergies);
    if (data.medicalNotes) await this.medicalNotesInput.fill(data.medicalNotes);
    if (data.emergencyContactName) await this.emergencyContactNameInput.fill(data.emergencyContactName);
    if (data.emergencyContactPhone) await this.emergencyContactPhoneInput.fill(data.emergencyContactPhone);
  }
}
