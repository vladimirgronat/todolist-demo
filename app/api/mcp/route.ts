import { NextRequest, NextResponse } from "next/server";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createServer } from "@/mcp/server";

export const maxDuration = 30;

export const POST = async (request: NextRequest) => {
  try {
    const body = await request.json();
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    const server = createServer();
    await server.connect(transport);
    const response = await transport.handleRequest(request, {
      parsedBody: body,
    });
    return response;
  } catch {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
};

export const GET = () =>
  NextResponse.json(
    { error: "Method Not Allowed — use POST for MCP JSON-RPC" },
    { status: 405 }
  );

export const DELETE = () =>
  NextResponse.json(
    { error: "Method Not Allowed — stateless mode, no sessions" },
    { status: 405 }
  );
