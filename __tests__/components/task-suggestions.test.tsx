import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskSuggestions } from "@/components/task-suggestions";

const mockSuggestTasks = vi.fn();
const mockCreateTask = vi.fn();

vi.mock("@/app/actions/suggest", () => ({
  suggestTasks: (...args: unknown[]) => mockSuggestTasks(...args),
}));

vi.mock("@/app/actions/tasks", () => ({
  createTask: (...args: unknown[]) => mockCreateTask(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockCreateTask.mockResolvedValue({ error: null });
});

describe("TaskSuggestions", () => {
  it("renders the suggest button", () => {
    render(<TaskSuggestions />);
    expect(
      screen.getByRole("button", { name: /suggest tasks/i })
    ).toBeInTheDocument();
  });

  it("shows suggestions after clicking", async () => {
    mockSuggestTasks.mockResolvedValue({
      suggestions: [
        { title: "Go for a run", description: "Morning jog" },
        { title: "Read a book", description: null },
      ],
      error: null,
    });

    const user = userEvent.setup();
    render(<TaskSuggestions />);

    await user.click(screen.getByRole("button", { name: /suggest tasks/i }));

    expect(await screen.findByText("Go for a run")).toBeInTheDocument();
    expect(screen.getByText("Read a book")).toBeInTheDocument();
  });

  it("calls createTask when Add is clicked on a suggestion", async () => {
    mockSuggestTasks.mockResolvedValue({
      suggestions: [{ title: "Go for a run", description: "Morning jog" }],
      error: null,
    });

    const user = userEvent.setup();
    render(<TaskSuggestions />);

    await user.click(screen.getByRole("button", { name: /suggest tasks/i }));
    await screen.findByText("Go for a run");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(mockCreateTask).toHaveBeenCalled();
  });

  it("shows error message on failure", async () => {
    mockSuggestTasks.mockResolvedValue({
      suggestions: [],
      error: "API unavailable",
    });

    const user = userEvent.setup();
    render(<TaskSuggestions />);

    await user.click(screen.getByRole("button", { name: /suggest tasks/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "API unavailable"
    );
  });
});
