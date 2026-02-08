# Test Scenario: Create Children

**Source**: `apps/web/src/components/children/child-form.tsx`
**Route**: `/parent/children/new`
**Auth**: Parent (`parent@example.com`)

## Selectors

| Element | Selector | Type |
|---------|----------|------|
| First Name | `#firstName` | Input (required, name="firstName") |
| Last Name | `#lastName` | Input (required, name="lastName") |
| Date of Birth | `#dateOfBirth` | Input[type=date] (required, name="dateOfBirth") |
| Gender | `#gender` | Native `<select>` (options: "", male, female, other) |
| Allergies | `#allergies` | Textarea (name="allergies") |
| Medical Notes | `#medicalNotes` | Textarea (name="medicalNotes") |
| Emergency Contact Name | `#emergencyContactName` | Input (name="emergencyContactName") |
| Emergency Contact Phone | `#emergencyContactPhone` | Input[type=tel] (name="emergencyContactPhone") |
| Save Button | `button:has-text("Save")` | Submit button (or custom `submitLabel`) |
| Cancel Button | `button:has-text("Cancel")` | Navigates to `/parent/children` |
| Error Message | `.bg-destructive\\/10` | Div |

## Page Object

```ts
// e2e/page-objects/child-form.page.ts
import type { Page, Locator } from "@playwright/test";

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
  readonly saveButton: Locator;
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
    this.saveButton = page.getByRole("button", { name: /Save|Add Child/ });
    this.cancelButton = page.getByRole("button", { name: "Cancel" });
    this.errorMessage = page.locator(".bg-destructive\\/10");
  }

  async goto() {
    await this.page.goto("/parent/children/new");
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
```

## Test Cases

### TC-CHILD-01: Add child with required fields only

**Preconditions**: Logged in as parent

```ts
test.use({ storageState: USERS.parent.storageStatePath });

test("add child with required fields", async ({ page }) => {
  const childForm = new ChildFormPage(page);
  await childForm.goto();

  await childForm.fillRequired({
    firstName: "Emma",
    lastName: "Smith",
    dateOfBirth: "2021-06-15",
  });

  await childForm.saveButton.click();

  // Should redirect to children list
  await page.waitForURL("/parent/children");
  await expect(page.getByText("Emma")).toBeVisible();
});
```

### TC-CHILD-02: Add child with full details

```ts
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

  await childForm.saveButton.click();
  await page.waitForURL("/parent/children");
  await expect(page.getByText("Liam")).toBeVisible();
});
```

### TC-CHILD-03: Verify seed child appears in list

**Preconditions**: Seed data includes child "Alex User"

```ts
test("seed child Alex User appears in children list", async ({ page }) => {
  await page.goto("/parent/children");

  await expect(page.getByText("Alex")).toBeVisible();
  await expect(page.getByText("User")).toBeVisible();
});
```

### TC-CHILD-04: Cancel returns to list without saving

```ts
test("cancel navigates back without saving", async ({ page }) => {
  const childForm = new ChildFormPage(page);
  await childForm.goto();

  await childForm.firstNameInput.fill("Should Not Save");
  await childForm.cancelButton.click();

  await page.waitForURL("/parent/children");
  await expect(page.getByText("Should Not Save")).not.toBeVisible();
});
```

### TC-CHILD-05: Required field validation

```ts
test("submitting without required fields triggers validation", async ({ page }) => {
  const childForm = new ChildFormPage(page);
  await childForm.goto();

  // Leave required fields empty, click Save
  await childForm.saveButton.click();

  // Browser HTML5 validation prevents submission
  await expect(page).toHaveURL(/\/parent\/children\/new/);
});
```

### TC-CHILD-06: Navigate from children list "Add Child" button

```ts
test("Add Child button on list navigates to new child form", async ({ page }) => {
  await page.goto("/parent/children");

  await page.getByRole("link", { name: /Add Child/i }).click();

  await page.waitForURL("/parent/children/new");
  await expect(page.locator("#firstName")).toBeVisible();
});
```
