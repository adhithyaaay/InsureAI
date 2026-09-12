import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import api, { TOKEN_STORAGE_KEY } from "../services/api";

export type UserRole = "CUSTOMER" | "UNDERWRITER";

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  created_at?: string;
}

interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, []);

  // Hydrate user profile from API on initial load
  useEffect(() => {
    const hydrateUser = async () => {
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await api.get<User>("/auth/me");
        setUser(response.data);
        setToken(storedToken);
      } catch (err) {
        console.warn("Session expired or invalid token:", err);
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    hydrateUser();

    // Listen for unauthorized 401 events emitted by Axios interceptor
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener("insureai:unauthorized", handleUnauthorized);
    return () => {
      window.removeEventListener("insureai:unauthorized", handleUnauthorized);
    };
  }, [logout]);

  const login = async (email: string, password: string): Promise<User> => {
    const response = await api.post<AuthResponse>("/auth/login", { email, password });
    const { access_token, user: userData } = response.data;

    localStorage.setItem(TOKEN_STORAGE_KEY, access_token);
    setToken(access_token);
    setUser(userData);
    return userData;
  };

  const register = async (name: string, email: string, password: string): Promise<User> => {
    const response = await api.post<AuthResponse>("/auth/register", { name, email, password });
    const { access_token, user: userData } = response.data;

    localStorage.setItem(TOKEN_STORAGE_KEY, access_token);
    setToken(access_token);
    setUser(userData);
    return userData;
  };

  const value: AuthContextType = {
    user,
    token,
    role: user?.role || null,
    isAuthenticated: !!user && !!token,
    isLoading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
