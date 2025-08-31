import { LotteryTicket, Drawing, User, WINNING_CLASSES, DisplayOverrideRequest } from "../../shared/types";
import { calculateNextDrawingDate, getCurrentDrawingSchedule } from "../utils/dateCalculations";
import { users } from "../routes/simple-auth";
import { bitcoinService } from "../services/BitcoinService";
import { paymentService } from "../services/PaymentService";
import { getTicketPriceUsd } from "../utils/pricing";

// Admin settings
let quicktipp1kEnabled = false;
let manualSalesStopped = false; // Manual sales stop toggle for testing

// Reserve fund management
let reserveFund = 0; // Global reserve fund in USD
const RESERVE_PERCENTAGE = 0.05; // 5% of prize pool goes to reserve
const JACKPOT_CAP = 100000000000; // 100 billion USD cap

// Prize class configuration matching your specifications
export const PRIZE_CLASS_CONFIG = {
  1: { percentage: 40.0, minPrize: 10000000, cap: null }, // No cap for jackpot
  2: { percentage: 15.0, minPrize: 100000, cap: 5000000 },
  3: { percentage: 8.0, minPrize: 50000, cap: 1000000 },
  4: { percentage: 5.0, minPrize: 5000, cap: 500000 },
  5: { percentage: 4.0, minPrize: 300, cap: 100000 },
  6: { percentage: 3.0, minPrize: 200, cap: 50000 },
  7: { percentage: 2.0, minPrize: 100, cap: 25000 },
  8: { percentage: 1.5, minPrize: 25, cap: 10000 },
  9: { percentage: 1.5, minPrize: 20, cap: 8000 },
  10: { percentage: 1.0, minPrize: 15, cap: 5000 },
  11: { percentage: 0.5, minPrize: 10, cap: 2000 },
  12: { percentage: 0.5, minPrize: 8, cap: 1000 }
};

// Sales stop exemption list - users who can buy during sales stops
const salesStopExemptions: Set<string> = new Set(['Admin@world.com']); // Default: Admin can always buy

// In-memory storage for lottery data (in production, use a database)
const tickets: Map<string, LotteryTicket> = new Map();
const drawings: Map<string, Drawing> = new Map();
const deletedTickets: Set<string> = new Set(); // Track deleted ticket IDs

// Initialize with a current drawing
const initializeDrawings = () => {
  // Use default date for initialization (will be updated later when overrides are available)
  const drawingDate = new Date('2025-08-22T21:00:00.000+02:00');
  console.log(`🎲 Initializing drawing with default date: ${drawingDate.toLocaleString('de-DE', {timeZone: 'Europe/Berlin'})}`);

  const currentDrawing: Drawing = {
    id: "drawing-001",
    date: drawingDate.toISOString(),
    mainNumbers: [], // Empty until drawn
    worldNumbers: [], // Empty until drawn
    jackpotAmount: 1000000, // 1 million starting jackpot
    realJackpot: 0, // Will be calculated from ticket sales
    simulatedJackpot: 1000000, // Admin can control this
    isActive: true,
    winnersByClass: {},
  };

  drawings.set(currentDrawing.id, currentDrawing);
};

// Initialize on module load
initializeDrawings();

// Update drawing dates with overrides after initialization
const updateDrawingDatesWithOverrides = () => {
  if (globalDisplayOverrides.manualDate && globalDisplayOverrides.manualTime) {
    const manualDateTime = `${globalDisplayOverrides.manualDate}T${globalDisplayOverrides.manualTime}:00.000+02:00`;
    let newDate = new Date(manualDateTime);

    // If manual date/time is in the past, compute the next scheduled future date
    if (newDate.getTime() <= Date.now()) {
      const next = calculateNextDrawingDate(getGlobalDisplayOverrides());
      newDate = next;
    }

    // Update current drawing date
    const currentDrawing = getCurrentDrawing();
    if (currentDrawing) {
      currentDrawing.date = newDate.toISOString();
      drawings.set(currentDrawing.id, currentDrawing);
      console.log(`🎲 Updated current drawing date to: ${newDate.toLocaleString('de-DE', {timeZone: 'Europe/Berlin'})}`);
    }
  }
};

// Call after module load when globalDisplayOverrides is available
setTimeout(updateDrawingDatesWithOverrides, 100);

const createNextDrawing = (previousDrawing?: Drawing) => {
  const nextDrawingNumber = drawings.size + 1;

  // Calculate next jackpot based on previous drawing results
  let nextJackpot = 1000000; // Default base jackpot (1 million USD)
  if (previousDrawing) {
    const previousDrawingTickets = Array.from(tickets.values()).filter(
      ticket => ticket.drawingId === previousDrawing.id && !deletedTickets.has(ticket.id)
    );
    const ticketSalesRevenue = previousDrawingTickets.length * 2; // $2 per ticket
    const jackpotIncrease = Math.floor(ticketSalesRevenue * 0.4); // 40% goes to jackpot
    const totalWinningsPayout = previousDrawing.totalWinningsPayout || 0;

    if (previousDrawing.winnersByClass && previousDrawing.winnersByClass[1] > 0) {
      // Class 1 winner found, reset to base jackpot
      nextJackpot = 1000000;
      console.log(`🎲 Jackpot reset: Class 1 winner found, jackpot reset to base $${nextJackpot}`);
    } else {
      // No Class 1 winner, carry over jackpot minus all winnings payouts, plus 40% of sales
      nextJackpot = Math.max(1000000, previousDrawing.jackpotAmount - totalWinningsPayout + jackpotIncrease);
      console.log(`��� Jackpot calculation: Previous: $${previousDrawing.jackpotAmount}, Payouts: -$${totalWinningsPayout}, Sales increase: +$${jackpotIncrease}, Next: $${nextJackpot}`);
    }
  }

  // Calculate next drawing date using the new logic
  const displayOverrides = getGlobalDisplayOverrides();
  const drawingDate = calculateNextDrawingDate(displayOverrides);

  console.log(`🎲 Creating next drawing for: ${drawingDate.toLocaleString('de-DE', {timeZone: 'Europe/Berlin'})}`);

  // Update the config to record the drawing date correctly
  if (previousDrawing) {
    // Make sure the previous drawing date reflects when it was actually drawn
    const now = new Date();
    previousDrawing.date = now.toISOString();
    drawings.set(previousDrawing.id, previousDrawing);
    console.log(`🎲 Updated previous drawing date to actual drawing time: ${now.toLocaleString('de-DE', {timeZone: 'Europe/Berlin'})}`);
  }

  const nextDrawing: Drawing = {
    id: `drawing-${nextDrawingNumber.toString().padStart(3, '0')}`,
    date: drawingDate.toISOString(),
    mainNumbers: [], // Empty until drawn
    worldNumbers: [], // Empty until drawn
    jackpotAmount: nextJackpot,
    realJackpot: 0, // Will be calculated from ticket sales
    simulatedJackpot: nextJackpot,
    isActive: true,
    winnersByClass: {},
  };

  drawings.set(nextDrawing.id, nextDrawing);
  return nextDrawing;
};

