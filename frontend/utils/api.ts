/**
 * Query String Helpers
 */
export function buildQueryString(params: Record<string, any>): string {
  const parts = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

export function parseQueryString(queryString: string): Record<string, string> {
  const params: Record<string, string> = {};
  const query = queryString.startsWith("?") ? queryString.substring(1) : queryString;
  if (!query) return params;

  query.split("&").forEach((part) => {
    const [key, value] = part.split("=");
    if (key) {
      params[decodeURIComponent(key)] = decodeURIComponent(value || "");
    }
  });
  return params;
}

/**
 * API Helpers
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  request_id?: string;
  timestamp?: string;
}

export function isApiError(obj: any): boolean {
  return (
    obj &&
    typeof obj === "object" &&
    "success" in obj &&
    obj.success === false &&
    "message" in obj
  );
}

export function formatError(err: any): { message: string; errorCode: string } {
  if (!err) {
    return { message: "An unknown connection exception occurred.", errorCode: "UNKNOWN_ERROR" };
  }

  // Handle JCC standard API response envelopes
  if (isApiError(err)) {
    const details = err.data || {};
    return {
      message: err.message || "Requested operations processing failure.",
      errorCode: details.error_code || "API_ERROR",
    };
  }

  // Handle standard Javascript error objects
  if (err instanceof Error) {
    return { message: err.message, errorCode: "CLIENT_ERROR" };
  }

  // Handle string errors
  if (typeof err === "string") {
    return { message: err, errorCode: "SYSTEM_ERROR" };
  }

  return { message: "Internal application runtime failure.", errorCode: "INTERNAL_ERROR" };
}
