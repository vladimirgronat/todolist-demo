import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { TodoListApiClient } from "./api-client";

const server = new McpServer({
  name: "todolist-demo-mcp",
  version: "0.1.0",
});

const apiClient = new TodoListApiClient();

const uuidSchema = z.string().uuid();
const taskStateSchema = z.enum(["planned", "in_progress", "finished"]);
const taskListStateSchema = z.enum([
  "planned",
  "in_progress",
  "dependent",
  "finished",
]);
const assignmentStatusSchema = z.enum(["pending", "accepted", "refused"]);
const sortSchema = z.enum(["created_at", "updated_at", "title"]);
const orderSchema = z.enum(["asc", "desc"]);

const toJsonText = (value: unknown): string => JSON.stringify(value, null, 2);

const toToolResult = (value: unknown) => ({
  content: [
    {
      type: "text" as const,
      text: toJsonText(value),
    },
  ],
});

const toToolErrorResult = (error: unknown) => {
  const message = error instanceof Error ? error.message : "Unexpected tool error";

  return {
    content: [
      {
        type: "text" as const,
        text: message,
      },
    ],
    isError: true,
  };
};

const runTool = async (action: () => Promise<unknown>) => {
  try {
    const result = await action();
    return toToolResult(result);
  } catch (error) {
    return toToolErrorResult(error);
  }
};

server.registerTool(
  "environments_list",
  {
    title: "List Environments",
    description: "List environments the API key can access.",
    inputSchema: z.object({
      limit: z.number().int().min(1).max(100).optional(),
      cursor: z.string().optional(),
    }),
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
    },
  },
  async ({ limit, cursor }) =>
    runTool(async () => {
      return apiClient.get<Array<Record<string, unknown>>>("/api/v1/environments", {
        limit,
        cursor,
      });
    })
);

server.registerTool(
  "environment_context_get",
  {
    title: "Get Environment Context",
    description:
      "Fetch an environment plus its category tree and tag list for planning task operations.",
    inputSchema: z.object({
      envId: uuidSchema,
    }),
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
    },
  },
  async ({ envId }) =>
    runTool(async () => {
      const [environment, categories, tags] = await Promise.all([
        apiClient.get<Record<string, unknown>>(`/api/v1/environments/${envId}`),
        apiClient.get<Array<Record<string, unknown>>>(
          `/api/v1/environments/${envId}/categories`,
          { format: "tree" }
        ),
        apiClient.get<Array<Record<string, unknown>>>(
          `/api/v1/environments/${envId}/tags`
        ),
      ]);

      return {
        environment: environment.data,
        categories_tree: categories.data,
        tags: tags.data,
      };
    })
);

server.registerTool(
  "tasks_list",
  {
    title: "List Tasks",
    description:
      "List tasks in an environment with optional filters, sorting, and cursor pagination.",
    inputSchema: z.object({
      envId: uuidSchema,
      state: taskListStateSchema.optional(),
      category_id: uuidSchema.optional(),
      tag_id: uuidSchema.optional(),
      assigned_to: uuidSchema.optional(),
      assignment_status: assignmentStatusSchema.optional(),
      sort: sortSchema.optional(),
      order: orderSchema.optional(),
      limit: z.number().int().min(1).max(100).optional(),
      cursor: z.string().optional(),
    }),
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
    },
  },
  async (args) =>
    runTool(async () => {
      const { envId, ...query } = args;
      return apiClient.get<Array<Record<string, unknown>>>(
        `/api/v1/environments/${envId}/tasks`,
        query
      );
    })
);

server.registerTool(
  "task_get",
  {
    title: "Get Task",
    description: "Fetch a task including its tags and dependency IDs.",
    inputSchema: z.object({
      envId: uuidSchema,
      taskId: uuidSchema,
    }),
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
    },
  },
  async ({ envId, taskId }) =>
    runTool(async () => {
      return apiClient.get<Record<string, unknown>>(
        `/api/v1/environments/${envId}/tasks/${taskId}`
      );
    })
);