export const createTicket = (
  userId: string,
  mainNumbers: number[],
  worldNumbers: number[],
): LotteryTicket => {
  const currentDrawing = getCurrentDrawing();
  if (!currentDrawing) {
    throw new Error("No active drawing available for ticket purchase");
  }

  const ticket: LotteryTicket = {
    id: `ticket-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    userId,
    mainNumbers: [...mainNumbers].sort((a, b) => a - b),
    worldNumbers: [...worldNumbers].sort((a, b) => a - b),
    cost: 2, // Always 2€
    drawingDate: currentDrawing.date, // Link to specific drawing
    drawingId: currentDrawing.id, // Link to specific drawing ID
    isWinner: false,
    createdAt: new Date().toISOString(),
  };

  tickets.set(ticket.id, ticket);

  console.log(`🎫 Ticket created for drawing ${currentDrawing.id} (${currentDrawing.date})`);

  // Update real jackpot (40% of ticket sales)
  updateRealJackpot();

  return ticket;
};

export const getTicketsByUser = (userId: string): LotteryTicket[] => {
  return Array.from(tickets.values()).filter(
    (ticket) => ticket.userId === userId,
  );
};

export const getCurrentDrawing = (): Drawing | null => {
  for (const drawing of drawings.values()) {
    if (drawing.isActive) {
      return drawing;
    }
  }
  return null;
};

export const getLatestCompletedDrawing = (): Drawing | null => {
  const allDrawings = Array.from(drawings.values());
  // Find the latest completed drawing (has numbers and is not active)
  const completedDrawings = allDrawings.filter(
    drawing => !drawing.isActive && drawing.mainNumbers.length > 0
  );

  if (completedDrawings.length === 0) return null;

  // Sort by ID (newest first) and return the latest one
  completedDrawings.sort((a, b) => b.id.localeCompare(a.id));
  return completedDrawings[0];
};

export const updateRealJackpot = () => {
  const currentDrawing = getCurrentDrawing();
  if (currentDrawing) {
    // Only count tickets for the current drawing that haven't been deleted
    const currentDrawingTickets = Array.from(tickets.values()).filter(
      ticket => ticket.drawingId === currentDrawing.id && !deletedTickets.has(ticket.id)
    );
    const totalRevenue = currentDrawingTickets.length * getTicketPriceUsd();
    const jackpotFromTickets = Math.floor(totalRevenue * 0.4); // 40% goes to jackpot

    // Update the real jackpot to show current accumulated amount
    // This displays the base jackpot (1M or carried over) plus current drawing contribution
    currentDrawing.realJackpot = jackpotFromTickets;
    drawings.set(currentDrawing.id, currentDrawing);
  }
};

export const updateJackpotAmount = (
  newAmount: number,
  isSimulated: boolean = true,
): boolean => {
  const currentDrawing = getCurrentDrawing();
  if (currentDrawing) {
    if (isSimulated) {
      currentDrawing.simulatedJackpot = newAmount;
      currentDrawing.jackpotAmount = newAmount; // Display the simulated amount
    } else {
      currentDrawing.realJackpot = newAmount;
    }
    drawings.set(currentDrawing.id, currentDrawing);
    return true;
  }
  return false;
};

// Intelligent number drawing - avoids commonly picked numbers
export const performIntelligentDrawing = (manualNumbers?: {
  mainNumbers: number[];
  worldNumbers: number[];
}): Drawing | null => {
  console.log("🎲 Starting intelligent drawing...");

  const currentDrawing = getCurrentDrawing();
  if (!currentDrawing) {
    console.log("❌ No current drawing found");
    return null;
  }

  console.log("🎲 Current drawing:", currentDrawing.id);

  let drawnMainNumbers: number[];
  let drawnWorldNumbers: number[];

  if (manualNumbers) {
    drawnMainNumbers = manualNumbers.mainNumbers;
    drawnWorldNumbers = manualNumbers.worldNumbers;
  } else {
    // Analyze only CURRENT drawing tickets (waiting for next drawing) to find UNPLAYED numbers
    const currentDrawingTickets = Array.from(tickets.values()).filter(
      ticket => ticket.drawingId === currentDrawing.id && !deletedTickets.has(ticket.id)
    );

    console.log(`🧠 INTELLIGENT CASINO OPTIMIZATION: Analyzing ${currentDrawingTickets.length} waiting tickets for current drawing...`);

    // If no tickets exist, fall back to random numbers
    if (currentDrawingTickets.length === 0) {
      console.log("⚠️ No tickets found for current drawing, falling back to random selection");
      drawnMainNumbers = generateRandomNumbers(1, 50, 5);
      drawnWorldNumbers = generateRandomNumbers(1, 12, 2);
    } else {
      // Find which numbers were NOT picked by ANY ticket (for maximum payout reduction)
      const pickedMainNumbers = new Set<number>();
      const pickedWorldNumbers = new Set<number>();

      currentDrawingTickets.forEach((ticket) => {
        ticket.mainNumbers.forEach((num) => {
          pickedMainNumbers.add(num);
        });
        ticket.worldNumbers.forEach((num) => {
          pickedWorldNumbers.add(num);
        });
      });

      // Generate frequency maps for analysis
      const mainNumberFrequency = new Map<number, number>();
      const worldNumberFrequency = new Map<number, number>();

      currentDrawingTickets.forEach((ticket) => {
        ticket.mainNumbers.forEach((num) => {
          mainNumberFrequency.set(num, (mainNumberFrequency.get(num) || 0) + 1);
        });
        ticket.worldNumbers.forEach((num) => {
          worldNumberFrequency.set(num, (worldNumberFrequency.get(num) || 0) + 1);
        });
      });

      // Use the same intelligent algorithm as preview
      drawnMainNumbers = chooseLeastFrequent(1, 50, 5, mainNumberFrequency);
      drawnWorldNumbers = chooseLeastFrequent(1, 12, 2, worldNumberFrequency);

      console.log("🧠 INTELLIGENT CASINO OPTIMIZATION: Using frequency-based number selection");
      console.log(`🎯 Selected main numbers: [${drawnMainNumbers.join(', ')}]`);
      console.log(`🎯 Selected world numbers: [${drawnWorldNumbers.join(', ')}]`);

      console.log("🎯 FINAL INTELLIGENT SELECTION:");
      console.log("Main numbers drawn:", drawnMainNumbers);
      console.log("World numbers drawn:", drawnWorldNumbers);
    }
  }

  console.log("�� Drawn numbers - Main:", drawnMainNumbers, "World:", drawnWorldNumbers);

  // Update drawing with current timestamp to reflect when it was actually drawn
  const now = new Date();
  currentDrawing.mainNumbers = drawnMainNumbers;
  currentDrawing.worldNumbers = drawnWorldNumbers;
  currentDrawing.isActive = false; // Mark as completed
  currentDrawing.date = now.toISOString(); // Set to actual drawing time
  drawings.set(currentDrawing.id, currentDrawing);

  console.log(`🎲 Drawing completed at: ${now.toLocaleString('de-DE', {timeZone: 'Europe/Berlin'})}`);

  // Update display overrides to reflect this as the base date
  const currentSchedule = getCurrentDrawingSchedule(getGlobalDisplayOverrides());
  globalDisplayOverrides.manualDate = now.toISOString().split('T')[0];
  globalDisplayOverrides.manualTime = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
  console.log(`🎲 Updated display overrides to drawing completion time for next drawing calculation`);

  console.log("🎲 Drawing updated and marked as completed");

  // Calculate winners
  calculateWinners(currentDrawing);

  console.log("�� Winners calculated");

  // Create next drawing
  const nextDrawing = createNextDrawing(currentDrawing);
  console.log("🎲 Next drawing created:", nextDrawing.id);

  // Nach der Ziehung Verkauf sofort wieder freigeben
  if (manualSalesStopped) {
    manualSalesStopped = false;
    console.log('🟢 SALES: Verkaufsstopp automatisch aufgehoben – Verkauf wieder freigegeben');
  }

  // Automatische Auszahlungen verarbeiten
  processAutomaticPayouts(currentDrawing);

  return currentDrawing;
};

const chooseLeastFrequent = (
  min: number,
  max: number,
  count: number,
  frequency: Map<number, number>,
): number[] => {
  const candidates: { number: number; frequency: number }[] = [];

  for (let i = min; i <= max; i++) {
    candidates.push({ number: i, frequency: frequency.get(i) || 0 });
  }

  // First priority: Numbers that were NEVER picked (frequency = 0)
  const neverPicked = candidates.filter(c => c.frequency === 0);

  console.log(`🧮 MINIMAL PAYOUT ALGORITHM (${min}-${max}, need ${count}):`);
  console.log(`   📊 Total numbers available: ${candidates.length}`);
  console.log(`   🚫 Numbers NEVER picked: ${neverPicked.length}`);

  let selected: { number: number; frequency: number }[] = [];

  if (neverPicked.length >= count) {
    // Perfect! We have enough numbers that were never picked
    selected = neverPicked.slice(0, count).sort(() => Math.random() - 0.5).slice(0, count);
    console.log(`   ✅ JACKPOT! Using ${count} numbers that were NEVER picked = ZERO winners!`);
  } else {
    // Not enough unpicked numbers, use what we have + lowest frequency
    console.log(`   ⚠️ Only ${neverPicked.length} numbers never picked, need ${count - neverPicked.length} more`);

    selected = [...neverPicked];

    // Sort remaining candidates by frequency (ascending)
    const remaining = candidates
      .filter(c => c.frequency > 0)
      .sort((a, b) => {
        if (a.frequency === b.frequency) {
          return Math.random() - 0.5;
        }
        return a.frequency - b.frequency;
      });

    selected.push(...remaining.slice(0, count - neverPicked.length));
  }

  // Calculate potential payout savings
  const totalTickets = Array.from(frequency.values()).reduce((sum, freq) => sum + freq, 0);
  const avgFrequency = candidates.reduce((sum, c) => sum + c.frequency, 0) / candidates.length;

  console.log(`   💰 PAYOUT ANALYSIS:`);
  console.log(`   📈 Average picks per number: ${avgFrequency.toFixed(2)}`);

  selected.forEach(s => {
    if (s.frequency === 0) {
      console.log(`      �� ${s.number}: ZERO picks = NO WINNERS! 💰`);
    } else {
      console.log(`      🔹 ${s.number}: ${s.frequency} picks = ${s.frequency} potential winners`);
    }
  });

  const selectedNumbers = selected.map((c) => c.number).sort((a, b) => a - b);

  console.log(`   🎲 OPTIMAL SELECTION for MINIMAL PAYOUTS: [${selectedNumbers.join(', ')}]`);

  return selectedNumbers;
};

const calculateWinners = (drawing: Drawing) => {
  // Only consider tickets for this specific drawing that haven't been deleted
  const drawingTickets = Array.from(tickets.values()).filter(
    ticket => ticket.drawingId === drawing.id && !deletedTickets.has(ticket.id)
  );

  console.log(`🎯 Calculating winners for drawing ${drawing.id}: ${drawingTickets.length} valid tickets (${deletedTickets.size} tickets excluded)`);

  const winnersByClass: Record<number, number> = {};
  const winningTicketsByClass: Record<number, LotteryTicket[]> = {};

  // First pass: categorize all winning tickets by class
  drawingTickets.forEach((ticket) => {
    const mainMatches = ticket.mainNumbers.filter((num) =>
      drawing.mainNumbers.includes(num),
    ).length;
    const worldMatches = ticket.worldNumbers.filter((num) =>
      drawing.worldNumbers.includes(num),
    ).length;

    const winningClass = determineWinningClass(mainMatches, worldMatches);

    if (winningClass > 0) {
      ticket.isWinner = true;
      ticket.winningClass = winningClass;

      winnersByClass[winningClass] = (winnersByClass[winningClass] || 0) + 1;

      if (!winningTicketsByClass[winningClass]) {
        winningTicketsByClass[winningClass] = [];
      }
      winningTicketsByClass[winningClass].push(ticket);
    }
  });

  // Update drawing with winner counts before sophisticated calculation
  drawing.winnersByClass = winnersByClass;

  // Use sophisticated payout calculation system
  const payoutResult = calculateSophisticatedPayouts(drawing);

  // Update global reserve fund
  reserveFund = payoutResult.newReserveFund;

  // Store the calculated next jackpot in the drawing for use by createNextDrawing
  drawing.nextJackpotAmount = payoutResult.newJackpot;

  console.log(`🎯 SOPHISTICATED PAYOUT RESULTS:`);
  console.log(`   Reserve fund updated: ${reserveFund}€`);
  console.log(`   New jackpot for next drawing: ${payoutResult.newJackpot}€`);

  // Second pass: assign calculated payouts to winning tickets
  let totalWinningsPayout = 0;

  Object.entries(winningTicketsByClass).forEach(([classStr, ticketsInClass]) => {
    const winningClass = parseInt(classStr);
    const classPayoutInfo = payoutResult.payoutsByClass[winningClass];

    if (classPayoutInfo) {
      const amountPerWinner = Math.floor(classPayoutInfo.perWinner);

      ticketsInClass.forEach((ticket) => {
        ticket.winningAmount = amountPerWinner;

        // Special handling for Class 1 (Jackpot) winners - requires admin approval
        if (winningClass === 1) {
          ticket.jackpotApprovalStatus = 'pending';
          console.log(`🎰 JACKPOT WINNER! Ticket ${ticket.id.slice(-6)} gets ${amountPerWinner}€ (requires admin approval)`);
          // Don't credit winnings yet - wait for admin approval
        } else {
          // For non-jackpot winners, credit immediately
          const userAccount = Array.from(users.values()).find(user => user.id === ticket.userId);
          if (userAccount) {
            userAccount.balance += ticket.winningAmount;
            users.set(userAccount.email, userAccount);
            console.log(`💰 Credited ${ticket.winningAmount}€ to user ${userAccount.email} (Ticket: ${ticket.id.slice(-6)}, Class: ${winningClass})`);
          }
          totalWinningsPayout += ticket.winningAmount;
        }

        tickets.set(ticket.id, ticket);
      });
    }
  });

  // Store total winnings payout and update jackpot for next drawing
  console.log(`💰 Total winnings payout: ${totalWinningsPayout}€ (excluding pending jackpots)`);
  console.log(`🏆 Winners by class:`, winnersByClass);
  console.log(`🎰 Next drawing jackpot set to: ${payoutResult.newJackpot}€`);

  drawing.totalWinningsPayout = totalWinningsPayout;
  drawings.set(drawing.id, drawing);
};

const determineWinningClass = (
  mainMatches: number,
  worldMatches: number,
): number => {
  if (mainMatches === 5 && worldMatches === 2) return 1; // Jackpot
  if (mainMatches === 5 && worldMatches === 1) return 2;
  if (mainMatches === 5 && worldMatches === 0) return 3;
  if (mainMatches === 4 && worldMatches === 2) return 4;
  if (mainMatches === 4 && worldMatches === 1) return 5;
  if (mainMatches === 3 && worldMatches === 2) return 6;
  if (mainMatches === 4 && worldMatches === 0) return 7;
  if (mainMatches === 2 && worldMatches === 2) return 8;
  if (mainMatches === 3 && worldMatches === 1) return 9;
  if (mainMatches === 3 && worldMatches === 0) return 10;
  if (mainMatches === 1 && worldMatches === 2) return 11;
  if (mainMatches === 2 && worldMatches === 1) return 12;

  return 0; // No win
};

// Sophisticated payout calculation system
interface PayoutCalculationResult {
  totalPayout: number;
  payoutsByClass: Record<number, { totalPayout: number; perWinner: number; winnersCount: number }>;
  reserveUsed: number;
  reserveAdded: number;
  newReserveFund: number;
  newJackpot: number;
}

export const calculateSophisticatedPayouts = (
  drawing: Drawing,
  ticketPrice: number = 2,
  payoutRate: number = 0.50 // 50% payout rate
): PayoutCalculationResult => {
  console.log(`🧮 SOPHISTICATED PAYOUT CALCULATION for drawing ${drawing.id}`);
  console.log(`==================================================`);

  // 1. Define base values
  const drawingTickets = Array.from(tickets.values()).filter(
    ticket => ticket.drawingId === drawing.id && !deletedTickets.has(ticket.id)
  );

  const T = drawingTickets.length; // Total tickets sold
  const P = ticketPrice; // Ticket price in EUR
  const poolBase = T * P * payoutRate; // Total prize pool from ticket sales
  const jackpotPrev = drawing.jackpotAmount; // Previous jackpot

  console.log(`📊 Base calculations:`);
  console.log(`   T (tickets sold): ${T}`);
  console.log(`   P (ticket price): ${P}€`);
  console.log(`   Pool base (T × P × ${payoutRate}): ${poolBase}€`);
  console.log(`   Previous jackpot: ${jackpotPrev}€`);
  console.log(`   Current reserve fund: ${reserveFund}€`);

  // 2. Calculate prize pool for this drawing
  const poolForClasses = poolBase * (1 - RESERVE_PERCENTAGE);
  const reserveAddition = poolBase * RESERVE_PERCENTAGE;
  let currentReserve = reserveFund + reserveAddition;

  console.log(`�� Prize pool distribution:`);
  console.log(`   Pool for classes (${(1-RESERVE_PERCENTAGE)*100}%): ${poolForClasses}€`);
  console.log(`   Reserve addition (${RESERVE_PERCENTAGE*100}%): ${reserveAddition}€`);
  console.log(`   New reserve total: ${currentReserve}€`);

  // 3. Calculate raw budgets per class
  const rawBudgets: Record<number, number> = {};
  Object.keys(PRIZE_CLASS_CONFIG).forEach(classKey => {
    const classNum = parseInt(classKey);
    const config = PRIZE_CLASS_CONFIG[classNum];
    rawBudgets[classNum] = poolForClasses * (config.percentage / 100);
  });

  // Special handling for Class 1 (Jackpot)
  const jackpotCurrent = jackpotPrev + rawBudgets[1];

  console.log(`🎰 Jackpot calculation:`);
  console.log(`   Raw Class 1 budget: ${rawBudgets[1]}€`);
  console.log(`   Current jackpot total: ${jackpotCurrent}€`);

  // 4. Count winners by class
  const winnerCounts: Record<number, number> = {};
  drawingTickets.forEach(ticket => {
    if (ticket.isWinner && ticket.winningClass) {
      winnerCounts[ticket.winningClass] = (winnerCounts[ticket.winningClass] || 0) + 1;
    }
  });

  console.log(`🏆 Winners by class:`, winnerCounts);

  // 5. Calculate payouts per winner
  const payoutsByClass: Record<number, { totalPayout: number; perWinner: number; winnersCount: number }> = {};
  let totalPayout = 0;
  let reserveUsed = 0;
  let newJackpot = jackpotCurrent;

  // Process classes 2-12 first
  for (let classNum = 2; classNum <= 12; classNum++) {
    const config = PRIZE_CLASS_CONFIG[classNum];
    const winners = winnerCounts[classNum] || 0;
    const rawBudget = rawBudgets[classNum];

    if (winners > 0) {
      const base = rawBudget / winners;
      const target = Math.max(base, config.minPrize);
      const perWinner = config.cap ? Math.min(target, config.cap) : target;
      const needed = perWinner * winners;

      if (needed <= rawBudget) {
        // Normal case: budget sufficient
        payoutsByClass[classNum] = {
          totalPayout: needed,
          perWinner: perWinner,
          winnersCount: winners
        };
        totalPayout += needed;
        const excess = rawBudget - needed;
        currentReserve += excess;

        console.log(`💸 Class ${classNum}: ${winners} winners, ${perWinner}€ each = ${needed}€ total, ${excess}€ excess to reserve`);
      } else if (currentReserve >= (needed - rawBudget)) {
        // Use reserve to cover shortfall
        const shortfall = needed - rawBudget;
        currentReserve -= shortfall;
        reserveUsed += shortfall;

        payoutsByClass[classNum] = {
          totalPayout: needed,
          perWinner: perWinner,
          winnersCount: winners
        };
        totalPayout += needed;

        console.log(`🔄 Class ${classNum}: ${winners} winners, ${perWinner}€ each = ${needed}€ total, used ${shortfall}€ from reserve`);
      } else {
        // Reserve insufficient, pay what we can
        const availablePayout = rawBudget + currentReserve;
        const effectivePerWinner = availablePayout / winners;

        payoutsByClass[classNum] = {
          totalPayout: availablePayout,
          perWinner: effectivePerWinner,
          winnersCount: winners
        };
        totalPayout += availablePayout;
        reserveUsed += currentReserve;
        currentReserve = 0;

        console.log(`⚠️ Class ${classNum}: Insufficient funds! ${winners} winners, ${effectivePerWinner}€ each = ${availablePayout}€ total`);
      }
    } else {
      // No winners, entire budget goes to reserve
      currentReserve += rawBudget;
      console.log(`🔒 Class ${classNum}: No winners, ${rawBudget}€ to reserve`);
    }
  }

  // Process Class 1 (Jackpot)
  const jackpotWinners = winnerCounts[1] || 0;
  if (jackpotWinners > 0) {
    const perJackpotWinner = jackpotCurrent / jackpotWinners;
    payoutsByClass[1] = {
      totalPayout: jackpotCurrent,
      perWinner: perJackpotWinner,
      winnersCount: jackpotWinners
    };
    totalPayout += jackpotCurrent;
    newJackpot = 0; // Reset jackpot
    console.log(`🎰 Class 1 (Jackpot): ${jackpotWinners} winners, ${perJackpotWinner}€ each = ${jackpotCurrent}€ total`);
  } else {
    console.log(`🎰 Class 1 (Jackpot): No winners, jackpot rolls over: ${jackpotCurrent}€`);
  }

  // 6. Apply jackpot cap
  newJackpot = Math.min(newJackpot, JACKPOT_CAP);

  console.log(`📈 FINAL CALCULATIONS:`);
  console.log(`   Total payout: ${totalPayout}€`);
  console.log(`   Reserve used: ${reserveUsed}€`);
  console.log(`   Reserve added: ${reserveAddition}€`);
  console.log(`   New reserve total: ${currentReserve}€`);
  console.log(`   Next jackpot: ${newJackpot}€`);

  return {
    totalPayout,
    payoutsByClass,
    reserveUsed,
    reserveAdded: reserveAddition,
    newReserveFund: currentReserve,
    newJackpot
  };
};

const calculateWinningAmount = (
  winningClass: number,
  jackpotAmount: number,
  winnersInClass: number = 1,
  drawingBeingProcessed?: Drawing
): number => {
  // If we have a drawing context, use the sophisticated calculation
  if (drawingBeingProcessed) {
    const result = calculateSophisticatedPayouts(drawingBeingProcessed);
    const classResult = result.payoutsByClass[winningClass];

    if (classResult) {
      return Math.floor(classResult.perWinner);
    }
  }

  // Fallback: use the prize class configuration
  const config = PRIZE_CLASS_CONFIG[winningClass];
  if (!config) {
    console.warn(`⚠️ No prize class config found for class ${winningClass}`);
    return 0;
  }

  // Special handling for Class 1 (Jackpot)
  if (winningClass === 1) {
    return Math.floor(jackpotAmount / winnersInClass);
  }

  // For other classes, return minimum prize as fallback
  return config.minPrize;
};

// Helper function to calculate actual prize amounts for display (used by API)
export const calculateActualPrizeAmounts = (): Record<number, number> => {
  const prizeAmounts: Record<number, number> = {};

  // First, try to get actual prize amounts from the latest completed drawing
  const latestCompletedDrawing = getLatestCompletedDrawing();

  if (latestCompletedDrawing && latestCompletedDrawing.winnersByClass) {
    // Get actual winning tickets from the latest completed drawing
    const drawingTickets = Array.from(tickets.values()).filter(
      ticket => ticket.drawingId === latestCompletedDrawing.id &&
                !deletedTickets.has(ticket.id) &&
                ticket.isWinner &&
                ticket.winningAmount
    );

    // Group tickets by winning class and get their actual winning amounts
    drawingTickets.forEach(ticket => {
      if (ticket.winningClass && ticket.winningAmount) {
        if (!prizeAmounts[ticket.winningClass]) {
          prizeAmounts[ticket.winningClass] = ticket.winningAmount;
        }
      }
    });

    console.log(`🎯 Using actual prize amounts from drawing ${latestCompletedDrawing.id}:`, prizeAmounts);

    // Fill in any missing classes with minimum prizes
    WINNING_CLASSES.forEach(winClass => {
      if (!prizeAmounts[winClass.class]) {
        prizeAmounts[winClass.class] = winClass.minPrize;
      }
    });
  } else {
    // Fallback: use current jackpot and minimum prizes if no completed drawing
    const currentDrawing = getCurrentDrawing();
    const jackpotAmount = currentDrawing?.jackpotAmount || 1000000;

    WINNING_CLASSES.forEach(winClass => {
      if (winClass.class === 1) {
        // Class 1 gets the full jackpot
        prizeAmounts[winClass.class] = jackpotAmount;
      } else {
        // For other classes, use fixed minimum prizes
        prizeAmounts[winClass.class] = winClass.minPrize;
      }
    });

    console.log(`🎯 Using fallback prize amounts (no completed drawing):`, prizeAmounts);
  }

  return prizeAmounts;
};

// Automatische Auszahlungen nach Ziehung verarbeiten
const processAutomaticPayouts = async (drawing: Drawing): Promise<void> => {
  console.log("��� Starting automatic payouts processing...");

  try {
    // 1. Berechne Gesamteinnahmen aus aktueller Ziehung
    const currentDrawingTickets = Array.from(tickets.values()).filter(
      ticket => ticket.drawingId === drawing.id && !deletedTickets.has(ticket.id)
    );

    const totalRevenue = currentDrawingTickets.length * getTicketPriceUsd();
    const houseShare = Math.floor(totalRevenue * 0.6); // 60% für House-Wallet

    console.log(`📊 Drawing ${drawing.id} stats:`);
    console.log(`   💳 Total tickets: ${currentDrawingTickets.length}`);
    console.log(`   💰 Total revenue: ${totalRevenue}€`);
    console.log(`   🏦 House share (60%): ${houseShare}€`);

    // 2. Sende 60% an House-Wallet (nur wenn Einnahmen vorhanden)
    if (houseShare > 0) {
      try {
        await bitcoinService.sendToHouseWallet(houseShare);
        console.log(`✅ Sent ${houseShare}€ to house wallet (60% of revenue)`);
      } catch (error) {
        console.error(`❌ Failed to send house share: ${error}`);
      }
    }

    // 3. Automatische Gewinn-Auszahlungen an Gewinner-Wallets
    const winningTickets = currentDrawingTickets.filter(ticket =>
      ticket.isWinner &&
      ticket.winningAmount &&
      ticket.winningAmount > 0 &&
      ticket.jackpotApprovalStatus !== 'pending' // Keine Jackpot-Gewinner ohne Freigabe
    );

    console.log(`🏆 Found ${winningTickets.length} winning tickets for automatic payout`);

    for (const ticket of winningTickets) {
      const user = Array.from(users.values()).find(u => u.id === ticket.userId);

      if (user && user.walletAddress && ticket.winningAmount) {
        try {
          // Auszahlung von Payout-Wallet an Gewinner-Wallet
          const bitcoinTx = await bitcoinService.payoutWinner(user.walletAddress, ticket.winningAmount);

          console.log(`💸 Automatic payout initiated:`);
          console.log(`   👤 User: ${user.email}`);
          console.log(`   🎫 Ticket: ${ticket.id.slice(-6)}`);
          console.log(`   💰 Amount: ${ticket.winningAmount}€`);
          console.log(`   🪙 Bitcoin TX: ${bitcoinTx.id}`);
          console.log(`   📡 To wallet: ${user.walletAddress.slice(0, 10)}...${user.walletAddress.slice(-10)}`);

          // Markiere Ticket als ausgezahlt
          ticket.paidOut = true;
          ticket.paidOutAt = new Date().toISOString();
          ticket.bitcoinTxId = bitcoinTx.id;
          tickets.set(ticket.id, ticket);

        } catch (error) {
          console.error(`❌ Failed to payout to ${user.email}: ${error}`);
        }
      } else {
        // Gewinner hat keine Wallet-Adresse - Guthaben bleibt im Account
        console.log(`⚠️ Winner ${user?.email || 'unknown'} has no wallet address - keeping winnings in account balance`);
      }
    }

    // 4. Statistiken für Admin
    const totalWinningsAutoPaid = winningTickets
      .filter(t => t.paidOut)
      .reduce((sum, t) => sum + (t.winningAmount || 0), 0);

    console.log(`📈 Automatic payout summary:`);
    console.log(`   🏦 House revenue sent: ${houseShare}€`);
    console.log(`   🏆 Auto-paid winnings: ${totalWinningsAutoPaid}€`);
    console.log(`   🎫 Tickets auto-paid: ${winningTickets.filter(t => t.paidOut).length}`);

  } catch (error) {
    console.error("❌ Error in automatic payouts processing:", error);
  }
};

export const getAdminStats = () => {
  const currentDrawing = getCurrentDrawing();

  // Only show stats for CURRENT drawing period - filter by drawing ID, not date!
  const currentDrawingTickets = currentDrawing
    ? Array.from(tickets.values()).filter(
        ticket => ticket.drawingId === currentDrawing.id && !deletedTickets.has(ticket.id)
      )
    : [];

  const currentDrawingRevenue = currentDrawingTickets.length * 2; // 2€ per ticket

  // Financial calculations - ONLY for current drawing
  const currentProfit = Math.floor(currentDrawingRevenue * 0.6); // 60% of current revenue

  // Calculate current drawing payouts only
  let currentPayouts = 0;
  currentDrawingTickets.forEach(ticket => {
    if (ticket.isWinner && ticket.winningAmount) {
      // Include payouts for non-jackpot winners (immediate payout)
      if (ticket.winningClass !== 1) {
        currentPayouts += ticket.winningAmount;
      }
      // Include payouts for approved jackpot winners
      else if (ticket.winningClass === 1 && ticket.jackpotApprovalStatus === 'approved') {
        currentPayouts += ticket.winningAmount;
      }
    }
  });

  // Calculate remaining pot balance for current drawing
  const currentPotContribution = Math.floor(currentDrawingRevenue * 0.4); // 40% goes to pot
  const remainingPotBalance = Math.max(0, currentPotContribution - currentPayouts);

  console.log(`📊 CURRENT DRAWING STATS (${currentDrawing?.id}):`);
  console.log(`   🎫 Tickets: ${currentDrawingTickets.length}`);
  console.log(`   💰 Revenue: ${currentDrawingRevenue}€`);
  console.log(`   💸 Payouts: ${currentPayouts}€`);
  console.log(`   �� Pot Balance: ${remainingPotBalance}€`);

  return {
    totalUsers: new Set(currentDrawingTickets.map((t) => t.userId)).size,
    totalTickets: currentDrawingTickets.length,
    totalRevenue: currentDrawingRevenue,
    currentDrawingTickets: currentDrawingTickets.length,
    currentDrawingRevenue,
    currentJackpot: currentDrawing?.jackpotAmount || 0,
    realJackpot: currentDrawing?.realJackpot || 0,
    simulatedJackpot: currentDrawing?.simulatedJackpot || 0,
    pendingDrawing: currentDrawing
      ? currentDrawing.mainNumbers.length === 0
      : false,
    quicktipp1kEnabled,
    // Financial statistics - CURRENT DRAWING ONLY
    totalProfit: currentProfit,
    totalPayouts: currentPayouts,
    remainingPotBalance,
    // Reserve fund information
    reserveFund: reserveFund,
    reservePercentage: RESERVE_PERCENTAGE * 100,
    jackpotCap: JACKPOT_CAP
  };
};

export const getAllTickets = (): LotteryTicket[] => {
  return Array.from(tickets.values());
};

export const getDrawingHistory = (): Drawing[] => {
  return Array.from(drawings.values()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
};

// Global display overrides (affects all pages)
let globalDisplayOverrides: DisplayOverrides = {
  manualTitle: undefined,
  manualDate: "2025-08-16",
  manualTime: "20:00",
  globalOverrides: true,
};

// Check if ticket sales are allowed (stops 1 hour before drawing or manually)
export const isTicketSalesAllowed = (userEmail?: string): { allowed: boolean; message?: string; timeUntilSales?: number; timeUntilDrawing?: number; manuallyBlocked?: boolean; exemptUser?: boolean } => {
  const currentDrawing = getCurrentDrawing();
  if (!currentDrawing) {
    return { allowed: false, message: "Keine aktive Ziehung verfügbar" };
  }

  // Check if user is exempt from sales stop
  const isExemptUser = userEmail && salesStopExemptions.has(userEmail);

  // Check manual sales stop first (but allow exempt users)
  if (manualSalesStopped && !isExemptUser) {
    return {
      allowed: false,
      message: "🛑 Manueller Verkaufsstop aktiviert - Keine Ticket-Verkäufe möglich",
      timeUntilSales: 0,
      timeUntilDrawing: 0,
      manuallyBlocked: true
    };
  }

  // If sales are stopped but user is exempt, allow with special message
  if (manualSalesStopped && isExemptUser) {
    console.log(`⚡ Exempt user ${userEmail} can purchase during sales stop`);
    return {
      allowed: true,
      message: `⚡ Sie haben eine Sonderfreigabe für Ticket-Käufe während Verkaufsstops`,
      exemptUser: true,
      timeUntilDrawing: new Date(currentDrawing.date).getTime() - new Date().getTime()
    };
  }

  const now = new Date();
  const drawingTime = new Date(currentDrawing.date);
  const salesCutoffTime = new Date(drawingTime.getTime() - 60 * 60 * 1000); // 1 hour before drawing

  const timeUntilDrawing = drawingTime.getTime() - now.getTime();
  const timeUntilSales = salesCutoffTime.getTime() - now.getTime();

  // If drawing has already happened
  if (timeUntilDrawing <= 0) {
    return {
      allowed: false,
      message: "Die Ziehung ist bereits erfolgt. Warten Sie auf die nächste Ziehung.",
      timeUntilSales: 0,
      timeUntilDrawing: 0
    };
  }

  // If we're in the last hour before drawing (sales cutoff)
  if (timeUntilSales <= 0) {
    const hoursUntilDrawing = Math.floor(timeUntilDrawing / (1000 * 60 * 60));
    const minutesUntilDrawing = Math.floor((timeUntilDrawing % (1000 * 60 * 60)) / (1000 * 60));

    return {
      allowed: false,
      message: `Verkaufsstopp! Tickets können nicht mehr in der letzten Stunde vor der Ziehung gekauft werden. Ziehung in ${hoursUntilDrawing}h ${minutesUntilDrawing}m.`,
      timeUntilSales: 0,
      timeUntilDrawing
    };
  }

  // Sales are allowed
  return {
    allowed: true,
    timeUntilSales,
    timeUntilDrawing,
    exemptUser: isExemptUser
  };
};

export const updateDisplayOverrides = (overrides: DisplayOverrideRequest): boolean => {
  if (overrides.globalOverrides) {
    // Update global overrides
    globalDisplayOverrides = {
      manualTitle: overrides.title,
      manualDate: overrides.date,
      manualTime: overrides.time,
      globalOverrides: true,
    };
    console.log("🌐 Global display overrides updated:", globalDisplayOverrides);
    return true;
  } else {
    // Legacy: update current drawing
    const currentDrawing = getCurrentDrawing();
    if (currentDrawing) {
      currentDrawing.displayOverrides = {
        manualTitle: overrides.title,
        manualDate: overrides.date,
        manualTime: overrides.time,
      };
      drawings.set(currentDrawing.id, currentDrawing);
      return true;
    }
  }
  return false;
};

export const getGlobalDisplayOverrides = (): DisplayOverrides => {
  return globalDisplayOverrides;
};

export const deleteTicket = (ticketId: string): boolean => {
  const ticket = tickets.get(ticketId);
  if (ticket) {
    // If this was a winning ticket, we need to handle the winnings
    if (ticket.isWinner && ticket.winningAmount) {
      const userAccount = Array.from(users.values()).find(user => user.id === ticket.userId);
      if (userAccount) {
        // For Class 1 (Jackpot) winners with approved status, deduct the winnings
        if (ticket.winningClass === 1 && ticket.jackpotApprovalStatus === 'approved') {
          userAccount.balance -= ticket.winningAmount;
          users.set(userAccount.email, userAccount);
          console.log(`💰 Deducted ${ticket.winningAmount}€ from user ${userAccount.email} due to deleted jackpot ticket`);
        }
        // For other classes (non-jackpot), also deduct if already credited
        else if (ticket.winningClass !== 1) {
          userAccount.balance -= ticket.winningAmount;
          users.set(userAccount.email, userAccount);
          console.log(`💰 Deducted ${ticket.winningAmount}€ from user ${userAccount.email} due to deleted winning ticket`);
        }
      }

      // Find the drawing and remove from prize classes
      const drawing = Array.from(drawings.values()).find(d => d.id === ticket.drawingId);
      if (drawing && ticket.winningClass) {
        console.log(`🏆 Removing winning ticket ${ticketId.slice(-6)} from Class ${ticket.winningClass} statistics`);
      }

      // Mark ticket as deleted first, then recalculate
      tickets.delete(ticketId);
      deletedTickets.add(ticketId);

      if (drawing) {
        recalculateDrawingStatistics(drawing.id);
        console.log(`📊 Recalculated drawing ${drawing.id} statistics after deleting winning ticket - prize classes updated`);
      }
      return true; // Early return to avoid double deletion
    }

    tickets.delete(ticketId);
    deletedTickets.add(ticketId); // Track deleted ticket ID to exclude from future drawings
    console.log(`🗑️ Ticket ${ticketId} deleted by admin - excluded from all calculations`);
    return true;
  }
  return false;
};

export const deleteMultipleTickets = (ticketIds: string[]): number => {
  let deletedCount = 0;
  const affectedDrawings = new Set<string>();

  // First, collect affected drawings and delete tickets
  for (const ticketId of ticketIds) {
    const ticket = tickets.get(ticketId);
    if (ticket) {
      // Find which drawing this ticket belongs to
      const drawing = Array.from(drawings.values()).find(d => d.id === ticket.drawingId);
      if (drawing) {
        affectedDrawings.add(drawing.id);
      }

      if (deleteTicket(ticketId)) {
        deletedCount++;
      }
    }
  }

  // Recalculate statistics for all affected drawings
  affectedDrawings.forEach(drawingId => {
    recalculateDrawingStatistics(drawingId);
  });

  console.log(`🗑️ Deleted ${deletedCount} tickets by admin - recalculated ${affectedDrawings.size} drawing(s)`);
  return deletedCount;
};


export const getQuicktipp1kStatus = (): boolean => {
  return quicktipp1kEnabled;
};

export const toggleQuicktipp1k = (): boolean => {
  quicktipp1kEnabled = !quicktipp1kEnabled;
  return quicktipp1kEnabled;
};

// Recalculate drawing statistics after tickets are deleted
export const recalculateDrawingStatistics = (drawingId: string): void => {
  const drawing = drawings.get(drawingId);
  if (!drawing || drawing.mainNumbers.length === 0) {
    return; // Only recalculate completed drawings
  }

  console.log(`🔄 Recalculating statistics for drawing ${drawingId}`);

  // Get all remaining (non-deleted) tickets for this drawing
  const remainingTickets = Array.from(tickets.values()).filter(
    ticket => ticket.drawingId === drawing.id && !deletedTickets.has(ticket.id)
  );

  // Reset statistics - this completely clears all prize classes
  const winnersByClass: Record<number, number> = {};
  let totalWinningsPayout = 0;

  // Recalculate winners
  remainingTickets.forEach((ticket) => {
    if (ticket.isWinner && ticket.winningClass) {
      winnersByClass[ticket.winningClass] = (winnersByClass[ticket.winningClass] || 0) + 1;

      // Only count towards payout if not a pending jackpot
      if (ticket.winningClass !== 1 || ticket.jackpotApprovalStatus === 'approved') {
        totalWinningsPayout += ticket.winningAmount || 0;
      }
    }
  });

  // Update drawing - this will remove prize classes with no remaining winners
  drawing.winnersByClass = winnersByClass;
  drawing.totalWinningsPayout = totalWinningsPayout;
  drawings.set(drawing.id, drawing);

  console.log(`✅ Drawing ${drawingId} statistics updated: ${Object.keys(winnersByClass).length} winning classes remaining, ${totalWinningsPayout}€ total payout`);

  // Log which classes were removed if any
  if (Object.keys(winnersByClass).length === 0) {
    console.log(`🏆 All prize classes removed from drawing ${drawingId} - no winners remaining`);
  } else {
    console.log(`🏆 Active prize classes for drawing ${drawingId}: ${Object.keys(winnersByClass).join(', ')}`);
  }
};

// Test function to demonstrate intelligent drawing
export const demonstrateIntelligentDrawing = (): void => {
  console.log("🧪 DEMONSTRATING INTELLIGENT DRAWING");
  console.log("=====================================");

  const currentDrawing = getCurrentDrawing();
  if (!currentDrawing) {
    console.log("❌ No current drawing found for demonstration");
    return;
  }

  // Create some test tickets with popular numbers (these should be avoided)
  const popularNumbers = {
    main: [7, 13, 21, 42, 49], // Common "lucky" numbers
    world: [7, 11] // Common "lucky" numbers
  };

  console.log("📝 Creating test tickets with popular numbers:", popularNumbers);

  // Create multiple tickets with the same popular numbers to increase their frequency
  for (let i = 0; i < 5; i++) {
    const testTicket = {
      id: `demo-${Date.now()}-${i}`,
      userId: `demo-user-${i}`,
      mainNumbers: [...popularNumbers.main],
      worldNumbers: [...popularNumbers.world],
      cost: 3,
      drawingDate: currentDrawing.date,
      drawingId: currentDrawing.id,
      isWinner: false,
      createdAt: new Date().toISOString(),
    };
    tickets.set(testTicket.id, testTicket);
  }

  console.log("🎲 Now performing intelligent drawing...");
  console.log("Expected: Should avoid the popular numbers listed above");
  console.log("");
};

// Preview drawing without actually performing it (supports both modes)
export const previewIntelligentDrawing = (useIntelligentMode: boolean = true): {
  success: boolean;
  data?: {
    suggestedNumbers: {
      mainNumbers: number[];
      worldNumbers: number[];
    };
    winnerPreview: {
      totalWinners: number;
      totalPayout: number;
      winnersByClass: Record<number, number>;
      jackpotWinners: number;
    };
    ticketsAnalyzed: number;
    frequencyAnalysis: {
      mostFrequentMain: Array<{ number: number; frequency: number }>;
      leastFrequentMain: Array<{ number: number; frequency: number }>;
      mostFrequentWorld: Array<{ number: number; frequency: number }>;
      leastFrequentWorld: Array<{ number: number; frequency: number }>;
    };
  };
  error?: string;
} => {
  const currentDrawing = getCurrentDrawing();
  if (!currentDrawing) {
    return { success: false, error: "No current drawing found" };
  }

  // Preview is always available for admins to analyze potential draws
  const modeText = useIntelligentMode ? "intelligent" : "random";
  console.log(`🎯 Generating ${modeText} drawing preview for drawing ${currentDrawing.id}`);

  // Get all tickets for this drawing
  const currentDrawingTickets = Array.from(tickets.values()).filter(
    ticket => ticket.drawingId === currentDrawing.id && !deletedTickets.has(ticket.id)
  );

  console.log(`🔍 Preview: Analyzing ${currentDrawingTickets.length} tickets...`);

  let suggestedMainNumbers: number[];
  let suggestedWorldNumbers: number[];

  if (useIntelligentMode && currentDrawingTickets.length > 0) {
    // Analyze number frequencies for intelligent mode
    const mainNumberFrequency = new Map<number, number>();
    const worldNumberFrequency = new Map<number, number>();

    currentDrawingTickets.forEach((ticket) => {
      ticket.mainNumbers.forEach((num) => {
        mainNumberFrequency.set(num, (mainNumberFrequency.get(num) || 0) + 1);
      });
      ticket.worldNumbers.forEach((num) => {
        worldNumberFrequency.set(num, (worldNumberFrequency.get(num) || 0) + 1);
      });
    });

    // Generate suggested numbers using intelligent algorithm
    suggestedMainNumbers = chooseLeastFrequent(1, 50, 5, mainNumberFrequency);
    suggestedWorldNumbers = chooseLeastFrequent(1, 12, 2, worldNumberFrequency);
    console.log(`🧠 Intelligent preview: avoiding popular numbers`);
  } else {
    // Use random numbers (either mode disabled or no tickets available)
    suggestedMainNumbers = generateRandomNumbers(1, 50, 5);
    suggestedWorldNumbers = generateRandomNumbers(1, 12, 2);
    console.log(`🎲 Random preview: realistic lottery numbers`);
  }

  // Calculate what would happen with these numbers
  const winnersByClass: Record<number, number> = {};
  let totalPayout = 0;
  let totalWinners = 0;

  // First pass: count winners by class
  currentDrawingTickets.forEach((ticket) => {
    const mainMatches = ticket.mainNumbers.filter((num) =>
      suggestedMainNumbers.includes(num)
    ).length;
    const worldMatches = ticket.worldNumbers.filter((num) =>
      suggestedWorldNumbers.includes(num)
    ).length;

    const winningClass = determineWinningClass(mainMatches, worldMatches);

    if (winningClass > 0) {
      totalWinners++;
      winnersByClass[winningClass] = (winnersByClass[winningClass] || 0) + 1;
    }
  });

  // Second pass: calculate total payout based on winners per class
  Object.entries(winnersByClass).forEach(([classStr, winnersCount]) => {
    const winningClass = parseInt(classStr);
    const winningAmount = calculateWinningAmount(winningClass, currentDrawing.jackpotAmount, winnersCount, currentDrawing);
    totalPayout += winningAmount * winnersCount;
  });

  // Create frequency analysis for display (only for intelligent mode)
  let frequencyAnalysis;
  if (useIntelligentMode && currentDrawingTickets.length > 0) {
    const mainNumberFrequency = new Map<number, number>();
    const worldNumberFrequency = new Map<number, number>();

    currentDrawingTickets.forEach((ticket) => {
      ticket.mainNumbers.forEach((num) => {
        mainNumberFrequency.set(num, (mainNumberFrequency.get(num) || 0) + 1);
      });
      ticket.worldNumbers.forEach((num) => {
        worldNumberFrequency.set(num, (worldNumberFrequency.get(num) || 0) + 1);
      });
    });

    const sortedMainFreqs = Array.from(mainNumberFrequency.entries())
      .sort((a, b) => b[1] - a[1]);
    const sortedWorldFreqs = Array.from(worldNumberFrequency.entries())
      .sort((a, b) => b[1] - a[1]);

    frequencyAnalysis = {
      mostFrequentMain: sortedMainFreqs.slice(0, 10).map(([number, frequency]) => ({ number, frequency })),
      leastFrequentMain: sortedMainFreqs.slice(-10).map(([number, frequency]) => ({ number, frequency })),
      mostFrequentWorld: sortedWorldFreqs.slice(0, 6).map(([number, frequency]) => ({ number, frequency })),
      leastFrequentWorld: sortedWorldFreqs.slice(-6).map(([number, frequency]) => ({ number, frequency })),
    };
  } else {
    // For random mode, provide empty frequency analysis
    frequencyAnalysis = {
      mostFrequentMain: [],
      leastFrequentMain: [],
      mostFrequentWorld: [],
      leastFrequentWorld: [],
    };
  }

  console.log(`📊 Preview Results: ${totalWinners} winners, ${totalPayout}��� payout`);

  return {
    success: true,
    data: {
      suggestedNumbers: {
        mainNumbers: suggestedMainNumbers,
        worldNumbers: suggestedWorldNumbers,
      },
      winnerPreview: {
        totalWinners,
        totalPayout,
        winnersByClass,
        jackpotWinners: winnersByClass[1] || 0,
      },
      ticketsAnalyzed: currentDrawingTickets.length,
      frequencyAnalysis,
    },
  };
};

const generateRandomNumbers = (min: number, max: number, count: number): number[] => {
  const numbers: number[] = [];
  while (numbers.length < count) {
    const num = Math.floor(Math.random() * (max - min + 1)) + min;
    if (!numbers.includes(num)) {
      numbers.push(num);
    }
  }
  return numbers.sort((a, b) => a - b);
};

export const createMultipleTickets = (
  userId: string,
  mainNumbers: number[],
  worldNumbers: number[],
  quantity: number,
  isQuicktipp: boolean = false
): LotteryTicket[] => {
  const currentDrawing = getCurrentDrawing();
  if (!currentDrawing) {
    throw new Error("No active drawing found");
  }

  const createdTickets: LotteryTicket[] = [];

  for (let i = 0; i < quantity; i++) {
    let ticketMainNumbers: number[];
    let ticketWorldNumbers: number[];

    if (isQuicktipp) {
      // Generate different random numbers for each ticket
      ticketMainNumbers = generateRandomNumbers(1, 50, 5);
      ticketWorldNumbers = generateRandomNumbers(1, 12, 2);
    } else {
      // Use the same numbers for all tickets (manual selection)
      ticketMainNumbers = [...mainNumbers];
      ticketWorldNumbers = [...worldNumbers];
    }

    const ticket: LotteryTicket = {
      id: `ticket-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      mainNumbers: ticketMainNumbers,
      worldNumbers: ticketWorldNumbers,
      cost: 3,
      drawingDate: currentDrawing.date,
      drawingId: currentDrawing.id,
      isWinner: false,
      createdAt: new Date().toISOString(),
    };

    createdTickets.push(ticket);
    tickets.set(ticket.id, ticket);
  }

  return createdTickets;
};

