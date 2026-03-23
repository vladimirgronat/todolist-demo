import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("Task CRUD", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("can add a task and see it in the list", async ({ page }) => {
    const taskTitle = `Test task ${Date.now()}`;
    await page.getByPlaceholder("What needs to be done?").fill(taskTitle);
    await page.getByRole("button", { name: "Add" }).click();

    await expect(page.getByText(taskTitle)).toBeVisible();
  });

  test("can change task state to finished", async ({ page }) => {
    const taskTitle = `Finish task ${Date.now()}`;
    await page.getByPlaceholder("What needs to be done?").fill(taskTitle);
    await page.getByRole("button", { name: "Add" }).click();
    await expect(page.getByText(taskTitle)).toBeVisible();

    const taskItem = page.locator("[data-testid='task-item']").filter({ hasText: taskTitle });
    await taskItem.getByLabel(`Change state of "${taskTitle}"`).selectOption("finished");

    // Completion photo prompt modal appears — skip it
    await page.getByRole("dialog").getByRole("button", { name: "Skip" }).click();

    // Verify task is now finished (line-through style or select value)
    await expect(taskItem.getByLabel(`Change state of "${taskTitle}"`)).toHaveValue("finished");
  });

  test("can edit a task title", async ({ page }) => {
    const originalTitle = `Edit task ${Date.now()}`;
    const updatedTitle = `Updated task ${Date.now()}`;

    await page.getByPlaceholder("What needs to be done?").fill(originalTitle);
    await page.getByRole("button", { name: "Add" }).click();
    await expect(page.getByText(originalTitle)).toBeVisible();

    const taskItem = page.locator("[data-testid='task-item']").filter({ hasText: originalTitle });
    await taskItem.getByRole("button", { name: "Edit" }).click();

    const input = taskItem.getByLabel("Edit task title");
    await input.clear();
    await input.fill(updatedTitle);
    await taskItem.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText(updatedTitle)).toBeVisible();
    await expect(page.getByText(originalTitle)).not.toBeVisible();
  });

  test("can filter tasks by status", async ({ page }) => {
    const taskTitle = `Filter task ${Date.now()}`;
    await page.getByPlaceholder("What needs to be done?").fill(taskTitle);
    await page.getByRole("button", { name: "Add" }).click();
    await expect(page.getByText(taskTitle)).toBeVisible();

    // Change task to finished via select + skip completion prompt
    const taskItem = page.locator("[data-testid='task-item']").filter({ hasText: taskTitle });
    await taskItem.getByLabel(`Change state of "${taskTitle}"`).selectOption("finished");
    await page.getByRole("dialog").getByRole("button", { name: "Skip" }).click();
    await expect(taskItem.getByLabel(`Change state of "${taskTitle}"`)).toHaveValue("finished");

    // Filter by "Finished" tab — task should be visible
    await page.getByRole("tab", { name: "Finished" }).click();
    await expect(page.getByText(taskTitle)).toBeVisible();

    // Filter by "Planned" tab — task should not be visible
    await page.getByRole("tab", { name: "Planned" }).click();
    await expect(page.getByText(taskTitle)).not.toBeVisible();

    // Filter by "All" tab — task should be visible again
    await page.getByRole("tab", { name: "All" }).click();
    await expect(page.getByText(taskTitle)).toBeVisible();
  });

  test("can delete a task", async ({ page }) => {
    const taskTitle = `Delete task ${Date.now()}`;
    await page.getByPlaceholder("What needs to be done?").fill(taskTitle);
    await page.getByRole("button", { name: "Add" }).click();
    await expect(page.getByText(taskTitle)).toBeVisible();

    const taskItem = page.locator("[data-testid='task-item']").filter({ hasText: taskTitle });
    await taskItem.getByRole("button", { name: "Delete" }).click();

    await expect(page.getByText(taskTitle)).not.toBeVisible();
  });
});
