# Test Scenario: Parent Signs Document

**Source**: `apps/web/src/routes/_parent/parent/documents/$documentId.tsx`
**Route**: `/parent/documents/<documentId>`
**Auth**: Parent (`parent@example.com`)

## Selectors

| Element | Selector | Type |
|---------|----------|------|
| Agree Checkbox | `#agree` | Radix Checkbox ("I have read and understand...") |
| Signature Name | `#signatureName` | Input[type=text] (placeholder: "e.g., Jane Doe") |
| Sign Button | `button:has-text("Sign Document")` | Button (disabled until agree + name >= 2 chars) |
| Signed Confirmation | `.border-green-200` | Card ("Signed by {name} on {date}") |
| Document Status | `DocumentStatusBadge` component | Badge showing pending/viewed/signed |
| Document Content | Markdown rendered via `react-markdown` | Content area |

## Sign Document Flow

1. Parent opens document → `markDocumentViewed` is called → status changes from `pending` to `viewed`
2. Parent checks `#agree` checkbox
3. Parent types full legal name in `#signatureName`
4. "Sign Document" button becomes enabled
5. Parent clicks "Sign Document" → status changes to `signed`
6. Green confirmation card (`.border-green-200`) appears with signature details
7. Sign section is hidden — document cannot be re-signed

## Test Cases

### TC-SIGN-01: Opening document marks it as viewed

**Preconditions**: Admin has sent a document to parent, document is in `pending` status

```ts
test.use({ storageState: USERS.parent.storageStatePath });

test("opening a document changes status from pending to viewed", async ({ page }) => {
  await page.goto("/parent/documents");

  // Click on a pending document
  await page.getByText("Photo Release Form").click();

  // Wait for the document detail page to load
  await page.waitForURL(/\/parent\/documents\/.+/);

  // The markDocumentViewed mutation fires on mount
  // Status should reflect "viewed"
  await expect(page.getByText(/viewed/i)).toBeVisible();
});
```

### TC-SIGN-02: Sign document with agree checkbox and signature name

```ts
test("parent signs document by checking agree and entering name", async ({ page }) => {
  await page.goto("/parent/documents");
  await page.getByText("Photo Release Form").click();
  await page.waitForURL(/\/parent\/documents\/.+/);

  // Check the agree checkbox
  await page.locator("#agree").click();
  await expect(page.locator("#agree")).toHaveAttribute("data-state", "checked");

  // Enter signature name
  await page.locator("#signatureName").fill("Parent User");

  // Sign button should now be enabled
  await expect(page.getByRole("button", { name: "Sign Document" })).toBeEnabled();

  // Click sign
  await page.getByRole("button", { name: "Sign Document" }).click();

  // Should show signed confirmation
  await expect(page.locator(".border-green-200")).toBeVisible();
  await expect(page.getByText(/Signed by Parent User/)).toBeVisible();
});
```

### TC-SIGN-03: Signed confirmation card displays correctly

```ts
test("signed confirmation card shows signature details in green card", async ({ page }) => {
  // Navigate to an already-signed document
  await page.goto("/parent/documents");
  await page.getByText("Photo Release Form").click();
  await page.waitForURL(/\/parent\/documents\/.+/);

  const signedCard = page.locator(".border-green-200");
  await expect(signedCard).toBeVisible();
  await expect(signedCard).toContainText("Signed by");
  // Date should be present
  await expect(signedCard).toContainText(/\d{1,2}/);
});
```

### TC-SIGN-04: Sign button is progressively enabled

```ts
test("sign button disabled until agree is checked AND name is >= 2 chars", async ({ page }) => {
  await page.goto("/parent/documents");
  await page.getByText("Photo Release Form").click();
  await page.waitForURL(/\/parent\/documents\/.+/);

  const signButton = page.getByRole("button", { name: "Sign Document" });

  // Initially disabled
  await expect(signButton).toBeDisabled();

  // Check agree only — still disabled (no name)
  await page.locator("#agree").click();
  await expect(signButton).toBeDisabled();

  // Type 1 char — still disabled
  await page.locator("#signatureName").fill("A");
  await expect(signButton).toBeDisabled();

  // Type 2+ chars — now enabled
  await page.locator("#signatureName").fill("AB");
  await expect(signButton).toBeEnabled();

  // Uncheck agree — disabled again
  await page.locator("#agree").click();
  await expect(signButton).toBeDisabled();
});
```

### TC-SIGN-05: Signed document cannot be re-signed

```ts
test("signed document hides the sign section", async ({ page }) => {
  // Navigate to an already-signed document
  await page.goto("/parent/documents");
  await page.getByText("Photo Release Form").click();
  await page.waitForURL(/\/parent\/documents\/.+/);

  // The sign form should not be visible for an already-signed doc
  await expect(page.locator("#agree")).not.toBeVisible();
  await expect(page.locator("#signatureName")).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Sign Document" })).not.toBeVisible();

  // Instead, the signed confirmation should show
  await expect(page.locator(".border-green-200")).toBeVisible();
});
```

### TC-SIGN-06: Full end-to-end cross-role document signing flow

```ts
test("admin creates & sends document, parent views and signs it", async ({ browser }) => {
  // --- Admin context ---
  const adminCtx = await browser.newContext({
    storageState: USERS.admin.storageStatePath,
  });
  const adminPage = await adminCtx.newPage();

  // 1. Admin creates template
  await adminPage.goto(`/facility/${FACILITY_ID}/documents`);
  await adminPage.getByRole("button", { name: /Create Template|New Template/i }).click();
  await adminPage.locator("#title").fill("Safety Agreement");
  await adminPage.locator("#category").click();
  await adminPage.getByRole("option", { name: /policy/i }).click();
  await adminPage.locator("#isRequired").click();
  await adminPage.locator("#content").fill("# Safety Agreement\n\nI agree to follow all safety policies.");
  await adminPage.getByRole("button", { name: "Create Template" }).click();
  await expect(adminPage.getByText("Safety Agreement")).toBeVisible();

  // 2. Admin sends document to all parents
  await adminPage.goto(`/facility/${FACILITY_ID}/documents/send`);
  await adminPage.getByRole("combobox").click();
  await adminPage.getByRole("option", { name: /Safety Agreement/i }).click();
  await adminPage.locator("#sendToAll").click();
  await adminPage.getByRole("button", { name: "Send Document" }).click();
  await expect(adminPage.locator(".border-green-200")).toBeVisible();

  // --- Parent context ---
  const parentCtx = await browser.newContext({
    storageState: USERS.parent.storageStatePath,
  });
  const parentPage = await parentCtx.newPage();

  // 3. Parent sees the document
  await parentPage.goto("/parent/documents");
  await expect(parentPage.getByText("Safety Agreement")).toBeVisible();

  // 4. Parent opens it (triggers markDocumentViewed)
  await parentPage.getByText("Safety Agreement").click();
  await parentPage.waitForURL(/\/parent\/documents\/.+/);

  // 5. Parent signs it
  await parentPage.locator("#agree").click();
  await parentPage.locator("#signatureName").fill("Parent User");
  await parentPage.getByRole("button", { name: "Sign Document" }).click();

  // 6. Verify signed confirmation
  await expect(parentPage.locator(".border-green-200")).toBeVisible();
  await expect(parentPage.getByText(/Signed by Parent User/)).toBeVisible();

  // 7. Verify sign form is gone (can't re-sign)
  await expect(parentPage.locator("#agree")).not.toBeVisible();

  await adminCtx.close();
  await parentCtx.close();
});
```