// Jackpot approval functions
export const getPendingJackpotWinners = (): LotteryTicket[] => {
  return Array.from(tickets.values()).filter(
    ticket => ticket.winningClass === 1 && ticket.jackpotApprovalStatus === 'pending'
  );
};

export const approveJackpotWinner = (ticketId: string, adminEmail: string): boolean => {
  const ticket = tickets.get(ticketId);
  if (!ticket || ticket.winningClass !== 1 || ticket.jackpotApprovalStatus !== 'pending') {
    return false;
  }

  // Approve the jackpot
  ticket.jackpotApprovalStatus = 'approved';
  ticket.jackpotApprovalDate = new Date().toISOString();
  ticket.jackpotApprovedBy = adminEmail;

  // Credit the winnings to user balance
  const userAccount = Array.from(users.values()).find(user => user.id === ticket.userId);
  if (userAccount && ticket.winningAmount) {
    userAccount.balance += ticket.winningAmount;
    users.set(userAccount.email, userAccount);
    console.log(`🎰 JACKPOT APPROVED! Credited ${ticket.winningAmount}€ to user ${userAccount.email} (Ticket: ${ticket.id.slice(-6)})`);
  }

  tickets.set(ticket.id, ticket);
  return true;
};

export const rejectJackpotWinner = (ticketId: string, adminEmail: string, reason?: string): boolean => {
  const ticket = tickets.get(ticketId);
  if (!ticket || ticket.winningClass !== 1 || ticket.jackpotApprovalStatus !== 'pending') {
    return false;
  }

  // Reject the jackpot
  ticket.jackpotApprovalStatus = 'rejected';
  ticket.jackpotApprovalDate = new Date().toISOString();
  ticket.jackpotApprovedBy = adminEmail;

  // Reset winner status
  ticket.isWinner = false;
  ticket.winningAmount = 0;

  console.log(`🚫 JACKPOT REJECTED! Ticket ${ticket.id.slice(-6)} by admin ${adminEmail}${reason ? ` - Reason: ${reason}` : ''}`);

  tickets.set(ticket.id, ticket);
  return true;
};

