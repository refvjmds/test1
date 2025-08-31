import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  User,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
} from "@shared/types";

interface AuthContextType {
  user: User | null;
  login: (credentials: LoginRequest) => Promise<AuthResponse>;
  register: (credentials: RegisterRequest) => Promise<AuthResponse>;
  logout: () => void;
  connectWallet: (walletAddress: string) => Promise<boolean>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(
    localStorage.getItem('sessionToken')
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('sessionToken');
      if (!token) {
        setIsLoading(false);
        return;
      }

      const response = await fetch("/api/auth/me", {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setUser(data.user);
          setSessionToken(token);
        } else {
          // Invalid token, clear it
          localStorage.removeItem('sessionToken');
          setSessionToken(null);
        }
      } else {
        // Invalid token, clear it
        localStorage.removeItem('sessionToken');
        setSessionToken(null);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      localStorage.removeItem('sessionToken');
      setSessionToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginRequest): Promise<AuthResponse> => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (data.success && data.user && data.sessionToken) {
        setUser(data.user);
        setSessionToken(data.sessionToken);
        localStorage.setItem('sessionToken', data.sessionToken);
      }

      return data;
    } catch (error) {
      console.error("Login failed:", error);
      return { success: false, error: "Login failed. Please try again." };
    }
  };

  const register = async (
    credentials: RegisterRequest,
  ): Promise<AuthResponse> => {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (data.success && data.user && data.sessionToken) {
        setUser(data.user);
        setSessionToken(data.sessionToken);
        localStorage.setItem('sessionToken', data.sessionToken);
      }

      return data;
    } catch (error) {
      console.error("Registration failed:", error);
      return {
        success: false,
        error: "Registration failed. Please try again.",
      };
    }
  };

  const logout = async () => {
    try {
      if (sessionToken) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            'Authorization': `Bearer ${sessionToken}`
          },
          credentials: "include",
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      setSessionToken(null);
      localStorage.removeItem('sessionToken');
    }
  };

  const connectWallet = async (walletAddress: string): Promise<boolean> => {
    try {
      if (!sessionToken) return false;

      const response = await fetch("/api/auth/connect-wallet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${sessionToken}`
        },
        credentials: "include",
        body: JSON.stringify({ walletAddress }),
      });

      const data = await response.json();

      if (data.success && data.user) {
        setUser(data.user);
        return true;
      }

      return false;
    } catch (error) {
      console.error("Wallet connection failed:", error);
      return false;
    }
  };

  const value: AuthContextType = {
    user,
    login,
    register,
    logout,
    connectWallet,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
