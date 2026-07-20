"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { authService } from "../services/auth";
import { Commander } from "../types";
import { useNotification } from "../hooks/useNotification";

interface AuthContextType {
  commander: Commander | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [commander, setCommander] = useState<Commander | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { notifySuccess, notifyError, notifyInfo } = useNotification();

  // Helper check on initial mount to check active cookies session
  const checkAuth = async () => {
    try {
      const { commander: user } = await authService.getMe();
      setCommander(user);
    } catch (err) {
      console.warn("User is unauthenticated.", err);
      setCommander(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const result = await authService.login(password);
      if (result.success) {
        const { commander: user } = await authService.getMe();
        setCommander(user);
        notifySuccess("Authorization verified. Command center unlocked.", "ACCESS APPROVED");
        return true;
      } else {
        notifyError(result.error || "Authentication failed: Invalid security key.", "ACCESS DENIED");
        return false;
      }
    } catch (err: any) {
      notifyError(err.message || "Network error. Failed to reach HQ.", "UPLINK ERROR");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setCommander(null);
      notifyInfo("Command center locked. Cockpit session terminated.", "SESSION REVOKED");
    } catch (err: any) {
      notifyError("Error terminating session. Force lock enabled.", "LOGOUT ERROR");
      setCommander(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        commander,
        isLoading,
        isAuthenticated: !!commander,
        login,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
