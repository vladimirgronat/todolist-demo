"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { Environment } from "@/types/environment";

interface EnvironmentSwitcherProps {
  environments: Environment[];
  activeEnvironmentId: string;
}

export const EnvironmentSwitcher = ({
  environments,
  activeEnvironmentId,
}: EnvironmentSwitcherProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("env", e.target.value);
    router.push(`/?${params.toString()}`);
  };

  if (environments.length <= 1) {
    return null;
  }

  return (
    <select
      value={activeEnvironmentId}
      onChange={handleChange}
      aria-label="Switch environment"
      className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 transition-colors hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-gray-600"
    >
      {environments.map((env) => (
        <option key={env.id} value={env.id}>
          {env.name}
        </option>
      ))}
    </select>
  );
};
