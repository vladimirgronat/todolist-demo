import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskForm } from "@/components/task-form";

const mockCreateTask = vi.fn();

vi.mock("@/app/actions/tasks", () => ({
  createTask: (...args: unknown[]) => mockCreateTask(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("TaskForm", () => {
  it("renders the form", () => {
    render(<TaskForm />);
    expect(screen.getByLabelText("Task title")).toBeInTheDocument();
    expect(screen.getByLabelText("Task description")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });

  it("calls createTask on submit", async () => {
    mockCreateTask.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    render(<TaskForm />);

    await user.type(screen.getByLabelText("Task title"), "New task");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(mockCreateTask).toHaveBeenCalled();
    const formData = mockCreateTask.mock.calls[0][0] as FormData;
    expect(formData.get("title")).toBe("New task");
  });

  it("shows error when createTask returns error", async () => {
    mockCreateTask.mockResolvedValue({ error: "Title is required" });
    const user = userEvent.setup();
    render(<TaskForm />);

    await user.type(screen.getByLabelText("Task title"), "x");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Title is required"
    );
  });
});