// Manual sales control functions
export const getManualSalesStopStatus = (): boolean => {
  return manualSalesStopped;
};

export const toggleManualSalesStop = (): boolean => {
  manualSalesStopped = !manualSalesStopped;
  console.log(`🛑 ADMIN: Manual sales stop ${manualSalesStopped ? 'ACTIVATED' : 'DEACTIVATED'} - All ticket sales ${manualSalesStopped ? 'BLOCKED' : 'ALLOWED'}`);
  return manualSalesStopped;
};

export const setManualSalesStop = (stopped: boolean): boolean => {
  manualSalesStopped = stopped;
  console.log(`🛑 ADMIN: Manual sales stop ${manualSalesStopped ? 'ACTIVATED' : 'DEACTIVATED'} - All ticket sales ${manualSalesStopped ? 'BLOCKED' : 'ALLOWED'}`);
  return manualSalesStopped;
};

// Sales stop exemption management
export const addSalesStopExemption = (email: string): boolean => {
  salesStopExemptions.add(email);
  console.log(`⚡ Added sales stop exemption for: ${email}`);
  return true;
};

export const removeSalesStopExemption = (email: string): boolean => {
  if (email === 'Admin@world.com') {
    console.log(`⚠️ Cannot remove exemption for Admin@world.com - permanent exemption`);
    return false;
  }
  const removed = salesStopExemptions.delete(email);
  if (removed) {
    console.log(`🚫 Removed sales stop exemption for: ${email}`);
  }
  return removed;
};

