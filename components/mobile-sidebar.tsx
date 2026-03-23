"use client";

import { useState } from "react";

interface MobileSidebarProps {
  children: React.ReactNode;
}

export const MobileSidebar = ({ children }: MobileSidebarProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="shrink-0 md:w-60">
      {/* Toggle button — only visible on mobile */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="mb-3 flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors duration-150 hover:bg-gray-50 active:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:active:bg-gray-700 md:hidden"
        aria-expanded={isOpen}
        aria-label="Toggle categories and filters"
      >
        <span className="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 text-gray-500 dark:text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 4a1 1 0 011-1h16a1 1 0 010 2H4a1 1 0 01-1-1zM6 10a1 1 0 011-1h10a1 1 0 010 2H7a1 1 0 01-1-1zM9 16a1 1 0 011-1h4a1 1 0 010 2h-4a1 1 0 01-1-1z"
            />
          </svg>
          Categories &amp; Filters
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-4 w-4 text-gray-400 transition-transform duration-200 dark:text-gray-500 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Sidebar content — always visible on md+, toggleable on mobile */}
      <div className={`${isOpen ? "block" : "hidden"} md:block`}>
        {children}
      </div>
    </div>
  );
};
