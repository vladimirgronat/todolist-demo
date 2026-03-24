import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("API Key Management", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("can navigate to API keys page", async ({ page }) => {
    await page.getByRole("link", { name: "API Keys" }).click();
    await page.waitForURL("/api-keys");

    await expect(
      page.getByRole("heading", { name: "API keys" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Create a new key" })
    ).toBeVisible();
    await expect(
      page.getByLabel("API key name")
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create API key" })
    ).toBeVisible();
  });

  test("can create an API key and see it in the list", async ({ page }) => {
    await page.goto("/api-keys");
    const keyName = `Test Key ${Date.now()}`;

    await page.getByLabel("API key name").fill(keyName);
    await page.getByRole("button", { name: "Create API key" }).click();

    // Raw key should be displayed with tdl_ prefix
    const rawKeyBlock = page.locator("code").filter({ hasText: "tdl_" });
    await expect(rawKeyBlock).toBeVisible();

    // Warning message should be shown
    await expect(
      page.getByRole("alert").filter({ hasText: "Copy this key now" })
    ).toBeVisible();

    // Copy button should be present
    await expect(page.getByRole("button", { name: "Copy" })).toBeVisible();

    // Click Done to dismiss
    await page.getByRole("button", { name: "Done" }).click();

    // Key should appear in the list
    await expect(page.getByText(keyName)).toBeVisible();
    await expect(page.getByText("Active")).toBeVisible();
  });

  test("can revoke an API key", async ({ page }) => {
    await page.goto("/api-keys");
    const keyName = `Revoke Key ${Date.now()}`;

    // Create a key first
    await page.getByLabel("API key name").fill(keyName);
    await page.getByRole("button", { name: "Create API key" }).click();
    await expect(page.locator("code").filter({ hasText: "tdl_" })).toBeVisible();
    await page.getByRole("button", { name: "Done" }).click();
    await expect(page.getByText(keyName)).toBeVisible();

    // Accept the confirm dialog when it appears
    page.on("dialog", (dialog) => dialog.accept());

    // Click Revoke on the key
    const keyRow = page.locator("div").filter({ hasText: keyName }).filter({ has: page.getByText("Active") });
    await keyRow.getByRole("button", { name: "Revoke" }).click();

    // Key should now show Revoked status
    await expect(page.getByText(keyName).locator("..").getByText("Revoked")).toBeVisible();

    // Revoke button should no longer be available for this key
    const revokedRow = page.locator("div").filter({ hasText: keyName }).filter({ has: page.getByText("Revoked") });
    await expect(revokedRow.getByRole("button", { name: "Revoke" })).not.toBeVisible();
  });

  test("can navigate back to tasks from API keys page", async ({ page }) => {
    await page.goto("/api-keys");
    await page.getByRole("link", { name: "Back to tasks" }).click();
    await page.waitForURL("/");
  });
});
