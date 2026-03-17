import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("Task CRUD", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("can add a task and see it in the list", async ({ page }) => {
    const taskTitle = `Test task ${Date.now()}`;
    await page.getByPlaceholder("Add a new task...").fill(taskTitle);
    await page.getByRole("button", { name: "Add Task" }).click();

    await expect(page.getByText(taskTitle)).toBeVisible();
  });

  test("can toggle a task as completed", async ({ page }) => {
    const taskTitle = `Toggle task ${Date.now()}`;
    await page.getByPlaceholder("Add a new task...").fill(taskTitle);
    await page.getByRole("button", { name: "Add Task" }).click();
    await expect(page.getByText(taskTitle)).toBeVisible();

    const taskItem = page.locator("[data-testid='task-item']").filter({ hasText: taskTitle });
    await taskItem.getByRole("checkbox").click();

    await expect(taskItem.getByRole("checkbox")).toBeChecked();
  });

  test("can edit a task title", async ({ page }) => {
    const originalTitle = `Edit task ${Date.now()}`;
    const updatedTitle = `Updated task ${Date.now()}`;

    await page.getByPlaceholder("Add a new task...").fill(originalTitle);
    await page.getByRole("button", { name: "Add Task" }).click();
    await expect(page.getByText(originalTitle)).toBeVisible();

    const taskItem = page.locator("[data-testid='task-item']").filter({ hasText: originalTitle });
    await taskItem.getByRole("button", { name: "Edit" }).click();

    const input = taskItem.getByRole("textbox");
    await input.clear();
    await input.fill(updatedTitle);
    await taskItem.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText(updatedTitle)).toBeVisible();
    await expect(page.getByText(originalTitle)).not.toBeVisible();
  });

  test("can filter tasks by status", async ({ page }) => {
    const taskTitle = `Filter task ${Date.now()}`;
    await page.getByPlaceholder("Add a new task...").fill(taskTitle);
    await page.getByRole("button", { name: "Add Task" }).click();

    const taskItem = page.locator("[data-testid='task-item']").filter({ hasText: taskTitle });
    await taskItem.getByRole("checkbox").click();

    await page.getByRole("link", { name: "Completed" }).click();
    await expect(page.getByText(taskTitle)).toBeVisible();

    await page.getByRole("link", { name: "Active" }).click();
    await expect(page.getByText(taskTitle)).not.toBeVisible();

    await page.getByRole("link", { name: "All" }).click();
    await expect(page.getByText(taskTitle)).toBeVisible();
  });

  test("can delete a task", async ({ page }) => {
    const taskTitle = `Delete task ${Date.now()}`;
    await page.getByPlaceholder("Add a new task...").fill(taskTitle);
    await page.getByRole("button", { name: "Add Task" }).click();
    await expect(page.getByText(taskTitle)).toBeVisible();

    const taskItem = page.locator("[data-testid='task-item']").filter({ hasText: taskTitle });
    await taskItem.getByRole("button", { name: "Delete" }).click();

    await expect(page.getByText(taskTitle)).not.toBeVisible();
  });
});
