import { RequestHandler } from "express";
import { AuthResponse, LoginRequest, RegisterRequest } from "../../shared/types";
import {
  getUserByEmail,
  createUser,
  updateUserWallet,
  getUserSafe,
  getUserById,
} from "../data/users";

// Simple session storage (in production, use proper session management)
const sessions = new Map<string, string>(); // sessionId -> userId

const generateSessionId = (): string => {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
};

export const login: RequestHandler = (req, res) => {
  try {
    const { email, password }: LoginRequest = req.body;

    if (!email || !password) {
      return res.json({
        success: false,
        error: "Email and password are required",
      });
    }

    const user = getUserByEmail(email);

    if (!user || user.password !== password) {
      return res.json({ success: false, error: "Invalid email or password" });
    }

    // Create session
    const sessionId = generateSessionId();
    sessions.set(sessionId, user.id);

    // Set session cookie
    res.cookie("session", sessionId, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: "strict",
    });

    const response: AuthResponse = {
      success: true,
      user: getUserSafe(user),
    };

    res.json(response);
  } catch (error) {
    console.error("Login error:", error);
    res.json({ success: false, error: "Login failed" });
  }
};

export const register: RequestHandler = (req, res) => {
  try {
    const { email, password }: RegisterRequest = req.body;

    if (!email || !password) {
      return res.json({
        success: false,
        error: "Email and password are required",
      });
    }

    // Check if user already exists
    const existingUser = getUserByEmail(email);
    if (existingUser) {
      return res.json({ success: false, error: "User already exists" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.json({ success: false, error: "Invalid email format" });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.json({
        success: false,
        error: "Password must be at least 6 characters long",
      });
    }

    // Create new user
    const newUser = createUser(email, password);

    // Create session
    const sessionId = generateSessionId();
    sessions.set(sessionId, newUser.id);

    // Set session cookie
    res.cookie("session", sessionId, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: "strict",
    });

    const response: AuthResponse = {
      success: true,
      user: newUser,
    };

    res.json(response);
  } catch (error) {
    console.error("Registration error:", error);
    res.json({ success: false, error: "Registration failed" });
  }
};

export const me: RequestHandler = (req, res) => {
  try {
    const sessionId = req.cookies.session;

    if (!sessionId) {
      return res.json({ success: false, error: "Not authenticated" });
    }

    const userId = sessions.get(sessionId);
    if (!userId) {
      return res.json({ success: false, error: "Invalid session" });
    }

    const user = getUserById(userId);
    if (!user) {
      return res.json({ success: false, error: "User not found" });
    }

    const response: AuthResponse = {
      success: true,
      user: getUserSafe(user),
    };

    res.json(response);
  } catch (error) {
    console.error("Auth check error:", error);
    res.json({ success: false, error: "Authentication check failed" });
  }
};

export const logout: RequestHandler = (req, res) => {
  try {
    const sessionId = req.cookies.session;

    if (sessionId) {
      sessions.delete(sessionId);
    }

    res.clearCookie("session");
    res.json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);
    res.json({ success: false, error: "Logout failed" });
  }
};

export const connectWallet: RequestHandler = (req, res) => {
  try {
    const { walletAddress } = req.body;
    const sessionId = req.cookies.session;

    if (!sessionId) {
      return res.json({ success: false, error: "Not authenticated" });
    }

    const userId = sessions.get(sessionId);
    if (!userId) {
      return res.json({ success: false, error: "Invalid session" });
    }

    if (!walletAddress) {
      return res.json({ success: false, error: "Wallet address is required" });
    }

    const updatedUser = updateUserWallet(userId, walletAddress);
    if (!updatedUser) {
      return res.json({ success: false, error: "Failed to update wallet" });
    }

    res.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Wallet connection error:", error);
    res.json({ success: false, error: "Wallet connection failed" });
  }
};

// Middleware to check authentication
export const requireAuth: RequestHandler = (req, res, next) => {
  const sessionId = req.cookies.session;

  if (!sessionId) {
    return res
      .status(401)
      .json({ success: false, error: "Authentication required" });
  }

  const userId = sessions.get(sessionId);
  if (!userId) {
    return res.status(401).json({ success: false, error: "Invalid session" });
  }

  const user = getUserById(userId);
  if (!user) {
    return res.status(401).json({ success: false, error: "User not found" });
  }

  // Add user to request object
  (req as any).user = getUserSafe(user);
  next();
};

// Middleware to check admin privileges
export const requireAdmin: RequestHandler = (req, res, next) => {
  const user = (req as any).user;

  if (!user || !user.isAdmin) {
    return res
      .status(403)
      .json({ success: false, error: "Admin access required" });
  }

  next();
};
