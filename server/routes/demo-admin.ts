import { RequestHandler } from "express";

// Global demo state
let currentJackpot = 75000000;
let currentDrawingNumbers = { mainNumbers: [], worldNumbers: [] };

// Simulate ticket database for analysis - representing realistic player behavior
const simulatedTickets = [
  // Popular combinations (players often pick these)
  { mainNumbers: [7, 14, 21, 28, 35], worldNumbers: [7, 10] },
  { mainNumbers: [7, 14, 21, 35, 42], worldNumbers: [3, 9] },
  { mainNumbers: [1, 7, 14, 21, 35], worldNumbers: [7, 9] },
  { mainNumbers: [6, 12, 18, 24, 30], worldNumbers: [6, 12] },
  { mainNumbers: [1, 2, 3, 4, 5], worldNumbers: [1, 2] },
  { mainNumbers: [10, 20, 30, 40, 50], worldNumbers: [10, 11] },

  // Birthday combinations (1-31 bias)
  { mainNumbers: [1, 8, 15, 22, 29], worldNumbers: [3, 8] },
  { mainNumbers: [3, 10, 17, 24, 31], worldNumbers: [5, 7] },
  { mainNumbers: [2, 9, 16, 23, 30], worldNumbers: [2, 9] },
  { mainNumbers: [5, 12, 19, 26, 31], worldNumbers: [4, 6] },
  { mainNumbers: [7, 14, 21, 28, 31], worldNumbers: [1, 12] },

  // Lucky number 7 combinations
  { mainNumbers: [7, 17, 27, 37, 47], worldNumbers: [7, 11] },
  { mainNumbers: [7, 13, 19, 25, 31], worldNumbers: [7, 8] },

  // Sequential patterns
  { mainNumbers: [5, 6, 7, 8, 9], worldNumbers: [3, 4] },
  { mainNumbers: [15, 16, 17, 18, 19], worldNumbers: [5, 6] },

  // Even numbers preference
  { mainNumbers: [2, 8, 14, 20, 26], worldNumbers: [2, 8] },
  { mainNumbers: [4, 10, 16, 22, 28], worldNumbers: [4, 10] },
  { mainNumbers: [6, 12, 18, 24, 30], worldNumbers: [6, 12] },

  // Random realistic picks
  { mainNumbers: [3, 11, 23, 35, 41], worldNumbers: [5, 9] },
  { mainNumbers: [8, 15, 22, 36, 49], worldNumbers: [2, 8] },
  { mainNumbers: [1, 13, 25, 37, 48], worldNumbers: [1, 11] },
  { mainNumbers: [9, 18, 27, 36, 45], worldNumbers: [9, 10] },
  { mainNumbers: [4, 11, 18, 25, 32], worldNumbers: [3, 7] },

  // More duplicates of popular combinations to increase frequency
  { mainNumbers: [7, 14, 21, 35, 42], worldNumbers: [3, 9] },
  { mainNumbers: [1, 7, 14, 21, 35], worldNumbers: [7, 9] },
  { mainNumbers: [7, 14, 21, 28, 35], worldNumbers: [7, 10] },
];

