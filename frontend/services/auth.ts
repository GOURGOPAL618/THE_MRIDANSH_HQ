import api from "./api";
import { Commander } from "../types";

export interface LoginResponse {
  username: string;
  role: string;
}

export const authService = {
  /**
   * Log in Commander: POST credentials to backend.
   * On success, backend sets an HttpOnly cookie containing the JWT.
   */
  async login(password: string): Promise<{ success: boolean; error?: string }> {
    const response = await api.post<{ success: boolean; message: string; data?: LoginResponse }>("/api/v1/auth/login", {
      username: "commander", // As per prompt, single Commander configuration is username-independent
      password,
    });

    if (response.error || !response.data?.success) {
      return {
        success: false,
        error: response.error || response.data?.message || "Login failed.",
      };
    }

    return { success: true };
  },

  /**
   * Log out Commander: POST to backend, which invalidates DB session and deletes the HttpOnly cookie.
   */
  async logout(): Promise<boolean> {
    const response = await api.post<{ success: boolean }>("/api/v1/auth/logout");
    return !response.error && !!response.data?.success;
  },

  /**
   * Fetch current authenticated Commander profile details.
   */
  async getMe(): Promise<{ commander: Commander | null; error?: string }> {
    const response = await api.get<{ success: boolean; data: any }>("/api/v1/auth/me");
    if (response.error || !response.data?.success) {
      return {
        commander: null,
        error: response.error || "Session not found.",
      };
    }

    const { id, username, email, role } = response.data.data;
    return {
      commander: {
        id,
        username,
        email,
        role,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
  },
};

export default authService;
