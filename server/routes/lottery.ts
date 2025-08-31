import { RequestHandler } from "express";
import {
  ApiResponse,
  TicketPurchaseRequest,
  DrawingRequest,
  JackpotUpdateRequest,
} from "../../shared/types";
import {
  createTicket,
  createMultipleTickets,
  getTicketsByUser,
  getCurrentDrawing,
  getLatestCompletedDrawing,
  performIntelligentDrawing,
  updateJackpotAmount,
  getAdminStats,
  getAllTickets,
  getDrawingHistory,
  getQuicktipp1kStatus,
  toggleQuicktipp1k,
  deleteTicket,
  deleteMultipleTickets,
  getPendingJackpotWinners,
  approveJackpotWinner,
  rejectJackpotWinner,
  recalculateDrawingStatistics,
  demonstrateIntelligentDrawing,
  isTicketSalesAllowed,
  previewIntelligentDrawing,
  getManualSalesStopStatus,
  toggleManualSalesStop,
  setManualSalesStop,
  addSalesStopExemption,
  removeSalesStopExemption,
  getSalesStopExemptions,
  isSalesStopExempt,
  calculateActualPrizeAmounts,
  getReserveFund,
  setReserveFund,
  addToReserveFund,
  getReserveStats,
  getEnhancedAdminStats,
  testSophisticatedPayouts,
} from "../data/lottery";
import { autoDrawingService } from "../services/AutoDrawingService";
import { updateUserBalance, getUserById } from "../data/users";
import { validateCoupon, useCoupon } from "../data/coupons";
import { users } from "./simple-auth";
import { getTicketPriceUsd } from "../utils/pricing";

export const getCurrentDrawingRoute: RequestHandler = (req, res) => {
  try {
    const drawing = getCurrentDrawing();
    const response: ApiResponse = {
      success: true,
      data: drawing,
    };
    res.json(response);
  } catch (error) {
    console.error("Error fetching current drawing:", error);
    res.json({ success: false, error: "Failed to fetch current drawing" });
  }
};

