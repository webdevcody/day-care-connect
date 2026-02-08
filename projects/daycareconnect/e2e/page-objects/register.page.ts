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
