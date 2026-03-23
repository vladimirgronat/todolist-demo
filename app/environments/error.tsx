"use client";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function EnvironmentsError({ error, reset }: ErrorProps) {
  console.error(error);

  return (
    <main className="mx-auto flex max-w-md flex-col items-center justify-center px-4 py-24 text-center">
      <div className="rounded-2xl bg-white p-8 shadow-sm dark:bg-gray-900">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-950">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-red-600 dark:text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>
        <h2 className="text-lg font-semibold dark:text-gray-100">
          Something went wrong
        </h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Could not load environments. Please try again.
        </p>
        <button
          onClick={reset}
          className="mt-6 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 ease-out hover:bg-blue-700 active:bg-blue-800 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
