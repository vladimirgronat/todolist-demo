"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { CategoryTreeNode } from "@/types/category";
import { CategoryForm } from "./category-form";
import { deleteCategory } from "@/app/actions/categories";

interface CategoryTreeProps {
  categories: CategoryTreeNode[];
  environmentId: string;
}

export const CategoryTree = ({
  categories,
  environmentId,
}: CategoryTreeProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("category");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showRootForm, setShowRootForm] = useState(false);

  const handleSelect = (categoryId: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (categoryId) {
      params.set("category", categoryId);
    } else {
      params.delete("category");
    }
    router.push(`/?${params.toString()}`);
    setMobileOpen(false);
  };

  return (
    <nav aria-label="Categories">
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="flex w-full items-center justify-between rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 md:hidden dark:border-gray-700 dark:text-gray-300"
        aria-expanded={mobileOpen}
      >
        <span>Categories</span>
        <svg
          className={`h-4 w-4 transition-transform duration-200 ${mobileOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Tree content */}
      <div
        className={`${mobileOpen ? "mt-2 block" : "hidden"} md:block`}
      >
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Categories
        </h2>
        <ul className="flex flex-col gap-0.5" role="tree">
          <li role="treeitem" aria-selected={!selectedId}>
            <button
              onClick={() => handleSelect(null)}
              className={`w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors duration-150 ${
                !selectedId
                  ? "bg-blue-50 font-medium text-blue-600 dark:bg-blue-950 dark:text-blue-400"
                  : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              }`}
            >
              All
            </button>
          </li>
          <li role="treeitem" aria-selected={selectedId === "uncategorized"}>
            <button
              onClick={() => handleSelect("uncategorized")}
              className={`w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors duration-150 ${
                selectedId === "uncategorized"
                  ? "bg-blue-50 font-medium text-blue-600 dark:bg-blue-950 dark:text-blue-400"
                  : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              }`}
            >
              Uncategorized
            </button>
          </li>

          {categories.map((node) => (
            <TreeNode
              key={node.id}
              node={node}
              selectedId={selectedId}
              onSelect={handleSelect}
              environmentId={environmentId}
              depth={0}
            />
          ))}
        </ul>

        {/* Add root category */}
        <div className="mt-3 border-t border-gray-200 pt-3 dark:border-gray-800">
          {showRootForm ? (
            <CategoryForm
              environmentId={environmentId}
              onDone={() => setShowRootForm(false)}
            />
          ) : (
            <button
              onClick={() => setShowRootForm(true)}
              className="flex items-center gap-1 text-xs text-gray-500 transition-colors duration-150 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add category
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

interface TreeNodeProps {
  node: CategoryTreeNode;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  environmentId: string;
  depth: number;
}

const TreeNode = ({
  node,
  selectedId,
  onSelect,
  environmentId,
  depth,
}: TreeNodeProps) => {
  const [expanded, setExpanded] = useState(true);
  const [showAddChild, setShowAddChild] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const hasChildren = node.children.length > 0;
  const isSelected = selectedId === node.id;

  const handleDelete = async () => {
    await deleteCategory(node.id);
    setConfirmDelete(false);
  };

  return (
    <li role="treeitem" aria-selected={isSelected} aria-expanded={hasChildren ? expanded : undefined}>
      <div
        className="group flex items-center gap-0.5"
        style={{ paddingLeft: `${depth * 16}px` }}
      >
        {/* Expand/collapse toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-gray-400 transition-colors duration-150 hover:text-gray-600 dark:hover:text-gray-300 ${
            !hasChildren ? "invisible" : ""
          }`}
          aria-label={expanded ? "Collapse" : "Expand"}
          tabIndex={hasChildren ? 0 : -1}
        >
          <svg
            className={`h-3 w-3 transition-transform duration-150 ${expanded ? "rotate-90" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>

        {/* Category name */}
        <button
          onClick={() => onSelect(node.id)}
          className={`flex-1 truncate rounded-md px-1.5 py-1 text-left text-sm transition-colors duration-150 ${
            isSelected
              ? "bg-blue-50 font-medium text-blue-600 dark:bg-blue-950 dark:text-blue-400"
              : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          }`}
        >
          {node.name}
        </button>

        {/* Actions (visible on hover) */}
        <div className="flex shrink-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          <button
            onClick={() => setShowAddChild(!showAddChild)}
            className="rounded p-0.5 text-gray-400 transition-colors duration-150 hover:text-blue-600 dark:hover:text-blue-400"
            aria-label={`Add subcategory under ${node.name}`}
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="rounded p-0.5 text-gray-400 transition-colors duration-150 hover:text-red-600 dark:hover:text-red-400"
              aria-label={`Delete ${node.name}`}
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          ) : (
            <button
              onClick={handleDelete}
              className="rounded px-1 text-xs font-medium text-red-600 transition-colors duration-150 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
              aria-label={`Confirm delete ${node.name}`}
            >
              ✓
            </button>
          )}
        </div>
      </div>

      {/* Inline add child form */}
      {showAddChild && (
        <div style={{ paddingLeft: `${(depth + 1) * 16 + 20}px` }} className="mt-1">
          <CategoryForm
            environmentId={environmentId}
            parentId={node.id}
            onDone={() => setShowAddChild(false)}
          />
        </div>
      )}

      {/* Children */}
      {hasChildren && expanded && (
        <ul role="group">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              selectedId={selectedId}
              onSelect={onSelect}
              environmentId={environmentId}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
};