export const getSalesStopExemptions = (): string[] => {
  return Array.from(salesStopExemptions);
};

export const isSalesStopExempt = (email: string): boolean => {
  return salesStopExemptions.has(email);
};

// Reserve fund management functions
export const getReserveFund = (): number => {
  return reserveFund;
};

export const setReserveFund = (amount: number): boolean => {
  if (amount < 0) {
    console.log(`⚠️ Cannot set negative reserve fund: ${amount}€`);
    return false;
  }

  const previousAmount = reserveFund;
  reserveFund = amount;
  console.log(`🏦 Reserve fund updated: ${previousAmount}€ → ${amount}€`);
  return true;
};

export const addToReserveFund = (amount: number): boolean => {
  if (amount <= 0) {
    console.log(`⚠️ Cannot add non-positive amount to reserve: ${amount}€`);
    return false;
  }

  const previousAmount = reserveFund;
  reserveFund += amount;
  console.log(`🏦 Added ${amount}€ to reserve fund: ${previousAmount}€ → ${reserveFund}€`);
  return true;
};

export const getReserveStats = () => {
  return {
    currentReserve: reserveFund,
    reservePercentage: RESERVE_PERCENTAGE * 100,
    jackpotCap: JACKPOT_CAP,
    prizeClassConfig: PRIZE_CLASS_CONFIG
  };
};

// Enhanced stats function with reserve information
export const getEnhancedAdminStats = () => {
  const basicStats = getAdminStats();
  const reserveStats = getReserveStats();

  return {
    ...basicStats,
    reserveFund: reserveStats.currentReserve,
    reservePercentage: reserveStats.reservePercentage,
    jackpotCap: reserveStats.jackpotCap,
    sophisticatedPayoutEnabled: true
  };
};

// Test function for sophisticated payout calculation
export const testSophisticatedPayouts = (drawingId?: string): PayoutCalculationResult | null => {
  const drawing = drawingId ? drawings.get(drawingId) : getCurrentDrawing();
  if (!drawing) {
    console.log("❌ No drawing found for sophisticated payout test");
    return null;
  }

  console.log("🧪 Testing sophisticated payout calculation...");
  const result = calculateSophisticatedPayouts(drawing);

  console.log("✅ Test completed - see detailed logs above");
  return result;
};
