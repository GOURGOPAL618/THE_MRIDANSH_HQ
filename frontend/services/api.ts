// Generic REST API client factory wrapper around fetch with unified error formatting

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  statusCode?: number;
}

class ApiService {
  private getBaseUrl(): string {
    return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  }

  private async request<T = any>(
    path: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.getBaseUrl()}${path}`;
    const headers = new Headers(options.headers || {});
    
    // Default to JSON content type
    if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }

    // CORS credentials setup (always include session cookies)
    options.credentials = "include";
    options.headers = headers;

    try {
      const response = await fetch(url, options);
      const statusCode = response.status;

      let data: any = null;
      let error: string | undefined = undefined;

      const contentType = response.headers.get("Content-Type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = { text: await response.text() };
      }

      if (!response.ok) {
        // Parse error message from FastAPI response formats
        error = data?.detail || data?.message || response.statusText || "Request failed";
        return { error, statusCode };
      }

      return { data, statusCode };
    } catch (err: any) {
      console.error(`API service request to "${url}" failed:`, err);
      return {
        error: err.message || "Network connection failure",
        statusCode: 503, // Service Unavailable
      };
    }
  }

  public async get<T = any>(path: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: "GET", headers });
  }

  public async post<T = any>(path: string, body?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    const isFormData = body instanceof FormData;
    return this.request<T>(path, {
      method: "POST",
      body: isFormData ? body : JSON.stringify(body),
      headers,
    });
  }

  public async put<T = any>(path: string, body?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    const isFormData = body instanceof FormData;
    return this.request<T>(path, {
      method: "PUT",
      body: isFormData ? body : JSON.stringify(body),
      headers,
    });
  }

  public async delete<T = any>(path: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: "DELETE", headers });
  }
}

export const api = new ApiService();
export default api;
