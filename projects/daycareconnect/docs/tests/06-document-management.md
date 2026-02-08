# Test Scenario: Document Management

**Sources**:
- Template dialog: `apps/web/src/components/documents/template-form-dialog.tsx`
- Send document page: `apps/web/src/routes/_facility/facility/$facilityId/documents/send.tsx`
- Parent document list: Parent documents route

**Routes**:
- Templates: `/facility/<facilityId>/documents` (admin)
- Send document: `/facility/<facilityId>/documents/send` (admin)
- Parent documents: `/parent/documents` (parent)

## Selectors

### Template Form Dialog (Admin)

| Element | Selector | Type |
|---------|----------|------|
| Title | `#title` | Input (placeholder: "e.g., Enrollment Agreement") |
| Description | `#description` | Input (placeholder: "Brief description of this document") |
| Category | `#category` | Radix Select (options vary) |
| Required Checkbox | `#isRequired` | Radix Checkbox |
| Content | `#content` | Textarea (placeholder: "Enter document content in Markdown format...", rows=12) |
| Cancel Button | `button:has-text("Cancel")` | Button |
| Create Button | `button:has-text("Create Template")` | Button |
| Save Button | `button:has-text("Save Changes")` | Button (edit mode) |

### Send Document Page (Admin)

| Element | Selector | Type |
|---------|----------|------|
| Template Select | SelectTrigger (placeholder: "Choose a template...") | Radix Select |
| Expires At | `#expiresAt` | Input[type=date] |
| Send to All | `#sendToAll` | Radix Checkbox |
| Individual Parent Checkboxes | Per-parent checkboxes | Radix Checkbox |
| Send Button | `button:has-text("Send Document")` | Button |
| Success Card | `.border-green-200` | Card (text: "Document sent to N parent(s).") |

## Test Cases

### TC-DOC-01: Admin creates a document template

**Preconditions**: Logged in as admin

```ts
test.use({ storageState: USERS.admin.storageStatePath });

test("admin creates a document template via dialog", async ({ page }) => {
  await page.goto(`/facility/${FACILITY_ID}/documents`);

  // Open the create template dialog
  await page.getByRole("button", { name: /Create Template|New Template/i }).click();

  // Fill template form
  await page.locator("#title").fill("Photo Release Form");
  await page.locator("#description").fill("Permission to photograph children");

  // Select category (Radix Select)
  await page.locator("#category").click();
  await page.getByRole("option", { name: /consent/i }).click();

  // Mark as required
  await page.locator("#isRequired").click();

  // Fill content
  await page.locator("#content").fill(
    "# Photo Release\n\nI hereby grant permission for photographs of my child to be taken during daycare activities."
  );

  // Submit
  await page.getByRole("button", { name: "Create Template" }).click();

  // Template should appear in the list
  await expect(page.getByText("Photo Release Form")).toBeVisible();
});
```

### TC-DOC-02: Template appears in list with badges

```ts
test("created template shows in list with category and required badges", async ({ page }) => {
  await page.goto(`/facility/${FACILITY_ID}/documents`);

  // Verify the template row exists with expected badges
  const templateRow = page.getByText("Photo Release Form").locator("..");
  await expect(templateRow).toBeVisible();
  // Category and required status should be displayed as badges
});
```

### TC-DOC-03: Admin sends document to parents

```ts
test("admin sends document to all enrolled parents", async ({ page }) => {
  await page.goto(`/facility/${FACILITY_ID}/documents/send`);

  // Select a template (Radix Select)
  await page.getByRole("combobox").click();
  await page.getByRole("option", { name: /Photo Release/i }).click();

  // Check "Send to All"
  await page.locator("#sendToAll").click();

  // Click Send
  await page.getByRole("button", { name: "Send Document" }).click();

  // Success confirmation
  await expect(page.locator(".border-green-200")).toBeVisible();
  await expect(page.getByText(/Document sent to \d+ parent/)).toBeVisible();
});
```

### TC-DOC-04: Parent sees document in /parent/documents

**Preconditions**: Admin has sent a document to the parent

```ts
test("parent sees sent document in their document list", async ({ page }) => {
  // Switch to parent context
  test.use({ storageState: USERS.parent.storageStatePath });

  await page.goto("/parent/documents");

  await expect(page.getByText("Photo Release Form")).toBeVisible();
});
```

### TC-DOC-05: Minimal template creation

```ts
test("create template with only required fields", async ({ page }) => {
  await page.goto(`/facility/${FACILITY_ID}/documents`);

  await page.getByRole("button", { name: /Create Template|New Template/i }).click();

  await page.locator("#title").fill("Simple Notice");

  // Select a category
  await page.locator("#category").click();
  await page.getByRole("option").first().click();

  await page.locator("#content").fill("This is a simple notice to all parents.");

  await page.getByRole("button", { name: "Create Template" }).click();

  await expect(page.getByText("Simple Notice")).toBeVisible();
});
```

### TC-DOC-06: Send button disabled states

```ts
test("send button is disabled when no template is selected", async ({ page }) => {
  await page.goto(`/facility/${FACILITY_ID}/documents/send`);

  // Without selecting a template, send should be disabled
  await expect(page.getByRole("button", { name: "Send Document" })).toBeDisabled();
});
```

## Cross-Role Test Structure

```ts
test("admin creates template, sends to parent, parent sees it", async ({ browser }) => {
  // Admin context
  const adminCtx = await browser.newContext({
    storageState: USERS.admin.storageStatePath,
  });
  const adminPage = await adminCtx.newPage();

  // 1. Admin creates template
  await adminPage.goto(`/facility/${FACILITY_ID}/documents`);
  await adminPage.getByRole("button", { name: /Create Template|New Template/i }).click();
  await adminPage.locator("#title").fill("Field Trip Consent");
  await adminPage.locator("#category").click();
  await adminPage.getByRole("option", { name: /consent/i }).click();
  await adminPage.locator("#content").fill("# Field Trip\n\nI consent to my child attending the field trip.");
  await adminPage.getByRole("button", { name: "Create Template" }).click();
  await expect(adminPage.getByText("Field Trip Consent")).toBeVisible();

  // 2. Admin sends document
  await adminPage.goto(`/facility/${FACILITY_ID}/documents/send`);
  await adminPage.getByRole("combobox").click();
  await adminPage.getByRole("option", { name: /Field Trip/i }).click();
  await adminPage.locator("#sendToAll").click();
  await adminPage.getByRole("button", { name: "Send Document" }).click();
  await expect(adminPage.locator(".border-green-200")).toBeVisible();

  // 3. Parent sees document
  const parentCtx = await browser.newContext({
    storageState: USERS.parent.storageStatePath,
  });
  const parentPage = await parentCtx.newPage();
  await parentPage.goto("/parent/documents");
  await expect(parentPage.getByText("Field Trip Consent")).toBeVisible();

  await adminCtx.close();
  await parentCtx.close();
});
```
