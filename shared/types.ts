// User and Authentication Types
export interface User {
  id: string;
  email: string;
  isAdmin: boolean;
  canDelegateAdmin?: boolean; // Only super admin (Admin@world.com) can delegate
  walletAddress?: string;
  balance: number;
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  sessionToken?: string;
  error?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface AdminDelegationRequest {
  email: string;
}

// Lottery Ticket Types
export interface LotteryTicket {
  id: string;
  userId: string;
  mainNumbers: number[]; // 5 numbers from 1-50
  worldNumbers: number[]; // 2 numbers from 1-12
  cost: number; // Always 2€
  drawingDate: string;
  drawingId: string; // Specific drawing ID this ticket belongs to
  isWinner: boolean;
  winningClass?: number; // 1-12 (1 = Jackpot)
  winningAmount?: number;
  createdAt: string;
  jackpotApprovalStatus?: 'pending' | 'approved' | 'rejected'; // For class 1 winners
  jackpotApprovalDate?: string;
  jackpotApprovedBy?: string; // Admin who approved/rejected
  paidOut?: boolean; // Whether winnings have been automatically paid out
  paidOutAt?: string; // When the automatic payout occurred
  bitcoinTxId?: string; // Bitcoin transaction ID for the payout
}

export interface TicketPurchaseRequest {
  tickets: Array<{
    mainNumbers: number[];
    worldNumbers: number[];
  }>;
  quantity?: number;
  couponCode?: string;
  isQuicktipp?: boolean;
}

// Drawing Types
export interface Drawing {
  id: string;
  date: string;
  mainNumbers: number[];
  worldNumbers: number[];
  jackpotAmount: number;
  realJackpot: number; // Based on 40% of ticket sales
  simulatedJackpot: number; // Fake jackpot that admin can control
  isActive: boolean;
  winnersByClass: Record<number, number>; // Class -> Number of winners
  displayOverrides?: DisplayOverrides; // Manual title and date/time overrides
  totalWinningsPayout?: number; // Total amount paid out to winners
  nextJackpotAmount?: number; // Calculated jackpot for next drawing (sophisticated payout system)
}

export interface DrawingRequest {
  manualNumbers?: {
    mainNumbers: number[];
    worldNumbers: number[];
  };
  intelligentDrawing?: boolean;
}

// Admin Types
export interface AdminStats {
  totalUsers: number;
  totalTickets: number;
  totalRevenue: number;
  currentDrawingTickets: number;
  currentDrawingRevenue: number;
  currentJackpot: number;
  realJackpot: number;
  simulatedJackpot: number;
  pendingDrawing: boolean;
  quicktipp10kEnabled: boolean;
  quicktipp5kEnabled: boolean;
  quicktipp1kEnabled: boolean;
  // Financial statistics
  totalProfit: number; // 60% of total revenue
  totalPayouts: number; // Total amount paid out to winners
  remainingPotBalance: number; // Amount remaining in pot after payouts
}

export interface JackpotUpdateRequest {
  newAmount: number;
  isSimulated: boolean;
}

export interface JackpotApprovalRequest {
  ticketId: string;
  approved: boolean; // true = approve, false = reject
  reason?: string; // optional reason for rejection
}

// Manual Display Overrides
export interface DisplayOverrides {
  manualTitle?: string;
  manualDate?: string;
  manualTime?: string;
  globalOverrides?: boolean; // If true, applies to all pages
}

export interface DisplayOverrideRequest {
  title?: string;
  date?: string;
  time?: string;
  globalOverrides?: boolean;
}

// Winning Classes (like Eurojackpot)
export interface WinningClass {
  class: number;
  requirement: string;
  odds: string;
  minPrize: number;
  jackpotPercentage: number; // Percentage of jackpot for dynamic payouts
}

export const WINNING_CLASSES: WinningClass[] = [
  {
    class: 1,
    requirement: "5 + 2",
    odds: "1 : 139,838,160",
    minPrize: 10000000,
    jackpotPercentage: 36.00 // 36% of total prize pool
  },
  {
    class: 2,
    requirement: "5 + 1",
    odds: "1 : 6,991,908",
    minPrize: 100000,
    jackpotPercentage: 8.60 // 8.60% of total prize pool
  },
  {
    class: 3,
    requirement: "5 + 0",
    odds: "1 : 3,107,515",
    minPrize: 50000,
    jackpotPercentage: 4.85 // 4.85% of total prize pool
  },
  {
    class: 4,
    requirement: "4 + 2",
    odds: "1 : 621,503",
    minPrize: 5000,
    jackpotPercentage: 0.80 // 0.80% of total prize pool
  },
  {
    class: 5,
    requirement: "4 + 1",
    odds: "1 : 31,075",
    minPrize: 300,
    jackpotPercentage: 1.00 // 1.00% of total prize pool
  },
  {
    class: 6,
    requirement: "3 + 2",
    odds: "1 : 14,125",
    minPrize: 200,
    jackpotPercentage: 1.10 // 1.10% of total prize pool
  },
  {
    class: 7,
    requirement: "4 + 0",
    odds: "1 : 13,811",
    minPrize: 100,
    jackpotPercentage: 0.80 // 0.80% of total prize pool
  },
  {
    class: 8,
    requirement: "2 + 2",
    odds: "1 : 985",
    minPrize: 25,
    jackpotPercentage: 2.55 // 2.55% of total prize pool
  },
  {
    class: 9,
    requirement: "3 + 1",
    odds: "1 : 706",
    minPrize: 20,
    jackpotPercentage: 2.85 // 2.85% of total prize pool
  },
  {
    class: 10,
    requirement: "3 + 0",
    odds: "1 : 314",
    minPrize: 15,
    jackpotPercentage: 5.40 // 5.40% of total prize pool
  },
  {
    class: 11,
    requirement: "1 + 2",
    odds: "1 : 188",
    minPrize: 10,
    jackpotPercentage: 6.75 // 6.75% of total prize pool
  },
  {
    class: 12,
    requirement: "2 + 1",
    odds: "1 : 49",
    minPrize: 8,
    jackpotPercentage: 20.30 // 20.30% of total prize pool
  },
];

// Coupon Types
export interface Coupon {
  id: string;
  code: string;
  discountPercent: number; // 5-100
  minTickets?: number; // minimum tickets required
  maxTickets?: number; // maximum tickets this applies to
  usageLimit: number; // how many times it can be used
  usedCount: number;
  isActive: boolean;
  createdAt: string;
  expiresAt?: string;
}

export interface CouponCreateRequest {
  discountPercent: number;
  minTickets?: number;
  maxTickets?: number;
  usageLimit: number;
  expiresAt?: string;
}

export interface CouponValidationResponse {
  isValid: boolean;
  discount: number;
  message?: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
