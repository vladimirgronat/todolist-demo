import { randomUUID } from "node:crypto";
import { createServer as createHttpServer, IncomingMessage, ServerResponse } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { createServer } from "./server";

const DEFAULT_PORT = 8080;

const transports = new Map<string, StreamableHTTPServerTransport>();

const readBody = (req: IncomingMessage): Promise<string> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString()));
    req.on("error", reject);
  });

const handlePost = async (req: IncomingMessage, res: ServerResponse) => {
  const body = await readBody(req);
  const parsedBody = JSON.parse(body);

  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  if (sessionId && transports.has(sessionId)) {
    const transport = transports.get(sessionId)!;
    await transport.handleRequest(req, res, parsedBody);
    return;
  }

  if (isInitializeRequest(parsedBody)) {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => {
        transports.set(id, transport);
      },
    });

    transport.onclose = () => {
      const id = Array.from(transports.entries()).find(([, t]) => t === transport)?.[0];
      if (id) transports.delete(id);
    };

    const server = createServer();
    await server.connect(transport);
    await transport.handleRequest(req, res, parsedBody);
    return;
  }

  res.writeHead(400, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Bad Request: no valid session or initialize request" }));
};

const handleGet = async (req: IncomingMessage, res: ServerResponse) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  if (!sessionId || !transports.has(sessionId)) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Bad Request: missing or invalid session ID" }));
    return;
  }

  const transport = transports.get(sessionId)!;
  await transport.handleRequest(req, res);
};

const handleDelete = async (req: IncomingMessage, res: ServerResponse) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  if (!sessionId || !transports.has(sessionId)) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Bad Request: missing or invalid session ID" }));
    return;
  }

  const transport = transports.get(sessionId)!;
  await transport.close();
  transports.delete(sessionId);

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: true }));
};

const port = Number(process.env.MCP_HTTP_PORT) || DEFAULT_PORT;

const httpServer = createHttpServer(async (req: IncomingMessage, res: ServerResponse) => {
  const url = new URL(req.url ?? "/", `http://localhost:${port}`);

  if (url.pathname !== "/mcp") {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not Found" }));
    return;
  }

  try {
    if (req.method === "POST") {
      await handlePost(req, res);
    } else if (req.method === "GET") {
      await handleGet(req, res);
    } else if (req.method === "DELETE") {
      await handleDelete(req, res);
    } else {
      res.writeHead(405, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Method Not Allowed" }));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: message }));
    }
  }
});

httpServer.listen(port, () => {
  process.stderr.write(`MCP HTTP server listening on http://localhost:${port}/mcp\n`);
});

process.on("SIGINT", async () => {
  process.stderr.write("Shutting down…\n");
  for (const transport of Array.from(transports.values())) {
    await transport.close();
  }
  transports.clear();
  httpServer.close();
  process.exit(0);
});
