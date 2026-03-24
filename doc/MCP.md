# MCP Server

This repo includes a first-cut stdio MCP server that reuses the existing REST API with Bearer API-key authentication.

## Requirements

- `TODOLIST_API_KEY` is required.
- `TODOLIST_API_BASE_URL` is optional and defaults to `http://localhost:3000`.
- The REST API must already be reachable at the configured base URL.

## Run

```bash
npm run mcp:server
```

## VS Code / MCP Host Config

Configure a stdio MCP server entry that runs the npm script from the repo root. A typical host config looks like this:

```json
{
  "servers": {
    "todolist-demo": {
      "type": "stdio",
      "command": "npm",
      "args": ["run", "mcp:server"],
      "cwd": "${workspaceFolder}",
      "env": {
        "TODOLIST_API_BASE_URL": "http://localhost:3000",
        "TODOLIST_API_KEY": "tdl_your_api_key_here"
      }
    }
  }
}
```

If your MCP host uses a different config wrapper, keep the same command, args, working directory, and env vars.

## v1 Tools

- `environments_list`
- `environment_context_get`
- `tasks_list`
- `task_get`
- `task_create`
- `task_update`
- `task_set_state`
- `task_delete`

## v1 Prompt

- `task_planning_prompt`

## Notes

- The server talks to the app through the existing `/api/v1/...` REST endpoints only.
- The server uses Bearer API-key auth and does not call Supabase directly.
- Tool responses are returned as readable JSON text for MCP clients.
- Photo uploads are not exposed in v1.
- Collaboration flows are not exposed in v1, including invitations, member management, task assignment acceptance, and refusal flows.