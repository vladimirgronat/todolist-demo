import type { Page } from "@playwright/test";

export const login = async (
  page: Page,
  email = "test@example.com",
  password = "testpassword123"
) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL("/");
};