// Intelligent drawing analysis function
function performIntelligentDrawing() {
  console.log("🧠 Performing intelligent drawing analysis...");

  // Count frequency of each number in tickets
  const mainNumberFreq: Record<number, number> = {};
  const worldNumberFreq: Record<number, number> = {};

  // Initialize frequency counters
  for (let i = 1; i <= 50; i++) {
    mainNumberFreq[i] = 0;
  }
  for (let i = 1; i <= 12; i++) {
    worldNumberFreq[i] = 0;
  }

  // Count frequencies from simulated tickets
  simulatedTickets.forEach(ticket => {
    ticket.mainNumbers.forEach(num => {
      mainNumberFreq[num]++;
    });
    ticket.worldNumbers.forEach(num => {
      worldNumberFreq[num]++;
    });
  });

  console.log("📊 Main number frequencies:", mainNumberFreq);
  console.log("📊 World number frequencies:", worldNumberFreq);

  // Sort numbers by frequency (ascending - least picked first)
  const sortedMainNumbers = Object.entries(mainNumberFreq)
    .sort(([,a], [,b]) => a - b)
    .map(([num]) => parseInt(num));

  const sortedWorldNumbers = Object.entries(worldNumberFreq)
    .sort(([,a], [,b]) => a - b)
    .map(([num]) => parseInt(num));

  // Pick least frequently selected numbers
  const selectedMainNumbers = sortedMainNumbers.slice(0, 5).sort((a, b) => a - b);
  const selectedWorldNumbers = sortedWorldNumbers.slice(0, 2).sort((a, b) => a - b);

  console.log("🎯 Selected least frequent main numbers:", selectedMainNumbers);
  console.log("🎯 Selected least frequent world numbers:", selectedWorldNumbers);

  return {
    mainNumbers: selectedMainNumbers,
    worldNumbers: selectedWorldNumbers,
    analysis: {
      totalTicketsAnalyzed: simulatedTickets.length,
      leastFrequentMain: selectedMainNumbers,
      leastFrequentWorld: selectedWorldNumbers,
      mainNumberFrequencies: mainNumberFreq,
      worldNumberFrequencies: worldNumberFreq
    }
  };
}

// Demo admin routes that bypass authentication for testing
export const demoJackpotUpdate: RequestHandler = (req, res) => {
  try {
    const { newAmount } = req.body;

    console.log("🎯 Demo jackpot update:", newAmount);

    if (typeof newAmount !== "number" || newAmount < 0) {
      return res.json({ success: false, error: "Invalid jackpot amount" });
    }

    // Update global state
    currentJackpot = newAmount;

    // Simulate successful jackpot update
    const updatedDrawing = {
      id: "drawing-001",
      date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      mainNumbers: currentDrawingNumbers.mainNumbers,
      worldNumbers: currentDrawingNumbers.worldNumbers,
      jackpotAmount: newAmount,
      realJackpot: 37.6,
      simulatedJackpot: newAmount,
      isActive: true,
      winnersByClass: {},
    };

    res.json({
      success: true,
      data: updatedDrawing,
    });
  } catch (error) {
    console.error("Demo jackpot update error:", error);
    res.json({ success: false, error: "Demo jackpot update failed" });
  }
};

export const getCurrentDrawingDemo: RequestHandler = (req, res) => {
  try {
    const drawing = {
      id: "drawing-001",
      date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      mainNumbers: currentDrawingNumbers.mainNumbers,
      worldNumbers: currentDrawingNumbers.worldNumbers,
      jackpotAmount: currentJackpot,
      realJackpot: 37.6,
      simulatedJackpot: currentJackpot,
      isActive: true,
      winnersByClass: {},
    };

    res.json({
      success: true,
      data: drawing,
    });
  } catch (error) {
    console.error("Demo current drawing error:", error);
    res.json({ success: false, error: "Demo current drawing failed" });
  }
};

export const demoDrawing: RequestHandler = (req, res) => {
  try {
    const { manualNumbers, intelligentDrawing } = req.body;

    console.log("🎯 Demo drawing:", { manualNumbers, intelligentDrawing });

    let mainNumbers = [7, 14, 21, 35, 42];
    let worldNumbers = [3, 9];

    if (manualNumbers) {
      // Manual numbers override everything
      mainNumbers = manualNumbers.mainNumbers || mainNumbers;
      worldNumbers = manualNumbers.worldNumbers || worldNumbers;
      console.log("✋ Manual numbers used:", { mainNumbers, worldNumbers });
    } else if (intelligentDrawing !== false) {
      // Intelligent drawing is DEFAULT (unless explicitly disabled)
      const analysisResult = performIntelligentDrawing();
      mainNumbers = analysisResult.mainNumbers;
      worldNumbers = analysisResult.worldNumbers;
      console.log("🧠 Intelligent drawing result:", analysisResult);
    } else {
      // Only use random when explicitly disabled
      console.log("🎲 Random drawing (intelligent drawing disabled)");
    }

    // Update global state
    currentDrawingNumbers = { mainNumbers, worldNumbers };

    let analysisResult = null;
    if (intelligentDrawing !== false && !manualNumbers) {
      analysisResult = performIntelligentDrawing().analysis;
    }

    const updatedDrawing = {
      id: "drawing-001",
      date: new Date().toISOString(),
      mainNumbers,
      worldNumbers,
      jackpotAmount: currentJackpot,
      realJackpot: 37.6,
      simulatedJackpot: currentJackpot,
      isActive: true,
      winnersByClass: {
        1: 0,
        2: 1,
        3: 2,
      },
    };

    res.json({
      success: true,
      data: updatedDrawing,
      analysisResult: analysisResult,
      drawingType: manualNumbers ? 'manual' : (intelligentDrawing !== false ? 'intelligent' : 'random')
    });
  } catch (error) {
    console.error("Demo drawing error:", error);
    res.json({ success: false, error: "Demo drawing failed" });
  }
};

