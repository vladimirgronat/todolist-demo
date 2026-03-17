import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskItem } from "@/components/task-item";
import type { Task } from "@/types/task";

const mockToggleTask = vi.fn();
const mockDeleteTask = vi.fn();
const mockUpdateTask = vi.fn();

vi.mock("@/app/actions/tasks", () => ({
  toggleTask: (...args: unknown[]) => mockToggleTask(...args),
  deleteTask: (...args: unknown[]) => mockDeleteTask(...args),
  updateTask: (...args: unknown[]) => mockUpdateTask(...args),
}));

const mockTask: Task = {
  id: "task-1",
  user_id: "user-1",
  title: "Test task",
  description: "Test description",
  completed: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockToggleTask.mockResolvedValue({ error: null });
  mockDeleteTask.mockResolvedValue({ error: null });
  mockUpdateTask.mockResolvedValue({ error: null });
});

describe("TaskItem", () => {
  it("renders task title and description", () => {
    render(<TaskItem task={mockTask} />);
    expect(screen.getByText("Test task")).toBeInTheDocument();
    expect(screen.getByText("Test description")).toBeInTheDocument();
  });

  it("shows strikethrough for completed tasks", () => {
    render(<TaskItem task={{ ...mockTask, completed: true }} />);
    const title = screen.getByText("Test task");
    expect(title).toHaveClass("line-through");
  });

  it("calls toggleTask when checkbox is clicked", async () => {
    const user = userEvent.setup();
    render(<TaskItem task={mockTask} />);

    await user.click(
      screen.getByLabelText('Mark "Test task" as completed')
    );
    expect(mockToggleTask).toHaveBeenCalledWith("task-1", false);
  });

  it("calls deleteTask when delete button is clicked", async () => {
    const user = userEvent.setup();
    render(<TaskItem task={mockTask} />);

    await user.click(screen.getByLabelText('Delete "Test task"'));
    expect(mockDeleteTask).toHaveBeenCalledWith("task-1");
  });

  it("enters edit mode and saves", async () => {
    const user = userEvent.setup();
    render(<TaskItem task={mockTask} />);

    await user.click(screen.getByLabelText('Edit "Test task"'));
    expect(screen.getByLabelText("Edit task title")).toBeInTheDocument();

    const titleInput = screen.getByLabelText("Edit task title");
    await user.clear(titleInput);
    await user.type(titleInput, "Updated task");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(mockUpdateTask).toHaveBeenCalled();
  });
});
