import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("shows login page for unauthenticated users", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText("Sign In")).toBeVisible();
  });

  test("can toggle between Sign In and Sign Up", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("Sign In")).toBeVisible();

    await page.getByText("Don't have an account? Sign up").click();
    await expect(page.getByText("Create Account")).toBeVisible();

    await page.getByText("Already have an account? Sign in").click();
    await expect(page.getByText("Sign In")).toBeVisible();
  });

  test("shows error on invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("bad@example.com");
    await page.getByLabel("Password").fill("wrongpassword");
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page.getByRole("alert")).toBeVisible();
  });
});
