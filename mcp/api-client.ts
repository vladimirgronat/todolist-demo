const DEFAULT_API_BASE_URL = "http://localhost:3000";

interface ApiPagination {
  next_cursor: string | null;
  has_more: boolean;
}

interface ApiErrorPayload {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface ApiSuccessPayload<T> {
  data: T;
  pagination?: ApiPagination;
}

interface ApiClientConfig {
  baseUrl: string;
  apiKey: string;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  query?: Record<string, string | number | boolean | null | undefined>;
  body?: unknown;
}

export class TodoListApiClientError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = "TodoListApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const getApiClientConfig = (): ApiClientConfig => {
  const baseUrl =
    process.env.TODOLIST_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL;
  const apiKey = process.env.TODOLIST_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("TODOLIST_API_KEY is required");
  }

  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    apiKey,
  };
};

const buildUrl = (
  baseUrl: string,
  path: string,
  query?: Record<string, string | number | boolean | null | undefined>
): URL => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${baseUrl}${normalizedPath}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") {
        continue;
      }

      url.searchParams.set(key, String(value));
    }
  }

  return url;
};

const parseJson = async (response: Response): Promise<unknown> => {
  const rawText = await response.text();

  if (!rawText) {
    return null;
  }

  try {
    return JSON.parse(rawText) as unknown;
  } catch {
    throw new Error(
      `API returned a non-JSON response with status ${response.status}`
    );
  }
};

const isErrorPayload = (payload: unknown): payload is ApiErrorPayload => {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const error = (payload as Record<string, unknown>).error;
  if (!error || typeof error !== "object") {
    return false;
  }

  return typeof (error as Record<string, unknown>).message === "string";
};

const isSuccessPayload = <T>(payload: unknown): payload is ApiSuccessPayload<T> => {
  return payload !== null && typeof payload === "object" && "data" in payload;
};

export class TodoListApiClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(config: ApiClientConfig = getApiClientConfig()) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
  }

  async get<T>(path: string, query?: RequestOptions["query"]) {
    return this.request<T>(path, { method: "GET", query });
  }

  async post<T>(path: string, body?: unknown, query?: RequestOptions["query"]) {
    return this.request<T>(path, { method: "POST", body, query });
  }

  async patch<T>(path: string, body?: unknown, query?: RequestOptions["query"]) {
    return this.request<T>(path, { method: "PATCH", body, query });
  }

  async delete<T>(path: string, query?: RequestOptions["query"]) {
    return this.request<T>(path, { method: "DELETE", query });
  }

  private async request<T>(
    path: string,
    options: RequestOptions
  ): Promise<ApiSuccessPayload<T>> {
    const url = buildUrl(this.baseUrl, path, options.query);
    const response = await fetch(url, {
      method: options.method ?? "GET",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${this.apiKey}`,
        ...(options.body === undefined ? {} : { "content-type": "application/json" }),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });

    const payload = await parseJson(response);

    if (!response.ok) {
      if (isErrorPayload(payload)) {
        throw new TodoListApiClientError(
          payload.error.message,
          response.status,
          payload.error.code,
          payload.error.details
        );
      }

      throw new TodoListApiClientError(
        `API request failed with status ${response.status}`,
        response.status
      );
    }

    if (!isSuccessPayload<T>(payload)) {
      throw new Error(`API returned an unexpected success payload for ${url.pathname}`);
    }

    return payload;
  }
}