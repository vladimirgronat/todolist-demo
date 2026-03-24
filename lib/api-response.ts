import { NextResponse } from "next/server";

export const apiSuccess = <T>(data: T, status = 200): NextResponse =>
  NextResponse.json({ data }, { status });

export const apiError = (
  code: string,
  message: string,
  status: number,
  details?: unknown
): NextResponse => {
  const error: { code: string; message: string; details?: unknown } = {
    code,
    message,
  };
  if (details !== undefined) error.details = details;
  return NextResponse.json({ error }, { status });
};

export const apiPaginatedResponse = <T>(
  data: T[],
  nextCursor: string | null,
  hasMore: boolean
): NextResponse =>
  NextResponse.json({
    data,
    pagination: { next_cursor: nextCursor, has_more: hasMore },
  });

export const apiUnauthorized = (message = "Invalid or missing API key") =>
  apiError("UNAUTHORIZED", message, 401);

export const apiForbidden = (message = "Access denied") =>
  apiError("FORBIDDEN", message, 403);

export const apiNotFound = (message = "Resource not found") =>
  apiError("NOT_FOUND", message, 404);

export const apiBadRequest = (message: string, details?: unknown) =>
  apiError("BAD_REQUEST", message, 400, details);

export const apiConflict = (message: string) =>
  apiError("CONFLICT", message, 409);
