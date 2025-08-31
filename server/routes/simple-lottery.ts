import { RequestHandler } from "express";
import { users } from "./simple-auth";

interface LotteryTicket {
  id: string;
  userId: string;
  mainNumbers: number[];
  worldNumbers: number[];
  cost: number;
  drawingDate: string;
  isWinner: boolean;
  winningClass?: number;
  winningAmount?: number;
  createdAt: string;
}

interface Drawing {
  id: string;
  date: string;
  mainNumbers: number[];
  worldNumbers: number[];
  jackpotAmount: number;
  realJackpot: number;
  simulatedJackpot: number;
  isActive: boolean;
  winnersByClass: Record<number, number>;
}

// In-memory storage
const tickets = new Map<string, LotteryTicket>();
const drawings = new Map<string, Drawing>();

// Initialize with current drawing
const initDrawings = () => {
  const currentDrawing: Drawing = {
    id: "drawing-001",
    date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    mainNumbers: [],
    worldNumbers: [],
    jackpotAmount: 75000000,
    realJackpot: 0,
    simulatedJackpot: 75000000,
    isActive: true,
    winnersByClass: {},
  };

  drawings.set(currentDrawing.id, currentDrawing);
};

initDrawings();

const getCurrentDrawing = (): Drawing | null => {
  for (const drawing of drawings.values()) {
    if (drawing.isActive) {
      return drawing;
    }
  }
  return null;
};

const updateRealJackpot = () => {
  const currentDrawing = getCurrentDrawing();
  if (currentDrawing) {
    const totalRevenue = tickets.size * 2;
    const newRealJackpot = Math.floor(totalRevenue * 0.4);
    currentDrawing.realJackpot = newRealJackpot;
    drawings.set(currentDrawing.id, currentDrawing);
  }
};

export const getCurrentDrawingRoute: RequestHandler = (req, res) => {
  try {
    const drawing = getCurrentDrawing();
    res.json({
      success: true,
      data: drawing,
    });
  } catch (error) {
    console.error("Error fetching current drawing:", error);
    res.json({ success: false, error: "Failed to fetch current drawing" });
  }
};

