import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskFilterTabs } from "@/components/task-filter";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("TaskFilterTabs", () => {
  it("renders all three filter tabs", () => {
    render(<TaskFilterTabs />);
    expect(screen.getByRole("tab", { name: "All" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Active" })).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "Completed" })
    ).toBeInTheDocument();
  });

  it("marks 'All' as selected by default", () => {
    render(<TaskFilterTabs />);
    expect(screen.getByRole("tab", { name: "All" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  it("navigates when a filter tab is clicked", async () => {
    const user = userEvent.setup();
    render(<TaskFilterTabs />);

    await user.click(screen.getByRole("tab", { name: "Active" }));
    expect(mockPush).toHaveBeenCalledWith("/?filter=active");

    await user.click(screen.getByRole("tab", { name: "Completed" }));
    expect(mockPush).toHaveBeenCalledWith("/?filter=completed");
  });

  it("removes filter param when 'All' is clicked", async () => {
    const user = userEvent.setup();
    render(<TaskFilterTabs />);

    await user.click(screen.getByRole("tab", { name: "All" }));
    expect(mockPush).toHaveBeenCalledWith("/?");
  });
});
