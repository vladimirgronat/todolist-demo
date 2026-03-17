"use client";

import { useState } from "react";
import { signIn, signUp } from "@/lib/auth";
import { useRouter } from "next/navigation";

export const AuthForm = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        await signUp(email, password);
        setError("Check your email for a confirmation link.");
      } else {
        await signIn(email, password);
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm">
      <h1 className="text-2xl font-bold text-center">
        {isSignUp ? "Create Account" : "Sign In"}
      </h1>

      {error && (
        <div
          role="alert"
          className="rounded bg-red-100 px-4 py-2 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Email</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded border px-3 py-2"
          aria-label="Email"
          autoComplete="email"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Password</span>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded border px-3 py-2"
          aria-label="Password"
          autoComplete={isSignUp ? "new-password" : "current-password"}
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        className="rounded bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Loading…" : isSignUp ? "Sign Up" : "Sign In"}
      </button>

      <button
        type="button"
        onClick={() => {
          setIsSignUp(!isSignUp);
          setError(null);
        }}
        className="text-sm text-blue-600 hover:underline"
      >
        {isSignUp
          ? "Already have an account? Sign in"
          : "Don't have an account? Sign up"}
      </button>
    </form>
  );
};