export const purchaseTickets: RequestHandler = (req, res) => {
  try {
    const user = (req as any).user;
    const { tickets: ticketData } = req.body;

    if (!ticketData || ticketData.length === 0) {
      return res.json({ success: false, error: "No tickets provided" });
    }

    if (ticketData.length > 10) {
      return res.json({
        success: false,
        error: "Maximum 10 tickets per drawing",
      });
    }

    // Validate ticket data
    for (const ticket of ticketData) {
      if (ticket.mainNumbers.length !== 5 || ticket.worldNumbers.length !== 2) {
        return res.json({ success: false, error: "Invalid ticket format" });
      }

      const invalidMain = ticket.mainNumbers.some(
        (n: number) => n < 1 || n > 50,
      );
      const invalidWorld = ticket.worldNumbers.some(
        (n: number) => n < 1 || n > 12,
      );

      if (invalidMain || invalidWorld) {
        return res.json({
          success: false,
          error: "Numbers out of valid range",
        });
      }

      const uniqueMain = new Set(ticket.mainNumbers);
      const uniqueWorld = new Set(ticket.worldNumbers);

      if (uniqueMain.size !== 5 || uniqueWorld.size !== 2) {
        return res.json({
          success: false,
          error: "Duplicate numbers in ticket",
        });
      }
    }

    const totalCost = ticketData.length * 2;
    const userAccount = users.get(user.email);

    if (!userAccount || userAccount.balance < totalCost) {
      return res.json({ success: false, error: "Insufficient balance" });
    }

    // Create tickets
    const createdTickets = ticketData.map((ticket: any) => {
      const newTicket: LotteryTicket = {
        id: `ticket-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId: user.id,
        mainNumbers: [...ticket.mainNumbers].sort((a, b) => a - b),
        worldNumbers: [...ticket.worldNumbers].sort((a, b) => a - b),
        cost: 2,
        drawingDate: getCurrentDrawing()?.date || new Date().toISOString(),
        isWinner: false,
        createdAt: new Date().toISOString(),
      };

      tickets.set(newTicket.id, newTicket);
      return newTicket;
    });

    // Deduct balance
    userAccount.balance -= totalCost;
    users.set(user.email, userAccount);

    // Update real jackpot
    updateRealJackpot();

    res.json({
      success: true,
      data: createdTickets,
    });
  } catch (error) {
    console.error("Error purchasing tickets:", error);
    res.json({ success: false, error: "Failed to purchase tickets" });
  }
};

export const getMyTickets: RequestHandler = (req, res) => {
  try {
    const user = (req as any).user;
    const userTickets = Array.from(tickets.values()).filter(
      (ticket) => ticket.userId === user.id,
    );

    res.json({
      success: true,
      data: userTickets,
    });
  } catch (error) {
    console.error("Error fetching user tickets:", error);
    res.json({ success: false, error: "Failed to fetch tickets" });
  }
};

export const performDrawing: RequestHandler = (req, res) => {
  try {
    const { manualNumbers } = req.body;
    const currentDrawing = getCurrentDrawing();

    if (!currentDrawing) {
      return res.json({ success: false, error: "No active drawing found" });
    }

    let drawnMainNumbers: number[];
    let drawnWorldNumbers: number[];

    if (manualNumbers) {
      drawnMainNumbers = manualNumbers.mainNumbers;
      drawnWorldNumbers = manualNumbers.worldNumbers;
    } else {
      // Simple random drawing (intelligent drawing would avoid commonly picked numbers)
      drawnMainNumbers = [];
      while (drawnMainNumbers.length < 5) {
        const num = Math.floor(Math.random() * 50) + 1;
        if (!drawnMainNumbers.includes(num)) {
          drawnMainNumbers.push(num);
        }
      }
      drawnMainNumbers.sort((a, b) => a - b);

      drawnWorldNumbers = [];
      while (drawnWorldNumbers.length < 2) {
        const num = Math.floor(Math.random() * 12) + 1;
        if (!drawnWorldNumbers.includes(num)) {
          drawnWorldNumbers.push(num);
        }
      }
      drawnWorldNumbers.sort((a, b) => a - b);
    }

    // Update drawing
    currentDrawing.mainNumbers = drawnMainNumbers;
    currentDrawing.worldNumbers = drawnWorldNumbers;
    drawings.set(currentDrawing.id, currentDrawing);

    // Calculate winners (simplified)
    const allTickets = Array.from(tickets.values());
    const winnersByClass: Record<number, number> = {};

    allTickets.forEach((ticket) => {
      const mainMatches = ticket.mainNumbers.filter((num) =>
        drawnMainNumbers.includes(num),
      ).length;
      const worldMatches = ticket.worldNumbers.filter((num) =>
        drawnWorldNumbers.includes(num),
      ).length;

      let winningClass = 0;
      if (mainMatches === 5 && worldMatches === 2) winningClass = 1;
      else if (mainMatches === 5 && worldMatches === 1) winningClass = 2;
      else if (mainMatches === 5 && worldMatches === 0) winningClass = 3;
      else if (mainMatches === 4 && worldMatches === 2) winningClass = 4;
      else if (mainMatches === 4 && worldMatches === 1) winningClass = 5;

      if (winningClass > 0) {
        ticket.isWinner = true;
        ticket.winningClass = winningClass;
        // Don't set winningAmount here - it will be calculated by the sophisticated payout system
        tickets.set(ticket.id, ticket);

        winnersByClass[winningClass] = (winnersByClass[winningClass] || 0) + 1;
      }
    });

    currentDrawing.winnersByClass = winnersByClass;
    drawings.set(currentDrawing.id, currentDrawing);

    // Calculate sophisticated payouts for all winning tickets
    if (Object.keys(winnersByClass).length > 0) {
      try {
        // Import and use the sophisticated payout calculation
        const { calculateSophisticatedPayouts } = require("../data/lottery");
        const payoutResult = calculateSophisticatedPayouts(currentDrawing);

        // Update all winning tickets with correct amounts
        Array.from(tickets.values()).forEach(ticket => {
          if (ticket.isWinner && ticket.winningClass) {
            const classResult = payoutResult.payoutsByClass[ticket.winningClass];
            if (classResult) {
              ticket.winningAmount = Math.floor(classResult.perWinner);
              tickets.set(ticket.id, ticket);
            }
          }
        });

        console.log(`💰 Applied sophisticated payouts to ${Object.keys(winnersByClass).length} winning classes`);
      } catch (error) {
        console.error("Error applying sophisticated payouts:", error);
      }
    }

    res.json({
      success: true,
      data: currentDrawing,
    });
  } catch (error) {
    console.error("Error performing drawing:", error);
    res.json({ success: false, error: "Failed to perform drawing" });
  }
};

export const updateJackpot: RequestHandler = (req, res) => {
  try {
    const { newAmount, isSimulated } = req.body;

    if (typeof newAmount !== "number" || newAmount < 0) {
      return res.json({ success: false, error: "Invalid jackpot amount" });
    }

    const currentDrawing = getCurrentDrawing();
    if (!currentDrawing) {
      return res.json({ success: false, error: "No active drawing found" });
    }

    if (isSimulated !== false) {
      currentDrawing.simulatedJackpot = newAmount;
      currentDrawing.jackpotAmount = newAmount;
    } else {
      currentDrawing.realJackpot = newAmount;
    }

    drawings.set(currentDrawing.id, currentDrawing);

    res.json({
      success: true,
      data: currentDrawing,
    });
  } catch (error) {
    console.error("Error updating jackpot:", error);
    res.json({ success: false, error: "Failed to update jackpot" });
  }
};

export const getAdminStats: RequestHandler = (req, res) => {
  try {
    const allTickets = Array.from(tickets.values());
    const totalRevenue = allTickets.length * 2;
    const currentDrawing = getCurrentDrawing();

    const stats = {
      totalUsers: new Set(allTickets.map((t) => t.userId)).size,
      totalTickets: allTickets.length,
      totalRevenue,
      currentJackpot: currentDrawing?.jackpotAmount || 0,
      realJackpot: currentDrawing?.realJackpot || 0,
      simulatedJackpot: currentDrawing?.simulatedJackpot || 0,
      pendingDrawing: currentDrawing
        ? currentDrawing.mainNumbers.length === 0
        : false,
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    res.json({ success: false, error: "Failed to fetch admin stats" });
  }
};

export const getAllTickets: RequestHandler = (req, res) => {
  try {
    const allTickets = Array.from(tickets.values()).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    res.json({
      success: true,
      data: allTickets,
    });
  } catch (error) {
    console.error("Error fetching all tickets:", error);
    res.json({ success: false, error: "Failed to fetch tickets" });
  }
};

export const getDrawingHistory: RequestHandler = (req, res) => {
  try {
    const history = Array.from(drawings.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error("Error fetching drawing history:", error);
    res.json({ success: false, error: "Failed to fetch drawing history" });
  }
};