server.registerTool(
  "task_create",
  {
    title: "Create Task",
    description:
      "Create a task in an environment. Use environment_context_get first if category selection matters.",
    inputSchema: z.object({
      envId: uuidSchema,
      title: z.string().trim().min(1).max(200),
      description: z.string().trim().max(2000).optional(),
      category_id: uuidSchema.nullable().optional(),
    }),
    annotations: {
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
  async ({ envId, title, description, category_id }) =>
    runTool(async () => {
      return apiClient.post<Record<string, unknown>>(
        `/api/v1/environments/${envId}/tasks`,
        {
          title,
          description,
          category_id,
        }
      );
    })
);

server.registerTool(
  "task_update",
  {
    title: "Update Task",
    description:
      "Update task title, description, or category only. State changes must go through task_set_state.",
    inputSchema: z
      .object({
        envId: uuidSchema,
        taskId: uuidSchema,
        title: z.string().trim().min(1).max(200).optional(),
        description: z.string().trim().max(2000).nullable().optional(),
        category_id: uuidSchema.nullable().optional(),
      })
      .refine(
        ({ title, description, category_id }) =>
          title !== undefined || description !== undefined || category_id !== undefined,
        {
          message: "Provide at least one of title, description, or category_id",
        }
      ),
    annotations: {
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  async ({ envId, taskId, title, description, category_id }) =>
    runTool(async () => {
      return apiClient.patch<Record<string, unknown>>(
        `/api/v1/environments/${envId}/tasks/${taskId}`,
        {
          title,
          description,
          category_id,
        }
      );
    })
);

server.registerTool(
  "task_set_state",
  {
    title: "Set Task State",
    description:
      "Transition a task between planned, in_progress, and finished using the REST state transition rules.",
    inputSchema: z.object({
      envId: uuidSchema,
      taskId: uuidSchema,
      state: taskStateSchema,
    }),
    annotations: {
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
  async ({ envId, taskId, state }) =>
    runTool(async () => {
      return apiClient.post<Record<string, unknown>>(
        `/api/v1/environments/${envId}/tasks/${taskId}/state`,
        { state }
      );
    })
);

server.registerTool(
  "task_delete",
  {
    title: "Delete Task",
    description: "Delete a task. This is irreversible.",
    inputSchema: z.object({
      envId: uuidSchema,
      taskId: uuidSchema,
    }),
    annotations: {
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
  async ({ envId, taskId }) =>
    runTool(async () => {
      return apiClient.delete<Record<string, unknown>>(
        `/api/v1/environments/${envId}/tasks/${taskId}`
      );
    })
);

server.registerPrompt(
  "task_planning_prompt",
  {
    title: "Task Planning Workflow",
    description:
      "Guide an LLM to use the TodoList Demo MCP tools in a safe and predictable order.",
  },
  async () => ({
    description: "Suggested workflow for TodoList Demo task planning and task edits.",
    messages: [
      {
        role: "assistant",
        content: {
          type: "text",
          text:
            "Use the TodoList Demo MCP tools against the existing REST API only. Start with environments_list to discover accessible environments. Before task creation or category-sensitive edits, call environment_context_get to learn valid category and tag IDs. Use tasks_list for discovery and pagination, then task_get before modifying or deleting a specific task if current state or dependencies matter. Use task_update only for title, description, and category_id. Use task_set_state for workflow transitions. Preserve IDs exactly as returned by the tools. Treat any tool error as authoritative API feedback and do not invent missing resources or retry with guessed IDs. Photo uploads, task assignment/collaboration flows, invitations, and other non-listed API operations are intentionally out of scope for v1."
        },
      },
    ],
  })
);

const main = async () => {
  const transport = new StdioServerTransport();
  await server.connect(transport);
};

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});