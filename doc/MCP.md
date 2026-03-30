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

## HTTP (Streamable HTTP)

For remote or shared deployment, run the MCP server over HTTP:

```bash
npm run mcp:server:http
```

The server listens on `MCP_HTTP_PORT` (default `8080`) and exposes a single `/mcp` endpoint supporting the MCP Streamable HTTP transport (POST for JSON-RPC, GET for SSE streams, DELETE for session teardown).

### Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `TODOLIST_API_KEY` | yes | — | Bearer API key for the REST API |
| `TODOLIST_API_BASE_URL` | no | `http://localhost:3000` | Base URL of the TodoList app |
| `MCP_HTTP_PORT` | no | `8080` | Port for the HTTP MCP server |

### MCP Host Config (HTTP)

```json
{
  "servers": {
    "todolist-demo": {
      "type": "http",
      "url": "http://localhost:8080/mcp"
    }
  }
}
```

For remote deployment, replace `localhost:8080` with your server address.

## Vercel (Serverless)

The MCP server is also available as a Next.js Route Handler that deploys automatically with the app on Vercel. It runs in **stateless mode** — each request creates a fresh server instance with no session tracking.

### Endpoint

```
POST https://your-app.vercel.app/api/mcp
```

### MCP Host Config (Vercel)

```json
{
  "servers": {
    "todolist-demo": {
      "type": "http",
      "url": "https://your-app.vercel.app/api/mcp"
    }
  }
}
```

### Limitations

- **Stateless only** — no session persistence between requests
- **No SSE streaming** — responses are returned as JSON (no long-lived connections)
- **30s timeout** — Vercel serverless function limit (Pro plan)
- The `TODOLIST_API_KEY` and `TODOLIST_API_BASE_URL` environment variables must be configured in the Vercel project settings

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