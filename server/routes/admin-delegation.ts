import { Router } from "express";
import { users } from "./simple-auth";
import { ApiResponse, AdminDelegationRequest } from "../../shared/types";

const router = Router();

// Grant admin rights to a user
router.post("/grant", async (req, res) => {
  try {
    const { email }: AdminDelegationRequest = req.body;
    const delegatingUser = (req as any).user; // Set by requireAuth middleware

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email ist erforderlich",
      } as ApiResponse);
    }

    // Check if delegating user has permission
    if (!delegatingUser || !delegatingUser.canDelegateAdmin) {
      return res.status(403).json({
        success: false,
        error: "Sie haben keine Berechtigung, Admin-Rechte zu vergeben",
      } as ApiResponse);
    }

    // Check if target user exists
    const targetUser = users.get(email);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: "Benutzer nicht gefunden",
      } as ApiResponse);
    }

    // Check if user is already an admin
    if (targetUser.isAdmin) {
      return res.status(400).json({
        success: false,
        error: "Benutzer hat bereits Admin-Rechte",
      } as ApiResponse);
    }

    // Grant admin rights
    targetUser.isAdmin = true;
    targetUser.canDelegateAdmin = false; // Regular admins cannot delegate
    users.set(email, targetUser);

    const { password, ...safeUser } = targetUser;

    res.json({
      success: true,
      data: safeUser,
    } as ApiResponse);
  } catch (error) {
    console.error("Error granting admin rights:", error);
    res.status(500).json({
      success: false,
      error: "Fehler beim Vergeben der Admin-Rechte",
    } as ApiResponse);
  }
});

// Revoke admin rights from a user
router.post("/revoke", async (req, res) => {
  try {
    const { email }: AdminDelegationRequest = req.body;
    const delegatingUser = (req as any).user; // Set by requireAuth middleware

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email ist erforderlich",
      } as ApiResponse);
    }

    // Check if delegating user has permission
    if (!delegatingUser || !delegatingUser.canDelegateAdmin) {
      return res.status(403).json({
        success: false,
        error: "Sie haben keine Berechtigung, Admin-Rechte zu entziehen",
      } as ApiResponse);
    }

    // Cannot revoke rights from Admin@world.com
    if (email === "Admin@world.com") {
      return res.status(400).json({
        success: false,
        error: "Admin@world.com Rechte können nicht entzogen werden",
      } as ApiResponse);
    }

    // Check if target user exists
    const targetUser = users.get(email);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: "Benutzer nicht gefunden",
      } as ApiResponse);
    }

    // Check if user is an admin
    if (!targetUser.isAdmin) {
      return res.status(400).json({
        success: false,
        error: "Benutzer hat keine Admin-Rechte",
      } as ApiResponse);
    }

    // Revoke admin rights
    targetUser.isAdmin = false;
    targetUser.canDelegateAdmin = false;
    users.set(email, targetUser);

    const { password, ...safeUser } = targetUser;

    res.json({
      success: true,
      data: safeUser,
    } as ApiResponse);
  } catch (error) {
    console.error("Error revoking admin rights:", error);
    res.status(500).json({
      success: false,
      error: "Fehler beim Entziehen der Admin-Rechte",
    } as ApiResponse);
  }
});

// Get list of admin users (for super admin only)
router.get("/list", async (req, res) => {
  try {
    const delegatingUser = (req as any).user; // Set by requireAuth middleware

    // Only users who can delegate admin rights can see the list
    if (!delegatingUser || !delegatingUser.canDelegateAdmin) {
      return res.status(403).json({
        success: false,
        error: "Sie haben keine Berechtigung, die Admin-Liste zu sehen",
      } as ApiResponse);
    }

    // Get all users with admin rights from simple-auth system
    const adminUsers = Array.from(users.values())
      .filter((user: any) => user.isAdmin)
      .map((user: any) => {
        const { password, ...safeUser } = user;
        return safeUser;
      });

    res.json({
      success: true,
      data: adminUsers,
    } as ApiResponse);
  } catch (error) {
    console.error("Error getting admin list:", error);
    res.status(500).json({
      success: false,
      error: "Fehler beim Laden der Admin-Liste",
    } as ApiResponse);
  }
});

export default router;
