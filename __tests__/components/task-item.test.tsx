import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskItem } from "@/components/task-item";
import type { Task } from "@/types/task";

const mockChangeTaskState = vi.fn();
const mockDeleteTask = vi.fn();
const mockUpdateTask = vi.fn();
const mockAcceptTaskAssignment = vi.fn();
const mockRefuseTaskAssignment = vi.fn();
const mockClearTaskAssignment = vi.fn();

vi.mock("@/app/actions/tasks", () => ({
  acceptTaskAssignment: (...args: unknown[]) => mockAcceptTaskAssignment(...args),
  changeTaskState: (...args: unknown[]) => mockChangeTaskState(...args),
  clearTaskAssignment: (...args: unknown[]) => mockClearTaskAssignment(...args),
  deleteTask: (...args: unknown[]) => mockDeleteTask(...args),
  refuseTaskAssignment: (...args: unknown[]) => mockRefuseTaskAssignment(...args),
  updateTask: (...args: unknown[]) => mockUpdateTask(...args),
}));

const mockTask: Task = {
  id: "task-1",
  user_id: "user-1",
  environment_id: "env-1",
  title: "Test task",
  description: "Test description",
  state: "planned",
  category_id: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockChangeTaskState.mockResolvedValue({ error: null });
  mockAcceptTaskAssignment.mockResolvedValue({ error: null });
  mockRefuseTaskAssignment.mockResolvedValue({ error: null });
  mockClearTaskAssignment.mockResolvedValue({ error: null });
  mockDeleteTask.mockResolvedValue({ error: null });
  mockUpdateTask.mockResolvedValue({ error: null });
});

describe("TaskItem", () => {
  it("renders task title and description", () => {
    render(<TaskItem task={mockTask} currentUserId="user-1" />);
    expect(screen.getByText("Test task")).toBeInTheDocument();
    expect(screen.getByText("Test description")).toBeInTheDocument();
  });

  it("shows strikethrough for finished tasks", () => {
    render(<TaskItem task={{ ...mockTask, state: "finished" }} currentUserId="user-1" />);
    const title = screen.getByText("Test task");
    expect(title).toHaveClass("line-through");
  });

  it("calls changeTaskState when state is changed", async () => {
    const user = userEvent.setup();
    render(<TaskItem task={mockTask} currentUserId="user-1" />);

    await user.selectOptions(
      screen.getByLabelText('Change state of "Test task"'),
      "in_progress"
    );
    expect(mockChangeTaskState).toHaveBeenCalledWith("task-1", "in_progress");
  });

  it("calls deleteTask when delete button is clicked", async () => {
    const user = userEvent.setup();
    render(<TaskItem task={mockTask} currentUserId="user-1" />);

    await user.click(screen.getByLabelText('Delete "Test task"'));
    expect(mockDeleteTask).toHaveBeenCalledWith("task-1");
  });

  it("enters edit mode and saves", async () => {
    const user = userEvent.setup();
    render(<TaskItem task={mockTask} currentUserId="user-1" />);

    await user.click(screen.getByLabelText('Edit "Test task"'));
    expect(screen.getByLabelText("Edit task title")).toBeInTheDocument();

    const titleInput = screen.getByLabelText("Edit task title");
    await user.clear(titleInput);
    await user.type(titleInput, "Updated task");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(mockUpdateTask).toHaveBeenCalled();
  });
});
