import { RequestHandler } from "express";

// Simple in-memory user storage for demo purposes
interface SimpleUser {
  id: string;
  email: string;
  password: string;
  isAdmin: boolean;
  canDelegateAdmin?: boolean;
  balance: number;
  walletAddress?: string;
  createdAt: string;
}

// Pre-populate with admin and test accounts
const users = new Map<string, SimpleUser>();
const sessions = new Map<string, string>(); // sessionId -> userId

// Initialize users
const initUsers = () => {
  // Admin account
  users.set("Admin@world.com", {
    id: "admin-001",
    email: "Admin@world.com",
    password: "Admin25!",
    isAdmin: true,
    canDelegateAdmin: true, // Only Admin@world.com can delegate admin rights
    balance: 100000,
    createdAt: new Date().toISOString(),
  });

  // Lara account
  users.set("Lara@world.com", {
    id: "lara-001",
    email: "Lara@world.com",
    password: "Lara123",
    isAdmin: false,
    balance: 1000,
    createdAt: new Date().toISOString(),
  });

  // Tito account
  users.set("Tito@world.com", {
    id: "tito-001",
    email: "Tito@world.com",
    password: "Tito123!",
    isAdmin: false,
    balance: 100000, // 100,000€ balance
    createdAt: new Date().toISOString(),
  });

  // Test accounts
  for (let i = 1; i <= 10; i++) {
    const email = `Test${i}@world.com`;
    users.set(email, {
      id: `test-${i.toString().padStart(3, "0")}`,
      email,
      password: "Test2025",
      isAdmin: false,
      balance: 1000,
      createdAt: new Date().toISOString(),
    });
  }
};

initUsers();

const generateSessionId = (): string => {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
};

const getUserSafe = (user: SimpleUser) => {
  const { password, ...safeUser } = user;
  return {
    ...safeUser,
    canDelegateAdmin: safeUser.canDelegateAdmin || false,
  };
};

export const login: RequestHandler = (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.json({
        success: false,
        error: "Email and password are required",
      });
    }

    const user = users.get(email);

    if (!user || user.password !== password) {
      return res.json({ success: false, error: "Invalid email or password" });
    }

    const sessionId = generateSessionId();
    sessions.set(sessionId, user.id);

    console.log("🔑 Creating session token:", sessionId);
    console.log("🔑 Session stored for user:", user.email);

    res.json({
      success: true,
      user: getUserSafe(user),
      sessionToken: sessionId, // Send token in response
    });
  } catch (error) {
    console.error("Login error:", error);
    res.json({ success: false, error: "Login failed" });
  }
};

export const register: RequestHandler = (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.json({
        success: false,
        error: "Email and password are required",
      });
    }

    if (users.has(email)) {
      return res.json({ success: false, error: "User already exists" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.json({ success: false, error: "Invalid email format" });
    }

    if (password.length < 6) {
      return res.json({
        success: false,
        error: "Password must be at least 6 characters long",
      });
    }

    const newUser: SimpleUser = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      email,
      password,
      isAdmin: false,
      balance: 0, // New users start with 0€ balance
      createdAt: new Date().toISOString(),
    };

    users.set(email, newUser);
    console.log(`✅ New user registered: ${email}`);

    const sessionId = generateSessionId();
    sessions.set(sessionId, newUser.id);

    console.log("🔑 Creating session token for new user:", sessionId);

    res.json({
      success: true,
      user: getUserSafe(newUser),
      sessionToken: sessionId,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.json({ success: false, error: "Registration failed" });
  }
};

export const me: RequestHandler = (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const sessionId = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : null;

    if (!sessionId) {
      return res.json({ success: false, error: "Not authenticated" });
    }

    const userId = sessions.get(sessionId);
    if (!userId) {
      return res.json({ success: false, error: "Invalid session" });
    }

    const user = Array.from(users.values()).find((u) => u.id === userId);
    if (!user) {
      return res.json({ success: false, error: "User not found" });
    }

    res.json({
      success: true,
      user: getUserSafe(user),
    });
  } catch (error) {
    console.error("Auth check error:", error);
    res.json({ success: false, error: "Authentication check failed" });
  }
};

export const logout: RequestHandler = (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const sessionId = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : null;

    if (sessionId) {
      sessions.delete(sessionId);
      console.log("🔑 Session deleted:", sessionId);
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);
    res.json({ success: false, error: "Logout failed" });
  }
};

export const connectWallet: RequestHandler = (req, res) => {
  try {
    const { walletAddress } = req.body;
    const authHeader = req.headers.authorization;
    const sessionId = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : null;

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

    const user = Array.from(users.values()).find((u) => u.id === userId);
    if (!user) {
      return res.json({ success: false, error: "User not found" });
    }

    user.walletAddress = walletAddress;
    users.set(user.email, user);

    res.json({
      success: true,
      user: getUserSafe(user),
    });
  } catch (error) {
    console.error("Wallet connection error:", error);
    res.json({ success: false, error: "Wallet connection failed" });
  }
};

// Middleware functions
export const requireAuth: RequestHandler = (req, res, next) => {
  console.log("🔍 Auth check - Authorization header:", req.headers.authorization);
  console.log("🔍 Auth check - Sessions count:", sessions.size);
  console.log("🔍 Available sessions:", Array.from(sessions.entries()));

  const authHeader = req.headers.authorization;
  const sessionId = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.substring(7)
    : null;

  if (!sessionId) {
    console.log("❌ No session token found");
    return res
      .status(401)
      .json({ success: false, error: "Authentication required - no session" });
  }

  const userId = sessions.get(sessionId);
  if (!userId) {
    console.log("❌ Session not found in sessions map");
    console.log("🔍 Available sessions:", Array.from(sessions.keys()));
    return res.status(401).json({ success: false, error: "Invalid session" });
  }

  const user = Array.from(users.values()).find((u) => u.id === userId);
  if (!user) {
    console.log("❌ User not found for userId:", userId);
    return res.status(401).json({ success: false, error: "User not found" });
  }

  console.log("✅ Auth successful for user:", user.email);
  (req as any).user = getUserSafe(user);
  next();
};

export const requireAdmin: RequestHandler = (req, res, next) => {
  const user = (req as any).user;

  if (!user || !user.isAdmin) {
    return res
      .status(403)
      .json({ success: false, error: "Admin access required" });
  }

  next();
};

// Optional auth middleware - adds user to request if authenticated, but doesn't block if not
export const optionalAuth: RequestHandler = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const sessionId = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.substring(7)
    : null;

  if (sessionId) {
    const userId = sessions.get(sessionId);
    if (userId) {
      const user = Array.from(users.values()).find((u) => u.id === userId);
      if (user) {
        (req as any).user = getUserSafe(user);
      }
    }
  }

  // Always continue, whether user was found or not
  next();
};

// Export users for other modules
export { users, sessions };
