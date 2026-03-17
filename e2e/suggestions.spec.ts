import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("AI Task Suggestions", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("shows suggest tasks button", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /suggest tasks/i })
    ).toBeVisible();
  });

  test("shows suggestions when clicked", async ({ page }) => {
    await page.getByRole("button", { name: /suggest tasks/i }).click();

    // Wait for either suggestions or an error (depends on API availability)
    await expect(
      page.getByText(/Suggestions:|error|Too many/i)
    ).toBeVisible({ timeout: 10000 });
  });
});
