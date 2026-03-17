import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthForm } from "@/components/auth-form";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock auth functions
const mockSignIn = vi.fn();
const mockSignUp = vi.fn();

vi.mock("@/lib/auth", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
  signUp: (...args: unknown[]) => mockSignUp(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AuthForm", () => {
  it("renders sign in form by default", () => {
    render(<AuthForm />);
    expect(screen.getByRole("heading", { name: "Sign In" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("toggles between sign in and sign up", async () => {
    const user = userEvent.setup();
    render(<AuthForm />);

    await user.click(screen.getByText("Don't have an account? Sign up"));
    expect(screen.getByRole("heading", { name: "Create Account" })).toBeInTheDocument();

    await user.click(screen.getByText("Already have an account? Sign in"));
    expect(screen.getByRole("heading", { name: "Sign In" })).toBeInTheDocument();
  });

  it("calls signIn on submit in login mode", async () => {
    mockSignIn.mockResolvedValue({});
    const user = userEvent.setup();
    render(<AuthForm />);

    await user.type(screen.getByLabelText("Email"), "test@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    expect(mockSignIn).toHaveBeenCalledWith("test@example.com", "password123");
  });

  it("calls signUp on submit in signup mode", async () => {
    mockSignUp.mockResolvedValue({});
    const user = userEvent.setup();
    render(<AuthForm />);

    await user.click(screen.getByText("Don't have an account? Sign up"));
    await user.type(screen.getByLabelText("Email"), "test@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Sign Up" }));

    expect(mockSignUp).toHaveBeenCalledWith("test@example.com", "password123");
  });

  it("shows error message on failed sign in", async () => {
    mockSignIn.mockRejectedValue(new Error("Invalid credentials"));
    const user = userEvent.setup();
    render(<AuthForm />);

    await user.type(screen.getByLabelText("Email"), "test@example.com");
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Invalid credentials"
    );
  });
});