export const demoStats: RequestHandler = (req, res) => {
  try {
    const stats = {
      totalUsers: 10,
      totalTickets: 47,
      totalRevenue: 94.0,
      currentJackpot: 75000000,
      realJackpot: 37.6, // 40% of revenue
      simulatedJackpot: 75000000,
      pendingDrawing: true,
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Demo stats error:", error);
    res.json({ success: false, error: "Demo stats failed" });
  }
};

export const demoPurchaseTickets: RequestHandler = (req, res) => {
  try {
    const { tickets } = req.body;

    console.log("🎯 Demo ticket purchase:", tickets);

    if (!tickets || tickets.length === 0) {
      return res.json({ success: false, error: "No tickets provided" });
    }

    if (tickets.length > 10) {
      return res.json({
        success: false,
        error: "Maximum 10 tickets per drawing",
      });
    }

    // Validate tickets
    for (const ticket of tickets) {
      if (ticket.mainNumbers.length !== 5 || ticket.worldNumbers.length !== 2) {
        return res.json({ success: false, error: "Invalid ticket format" });
      }
    }

    const totalCost = tickets.length * 2;
    const demoBalance = 1000; // Demo user has 1000€

    if (totalCost > demoBalance) {
      return res.json({
        success: false,
        error: `Insufficient balance. Required: ${totalCost}€, Available: ${demoBalance}€`,
      });
    }

    // Create demo purchased tickets
    const purchasedTickets = tickets.map((ticket: any, index: number) => ({
      id: `demo-ticket-${Date.now()}-${index}`,
      userId: "demo-user",
      mainNumbers: ticket.mainNumbers.sort((a: number, b: number) => a - b),
      worldNumbers: ticket.worldNumbers.sort((a: number, b: number) => a - b),
      cost: 2,
      drawingDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      isWinner: false,
      createdAt: new Date().toISOString(),
    }));

    res.json({
      success: true,
      data: purchasedTickets,
    });
  } catch (error) {
    console.error("Demo ticket purchase error:", error);
    res.json({ success: false, error: "Demo ticket purchase failed" });
  }
};

export const demoTickets: RequestHandler = (req, res) => {
  try {
    // Generate some demo tickets
    const demoTickets = [
      {
        id: "ticket-001",
        userId: "user-001",
        mainNumbers: [7, 14, 21, 35, 42],
        worldNumbers: [3, 9],
        cost: 2,
        drawingDate: new Date().toISOString(),
        isWinner: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: "ticket-002",
        userId: "user-002",
        mainNumbers: [1, 12, 23, 34, 45],
        worldNumbers: [5, 11],
        cost: 2,
        drawingDate: new Date().toISOString(),
        isWinner: true,
        winningClass: 5,
        winningAmount: 300,
        createdAt: new Date().toISOString(),
      },
      {
        id: "ticket-003",
        userId: "user-003",
        mainNumbers: [8, 15, 22, 36, 49],
        worldNumbers: [2, 8],
        cost: 2,
        drawingDate: new Date().toISOString(),
        isWinner: false,
        createdAt: new Date().toISOString(),
      },
    ];

    res.json({
      success: true,
      data: demoTickets,
    });
  } catch (error) {
    console.error("Demo tickets error:", error);
    res.json({ success: false, error: "Demo tickets failed" });
  }
};
