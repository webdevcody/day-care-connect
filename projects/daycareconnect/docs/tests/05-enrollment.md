# Test Scenario: Enrollment

**Sources**:
- Parent enrollment wizard: `apps/web/src/routes/facilities/$facilityId/enroll.tsx`
- Admin enrollment management: `apps/web/src/routes/_facility/facility/$facilityId/enrollments.tsx`

**Routes**:
- Enrollment wizard: `/facilities/<facilityId>/enroll`
- Enrollment management: `/facility/<facilityId>/enrollments`

## Wizard Steps (Parent)

| Step | Title | Key Interactions |
|------|-------|-----------------|
| 1 — Child | Select Child | Click a child card to select it |
| 2 — Schedule | Schedule & Start Date | Click schedule type button, fill `#startDate` |
| 3 — Notes | Additional Notes | Fill `#notes` (optional) |
| 4 — Review | Review Application | Read-only summary, "Submit Application" button |

Navigation: "Next" advances (disabled until selection made), "Back" returns.

## Selectors

### Enrollment Wizard (Parent)

| Element | Selector |
|---------|----------|
| Child cards | Clickable cards showing child firstName/lastName |
| Next Button | `button:has-text("Next")` or `button:has-text("Review Application")` |
| Back Button | `button:has-text("Back")` |
| Schedule type buttons | Buttons with schedule labels (e.g., "full time", "part time") |
| Start Date | `#startDate` |
| Notes | `#notes` |
| Submit Button | `button:has-text("Submit Application")` |
| Add Child Link | `link:has-text("Add Child")` → `/parent/children/new` |

### Enrollment Management (Admin)

| Element | Selector |
|---------|----------|
| Status tabs | Tab buttons: "all", "pending", "approved", "active", "withdrawn", "rejected" |
| Review Button | `button:has-text("Review")` |
| Approve All | `button:has-text("Approve All")` |
| Reject All | `button:has-text("Reject All")` |
| Enrollment checkboxes | Checkbox components per enrollment row |

## Test Cases

### TC-ENROLL-01: Parent completes enrollment wizard

**Preconditions**: Logged in as parent, child "Alex User" exists, facility exists

```ts
test.use({ storageState: USERS.parent.storageStatePath });

test("parent enrolls child through 4-step wizard", async ({ page }) => {
  // Navigate to enrollment wizard for the seed facility
  await page.goto(`/facilities/${FACILITY_ID}/enroll`);

  // Step 1: Select child — click Alex User's card
  await page.getByText("Alex").click();
  await page.getByRole("button", { name: "Next" }).click();

  // Step 2: Select schedule type and start date
  await page.getByRole("button", { name: /full time/i }).click();
  await page.locator("#startDate").fill("2025-09-01");
  await page.getByRole("button", { name: "Next" }).click();

  // Step 3: Optional notes
  await page.locator("#notes").fill("Looking forward to enrollment!");
  await page.getByRole("button", { name: "Review Application" }).click();

  // Step 4: Review and submit
  await expect(page.getByText("Alex")).toBeVisible();
  await expect(page.getByText("full time")).toBeVisible();
  await page.getByRole("button", { name: "Submit Application" }).click();

  // Should redirect or show success
  await expect(page.getByText(/submitted|success/i)).toBeVisible();
});
```

### TC-ENROLL-02: Admin sees pending enrollment

**Preconditions**: An enrollment has been submitted by a parent

```ts
test("admin sees pending enrollment in management view", async ({ page }) => {
  await page.goto(`/facility/${FACILITY_ID}/enrollments`);

  // Click the pending tab
  await page.getByRole("tab", { name: /pending/i }).click();

  // Should see the enrollment entry
  await expect(page.getByText("Alex")).toBeVisible();
});
```

### TC-ENROLL-03: Admin approves enrollment

```ts
test("admin approves pending enrollment via review dialog", async ({ page }) => {
  await page.goto(`/facility/${FACILITY_ID}/enrollments`);
  await page.getByRole("tab", { name: /pending/i }).click();

  // Click Review on the pending enrollment
  await page.getByRole("button", { name: "Review" }).first().click();

  // In the review dialog, approve
  await page.getByRole("button", { name: /approve/i }).click();

  // Enrollment should move to approved/active
  await page.getByRole("tab", { name: /active/i }).click();
  await expect(page.getByText("Alex")).toBeVisible();
});
```

### TC-ENROLL-04: Admin rejects enrollment with reason

```ts
test("admin rejects pending enrollment with reason", async ({ page }) => {
  await page.goto(`/facility/${FACILITY_ID}/enrollments`);
  await page.getByRole("tab", { name: /pending/i }).click();

  await page.getByRole("button", { name: "Review" }).first().click();

  // Reject with reason
  await page.getByRole("button", { name: /reject/i }).click();

  // Verify it moved to rejected tab
  await page.getByRole("tab", { name: /rejected/i }).click();
  await expect(page.getByText("Alex")).toBeVisible();
});
```

### TC-ENROLL-05: No children available state

```ts
test("enrollment wizard shows empty state when no children", async ({ browser }) => {
  // Create a new parent context with no children
  const context = await browser.newContext({
    storageState: USERS.parent.storageStatePath,
  });
  const page = await context.newPage();

  // NOTE: This test assumes a parent user with no children
  // May need a separate test user or cleaned state
  await page.goto(`/facilities/${FACILITY_ID}/enroll`);

  // Should show Add Child link when no children available
  await expect(page.getByRole("link", { name: /Add Child/i })).toBeVisible();

  await context.close();
});
```

### TC-ENROLL-06: Next button disabled until child selected

```ts
test("Next button is disabled until a child is selected", async ({ page }) => {
  await page.goto(`/facilities/${FACILITY_ID}/enroll`);

  // Next button should be disabled initially
  await expect(page.getByRole("button", { name: "Next" })).toBeDisabled();

  // Select a child
  await page.getByText("Alex").click();

  // Now Next should be enabled
  await expect(page.getByRole("button", { name: "Next" })).toBeEnabled();
});
```

## Cross-Role Test Structure

For end-to-end enrollment tests that span parent and admin:

```ts
test("full enrollment flow: parent submits, admin approves", async ({ browser }) => {
  // Parent context
  const parentCtx = await browser.newContext({
    storageState: USERS.parent.storageStatePath,
  });
  const parentPage = await parentCtx.newPage();

  // Admin context
  const adminCtx = await browser.newContext({
    storageState: USERS.admin.storageStatePath,
  });
  const adminPage = await adminCtx.newPage();

  // 1. Parent submits enrollment
  await parentPage.goto(`/facilities/${FACILITY_ID}/enroll`);
  await parentPage.getByText("Alex").click();
  await parentPage.getByRole("button", { name: "Next" }).click();
  await parentPage.getByRole("button", { name: /full time/i }).click();
  await parentPage.locator("#startDate").fill("2025-09-01");
  await parentPage.getByRole("button", { name: "Next" }).click();
  await parentPage.getByRole("button", { name: "Review Application" }).click();
  await parentPage.getByRole("button", { name: "Submit Application" }).click();

  // 2. Admin approves
  await adminPage.goto(`/facility/${FACILITY_ID}/enrollments`);
  await adminPage.getByRole("tab", { name: /pending/i }).click();
  await adminPage.getByRole("button", { name: "Review" }).first().click();
  await adminPage.getByRole("button", { name: /approve/i }).click();

  // 3. Verify in active tab
  await adminPage.getByRole("tab", { name: /active/i }).click();
  await expect(adminPage.getByText("Alex")).toBeVisible();

  await parentCtx.close();
  await adminCtx.close();
});
```