export const purchaseTickets: RequestHandler = (req, res) => {
  try {
    console.log("🎫 Purchase tickets called");
    console.log("🎫 User from request:", (req as any).user);
    console.log("🎫 Request body:", req.body);

    const user = (req as any).user;

    // Check if ticket sales are allowed (with user exemption check)
    const salesCheck = isTicketSalesAllowed(user?.email);
    if (!salesCheck.allowed) {
      console.log(`🚫 Ticket sales blocked for ${user?.email}: ${salesCheck.message}`);
      return res.json({
        success: false,
        error: salesCheck.message,
        salesBlocked: true,
        timeUntilDrawing: salesCheck.timeUntilDrawing
      });
    }
    const { tickets: ticketData, couponCode }: TicketPurchaseRequest = req.body;

    if (!ticketData || ticketData.length === 0) {
      return res.json({ success: false, error: "No tickets provided" });
    }



    // Validate ticket data
    for (const ticket of ticketData) {
      if (ticket.mainNumbers.length !== 5 || ticket.worldNumbers.length !== 2) {
        return res.json({ success: false, error: "Invalid ticket format" });
      }

      // Validate number ranges
      const invalidMain = ticket.mainNumbers.some((n) => n < 1 || n > 50);
      const invalidWorld = ticket.worldNumbers.some((n) => n < 1 || n > 12);

      if (invalidMain || invalidWorld) {
        return res.json({
          success: false,
          error: "Numbers out of valid range",
        });
      }

      // Check for duplicates within ticket
      const uniqueMain = new Set(ticket.mainNumbers);
      const uniqueWorld = new Set(ticket.worldNumbers);

      if (uniqueMain.size !== 5 || uniqueWorld.size !== 2) {
        return res.json({
          success: false,
          error: "Duplicate numbers in ticket",
        });
      }
    }

    const ticketPrice = getTicketPriceUsd();
    let totalCost = ticketData.length * ticketPrice;
    let appliedDiscount = 0;

    // Validate and apply coupon if provided
    if (couponCode) {
      const couponValidation = validateCoupon(couponCode, ticketData.length);
      if (couponValidation.isValid) {
        appliedDiscount = couponValidation.discount;
        totalCost = totalCost * (1 - appliedDiscount / 100);
      } else {
        return res.json({ success: false, error: couponValidation.message || "Invalid coupon" });
      }
    }

    // Check user balance using simple auth system
    const userAccount = users.get(user.email);
    if (!userAccount || userAccount.balance < totalCost) {
      return res.json({ success: false, error: "Insufficient balance" });
    }

    // Create tickets
    const createdTickets = ticketData.map((ticket) =>
      createTicket(user.id, ticket.mainNumbers, ticket.worldNumbers),
    );

    // Use coupon if one was applied
    if (couponCode && appliedDiscount > 0) {
      useCoupon(couponCode);
    }

    // Deduct balance from simple auth system
    userAccount.balance -= totalCost;
    users.set(user.email, userAccount);

    const response: ApiResponse = {
      success: true,
      data: {
        tickets: createdTickets,
        totalCost,
        appliedDiscount
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Error purchasing tickets:", error);
    res.json({ success: false, error: "Failed to purchase tickets" });
  }
};

export const getTicketPriceRoute: RequestHandler = (_req, res) => {
  try {
    const response: ApiResponse = { success: true, data: { price: getTicketPriceUsd() } };
    res.json(response);
  } catch (e) {
    res.json({ success: false, error: "Failed to load price" });
  }
};

export const getMyTickets: RequestHandler = (req, res) => {
  try {
    const user = (req as any).user;
    const tickets = getTicketsByUser(user.id);

    const response: ApiResponse = {
      success: true,
      data: tickets,
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching user tickets:", error);
    res.json({ success: false, error: "Failed to fetch tickets" });
  }
};

// Admin routes
export const performDrawing: RequestHandler = (req, res) => {
  try {
    const { manualNumbers, intelligentDrawing }: DrawingRequest = req.body;

    console.log("🎯 Drawing request:", { manualNumbers, intelligentDrawing });

    // Check current drawing status
    const currentDrawing = getCurrentDrawing();
    console.log("📊 Current drawing status:", {
      id: currentDrawing?.id,
      hasNumbers: currentDrawing?.mainNumbers?.length > 0,
      isActive: currentDrawing?.isActive,
      ticketCount: Array.from(getAllTickets()).filter(t => t.drawingDate === currentDrawing?.date).length
    });

    const drawing = performIntelligentDrawing(manualNumbers);

    if (!drawing) {
      console.log("❌ Drawing failed - no result returned");
      return res.json({ success: false, error: "No active drawing found" });
    }

    console.log("✅ Drawing completed successfully:", {
      drawingId: drawing.id,
      mainNumbers: drawing.mainNumbers,
      worldNumbers: drawing.worldNumbers,
      winnersCount: Object.keys(drawing.winnersByClass || {}).length
    });

    // Notify auto drawing service to recalculate next drawing time
    autoDrawingService.recalculateNextDrawingTime();
    console.log('🎲 Auto drawing service notified to recalculate next drawing time');

    const response: ApiResponse = {
      success: true,
      data: drawing,
    };

    res.json(response);
  } catch (error) {
    console.error("❌ Error performing drawing:", error);
    res.json({ success: false, error: "Failed to perform drawing" });
  }
};

export const updateJackpot: RequestHandler = (req, res) => {
  try {
    const { newAmount, isSimulated }: JackpotUpdateRequest = req.body;

    if (typeof newAmount !== "number" || newAmount < 0) {
      return res.json({ success: false, error: "Invalid jackpot amount" });
    }

    const success = updateJackpotAmount(newAmount, isSimulated);

    if (!success) {
      return res.json({ success: false, error: "Failed to update jackpot" });
    }

    const currentDrawing = getCurrentDrawing();

    const response: ApiResponse = {
      success: true,
      data: currentDrawing,
    };

    res.json(response);
  } catch (error) {
    console.error("Error updating jackpot:", error);
    res.json({ success: false, error: "Failed to update jackpot" });
  }
};

export const getAdminStatsRoute: RequestHandler = (req, res) => {
  try {
    const stats = getAdminStats();

    const response: ApiResponse = {
      success: true,
      data: stats,
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    res.json({ success: false, error: "Failed to fetch admin stats" });
  }
};

export const getAllTicketsRoute: RequestHandler = (req, res) => {
  try {
    const tickets = getAllTickets();

    const response: ApiResponse = {
      success: true,
      data: tickets,
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching all tickets:", error);
    res.json({ success: false, error: "Failed to fetch tickets" });
  }
};

export const getDrawingHistoryRoute: RequestHandler = (req, res) => {
  try {
    const history = getDrawingHistory();

    const response: ApiResponse = {
      success: true,
      data: history,
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching drawing history:", error);
    res.json({ success: false, error: "Failed to fetch drawing history" });
  }
};

export const getCurrentDrawingTickets: RequestHandler = (req, res) => {
  try {
    const user = (req as any).user;
    const currentDrawing = getCurrentDrawing();
    const latestCompletedDrawing = getLatestCompletedDrawing();

    if (!currentDrawing) {
      return res.json({ success: false, error: "No active drawing found" });
    }

    const allTickets = getAllTickets();

    // Enhanced ticket visibility logic:
    // 1. Always show tickets for current drawing (new tickets)
    // 2. If there's a completed drawing, also show those tickets (old tickets) for comparison
    // 3. This allows users to see both old and new tickets until the next drawing starts
    let visibleTickets = allTickets.filter(
      ticket => ticket.drawingId === currentDrawing.id && ticket.userId === user?.id
    );

    // Add tickets from the latest completed drawing so users can compare numbers
    if (latestCompletedDrawing && latestCompletedDrawing.id !== currentDrawing.id) {
      const previousDrawingTickets = allTickets.filter(
        ticket => ticket.drawingId === latestCompletedDrawing.id && ticket.userId === user?.id
      );
      visibleTickets = [...previousDrawingTickets, ...visibleTickets];
    }

    const response: ApiResponse = {
      success: true,
      data: visibleTickets,
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching current drawing tickets:", error);
    res.json({ success: false, error: "Failed to fetch current drawing tickets" });
  }
};

export const getLatestCompletedDrawingRoute: RequestHandler = (req, res) => {
  try {
    const latestDrawing = getLatestCompletedDrawing();

    const response: ApiResponse = {
      success: true,
      data: latestDrawing,
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching latest completed drawing:", error);
    res.json({ success: false, error: "Failed to fetch latest completed drawing" });
  }
};

export const getQuicktippStatusRoute: RequestHandler = (req, res) => {
  try {
    const quicktipp1kEnabled = getQuicktipp1kStatus();

    const response: ApiResponse = {
      success: true,
      data: {
        quicktipp1kEnabled
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching quicktipp status:", error);
    res.json({ success: false, error: "Failed to fetch quicktipp status" });
  }
};


export const toggleQuicktipp1kRoute: RequestHandler = (req, res) => {
  try {
    const newStatus = toggleQuicktipp1k();

    const response: ApiResponse = {
      success: true,
      data: { quicktipp1kEnabled: newStatus },
    };

    res.json(response);
  } catch (error) {
    console.error("Error toggling quicktipp 1k:", error);
    res.json({ success: false, error: "Failed to toggle quicktipp 1k" });
  }
};

export const deleteTicketRoute: RequestHandler = (req, res) => {
  try {
    const { ticketId } = req.params;

    if (!ticketId) {
      return res.json({ success: false, error: "Ticket ID is required" });
    }

    const deleted = deleteTicket(ticketId);

    const response: ApiResponse = {
      success: deleted,
      data: { deleted, ticketId },
    };

    res.json(response);
  } catch (error) {
    console.error("Error deleting ticket:", error);
    res.json({ success: false, error: "Failed to delete ticket" });
  }
};

export const deleteMultipleTicketsRoute: RequestHandler = (req, res) => {
  try {
    const { ticketIds }: { ticketIds: string[] } = req.body;

    if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
      return res.json({ success: false, error: "Ticket IDs array is required" });
    }

    const deletedCount = deleteMultipleTickets(ticketIds);

    const response: ApiResponse = {
      success: true,
      data: { deletedCount, total: ticketIds.length },
    };

    res.json(response);
  } catch (error) {
    console.error("Error deleting multiple tickets:", error);
    res.json({ success: false, error: "Failed to delete tickets" });
  }
};

export const getPendingJackpotWinnersRoute: RequestHandler = (req, res) => {
  try {
    const pendingWinners = getPendingJackpotWinners();

    const response: ApiResponse = {
      success: true,
      data: pendingWinners,
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching pending jackpot winners:", error);
    res.json({ success: false, error: "Failed to fetch pending jackpot winners" });
  }
};

export const approveJackpotWinnerRoute: RequestHandler = (req, res) => {
  try {
    const { ticketId, approved, reason } = req.body;
    const user = (req as any).user;

    if (!ticketId || typeof approved !== 'boolean') {
      return res.json({ success: false, error: "Ticket ID and approval status are required" });
    }

    let success: boolean;
    if (approved) {
      success = approveJackpotWinner(ticketId, user.email);
    } else {
      success = rejectJackpotWinner(ticketId, user.email, reason);
    }

    if (!success) {
      return res.json({ success: false, error: "Failed to process jackpot approval" });
    }

    const response: ApiResponse = {
      success: true,
      data: {
        ticketId,
        approved,
        message: approved ? "Jackpot winner approved" : "Jackpot winner rejected"
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Error processing jackpot approval:", error);
    res.json({ success: false, error: "Failed to process jackpot approval" });
  }
};

export const demonstrateIntelligentDrawingRoute: RequestHandler = (req, res) => {
  try {
    demonstrateIntelligentDrawing();

    const response: ApiResponse = {
      success: true,
      data: { message: "Intelligent drawing demonstration completed. Check server logs for details." },
    };

    res.json(response);
  } catch (error) {
    console.error("Error demonstrating intelligent drawing:", error);
    res.json({ success: false, error: "Failed to demonstrate intelligent drawing" });
  }
};

export const getTicketSalesStatusRoute: RequestHandler = (req, res) => {
  try {
    // Get user from token if available
    const user = (req as any).user;
    const userEmail = user?.email;

    const salesStatus = isTicketSalesAllowed(userEmail);

    console.log(`📊 Sales status check for user ${userEmail}:`, salesStatus);

    const response: ApiResponse = {
      success: true,
      data: salesStatus,
    };

    res.json(response);
  } catch (error) {
    console.error("Error getting ticket sales status:", error);
    res.json({ success: false, error: "Failed to get ticket sales status" });
  }
};

export const previewIntelligentDrawingRoute: RequestHandler = (req, res) => {
  try {
    // Get intelligentDrawing parameter from query string (default: true for backward compatibility)
    const intelligentDrawing = req.query.intelligentDrawing !== 'false';
    console.log(`🎯 Preview request with intelligentDrawing: ${intelligentDrawing}`);

    const preview = previewIntelligentDrawing(intelligentDrawing);

    if (!preview.success) {
      return res.json({ success: false, error: preview.error });
    }

    const response: ApiResponse = {
      success: true,
      data: preview.data,
    };

    res.json(response);
  } catch (error) {
    console.error("Error previewing intelligent drawing:", error);
    res.json({ success: false, error: "Failed to preview intelligent drawing" });
  }
};

export const getManualSalesStopStatusRoute: RequestHandler = (req, res) => {
  try {
    const isManuallyBlocked = getManualSalesStopStatus();

    const response: ApiResponse = {
      success: true,
      data: { manualSalesStopEnabled: isManuallyBlocked },
    };

    res.json(response);
  } catch (error) {
    console.error("Error getting manual sales stop status:", error);
    res.json({ success: false, error: "Failed to get manual sales stop status" });
  }
};

export const toggleManualSalesStopRoute: RequestHandler = (req, res) => {
  try {
    const newStatus = toggleManualSalesStop();

    const response: ApiResponse = {
      success: true,
      data: { manualSalesStopEnabled: newStatus },
    };

    res.json(response);
  } catch (error) {
    console.error("Error toggling manual sales stop:", error);
    res.json({ success: false, error: "Failed to toggle manual sales stop" });
  }
};

export const getSalesStopExemptionsRoute: RequestHandler = (req, res) => {
  try {
    const exemptions = getSalesStopExemptions();

    const response: ApiResponse = {
      success: true,
      data: exemptions,
    };

    res.json(response);
  } catch (error) {
    console.error("Error getting sales stop exemptions:", error);
    res.json({ success: false, error: "Failed to get sales stop exemptions" });
  }
};

export const addSalesStopExemptionRoute: RequestHandler = (req, res) => {
  try {
    console.log("📧 Add exemption request received:", req.body);

    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      console.log("❌ Invalid email provided:", email);
      return res.json({ success: false, error: "Valid email is required" });
    }

    const success = addSalesStopExemption(email.trim());

    const response: ApiResponse = {
      success,
      data: { email: email.trim(), added: success },
    };

    console.log("✅ Exemption add response:", response);
    res.json(response);
  } catch (error) {
    console.error("❌ Error adding sales stop exemption:", error);
    res.json({ success: false, error: "Failed to add sales stop exemption" });
  }
};

export const removeSalesStopExemptionRoute: RequestHandler = (req, res) => {
  try {
    console.log("📧 Remove exemption request received:", req.body);

    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      console.log("❌ Invalid email provided:", email);
      return res.json({ success: false, error: "Valid email is required" });
    }

    const success = removeSalesStopExemption(email.trim());

    const response: ApiResponse = {
      success,
      data: { email: email.trim(), removed: success },
    };

    console.log("✅ Exemption remove response:", response);
    res.json(response);
  } catch (error) {
    console.error("❌ Error removing sales stop exemption:", error);
    res.json({ success: false, error: "Failed to remove sales stop exemption" });
  }
};

// Get current prize amounts based on percentage distribution
export const getCurrentPrizeAmountsRoute: RequestHandler = (req, res) => {
  try {
    console.log("🎯 Getting current prize amounts based on percentage distribution...");
    const prizeAmounts = calculateActualPrizeAmounts();

    const response: ApiResponse = {
      success: true,
      data: { prizeAmounts },
    };

    res.json(response);
  } catch (error) {
    console.error("Error getting current prize amounts:", error);
    res.json({ success: false, error: "Failed to get current prize amounts" });
  }
};

// Reserve fund management endpoints
export const getReserveFundRoute: RequestHandler = (req, res) => {
  try {
    const reserveFund = getReserveFund();
    const response: ApiResponse = {
      success: true,
      data: { reserveFund },
    };
    res.json(response);
  } catch (error) {
    console.error("Error getting reserve fund:", error);
    res.json({ success: false, error: "Failed to get reserve fund" });
  }
};

export const setReserveFundRoute: RequestHandler = (req, res) => {
  try {
    const { amount } = req.body;

    if (typeof amount !== 'number' || amount < 0) {
      res.json({ success: false, error: "Invalid amount" });
      return;
    }

    const success = setReserveFund(amount);
    const response: ApiResponse = {
      success,
      data: { newAmount: getReserveFund() },
    };
    res.json(response);
  } catch (error) {
    console.error("Error setting reserve fund:", error);
    res.json({ success: false, error: "Failed to set reserve fund" });
  }
};

export const addToReserveFundRoute: RequestHandler = (req, res) => {
  try {
    const { amount } = req.body;

    if (typeof amount !== 'number' || amount <= 0) {
      res.json({ success: false, error: "Invalid amount" });
      return;
    }

    const success = addToReserveFund(amount);
    const response: ApiResponse = {
      success,
      data: { newAmount: getReserveFund() },
    };
    res.json(response);
  } catch (error) {
    console.error("Error adding to reserve fund:", error);
    res.json({ success: false, error: "Failed to add to reserve fund" });
  }
};

export const getReserveStatsRoute: RequestHandler = (req, res) => {
  try {
    const stats = getReserveStats();
    const response: ApiResponse = {
      success: true,
      data: stats,
    };
    res.json(response);
  } catch (error) {
    console.error("Error getting reserve stats:", error);
    res.json({ success: false, error: "Failed to get reserve stats" });
  }
};

export const getEnhancedAdminStatsRoute: RequestHandler = (req, res) => {
  try {
    const stats = getEnhancedAdminStats();
    const response: ApiResponse = {
      success: true,
      data: stats,
    };
    res.json(response);
  } catch (error) {
    console.error("Error getting enhanced admin stats:", error);
    res.json({ success: false, error: "Failed to get enhanced admin stats" });
  }
};

export const testSophisticatedPayoutsRoute: RequestHandler = (req, res) => {
  try {
    const { drawingId } = req.params;
    const result = testSophisticatedPayouts(drawingId);

    const response: ApiResponse = {
      success: result !== null,
      data: result,
    };
    res.json(response);
  } catch (error) {
    console.error("Error testing sophisticated payouts:", error);
    res.json({ success: false, error: "Failed to test sophisticated payouts" });
  }
};

// Get actual winning amounts from the latest completed drawing
export const getActualWinningAmountsRoute: RequestHandler = (req, res) => {
  try {
    const latestCompletedDrawing = getLatestCompletedDrawing();

    if (!latestCompletedDrawing) {
      res.json({
        success: false,
        error: "No completed drawing found"
      });
      return;
    }

    const actualAmounts: Record<number, number> = {};

    // Get all winning tickets from the latest completed drawing
    const winningTickets = Array.from(getAllTickets()).filter(
      ticket => ticket.drawingId === latestCompletedDrawing.id &&
                ticket.isWinner &&
                ticket.winningAmount &&
                ticket.winningClass
    );

    // Group by winning class and get the actual amounts
    winningTickets.forEach(ticket => {
      if (ticket.winningClass && ticket.winningAmount) {
        actualAmounts[ticket.winningClass] = ticket.winningAmount;
      }
    });

    console.log(`🎯 Actual winning amounts from drawing ${latestCompletedDrawing.id}:`, actualAmounts);

    const response: ApiResponse = {
      success: true,
      data: {
        actualAmounts,
        drawingId: latestCompletedDrawing.id,
        winnersByClass: latestCompletedDrawing.winnersByClass
      },
    };
    res.json(response);
  } catch (error) {
    console.error("Error getting actual winning amounts:", error);
    res.json({ success: false, error: "Failed to get actual winning amounts" });
  }
};
