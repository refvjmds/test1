import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { handleDemo } from "./routes/demo";
import { autoDrawingService } from "./services/AutoDrawingService";
import {
  demoJackpotUpdate,
  demoDrawing,
  demoStats,
  demoTickets,
  getCurrentDrawingDemo,
  demoPurchaseTickets,
} from "./routes/demo-admin";

// Authentication routes
import {
  login,
  register,
  me,
  logout,
  connectWallet,
  requireAuth,
  requireAdmin,
  optionalAuth,
} from "./routes/simple-auth";

// Lottery routes
import {
  getCurrentDrawingRoute,
  purchaseTickets,
  getMyTickets,
  performDrawing,
  updateJackpot,
  getAdminStatsRoute,
  getAllTicketsRoute,
  getDrawingHistoryRoute,
  getCurrentDrawingTickets,
  getLatestCompletedDrawingRoute,
  getQuicktippStatusRoute,
  toggleQuicktipp1kRoute,
  deleteTicketRoute,
  deleteMultipleTicketsRoute,
  getPendingJackpotWinnersRoute,
  approveJackpotWinnerRoute,
  demonstrateIntelligentDrawingRoute,
  getTicketSalesStatusRoute,
  previewIntelligentDrawingRoute,
  getManualSalesStopStatusRoute,
  toggleManualSalesStopRoute,
  getSalesStopExemptionsRoute,
  addSalesStopExemptionRoute,
  removeSalesStopExemptionRoute,
  getCurrentPrizeAmountsRoute,
  getReserveFundRoute,
  setReserveFundRoute,
  addToReserveFundRoute,
  getReserveStatsRoute,
  getEnhancedAdminStatsRoute,
  testSophisticatedPayoutsRoute,
  getActualWinningAmountsRoute,
} from "./routes/lottery";

// Coupon routes
import {
  validateCouponRoute,
  useCouponRoute,
  createCouponRoute,
  getAllCouponsRoute,
  deleteCouponRoute,
  toggleCouponStatusRoute,
} from "./routes/coupons";

// Auto-drawing routes
import {
  getAutoDrawingStatus,
  setAutoDrawingEnabled,
  triggerManualDrawing,
  setManualOverrides,
  getManualOverrides,
} from "./routes/auto-drawing";

// Display override routes
import {
  handleUpdateDisplayOverrides,
  handleGetDisplayOverrides,
} from "./routes/display-overrides";

// Admin delegation routes
import adminDelegationRoutes from "./routes/admin-delegation";

// Payment routes
import {
  getPaymentMethods,
  initiateDeposit,
  initiateWithdrawal,
  getTransactionStatus,
  getUserTransactions,
  getAllTransactions,
  getBitcoinStatus,
  getBitcoinPrice,
  validateWalletAddress
} from "./routes/payments";

// Geoblocking routes
import {
  getGeoblockingStatus,
  updateCountryBlocking,
  bulkUpdateCountries,
  getUserCountry,
  checkGeoblocking
} from "./routes/geoblocking";
import { geoblockingPageMiddleware } from "./routes/geoblocking-middleware";
import { getCryptoConfig, purchaseTicketsEth, getEthUsdPrice } from "./routes/eth";
import { sweepFundsToPayout } from "./routes/usdc";
import { getTicketPriceUsd, setTicketPriceUsd } from "./utils/pricing";

export function createServer() {
  const app = express();

  // Middleware
  app.use(
    cors({
      credentials: true,
      origin: function (origin, callback) {
        // Allow any origin in development/demo
        callback(null, true);
      },
    }),
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Add geoblocking middleware for page access (before routes)
  app.use(geoblockingPageMiddleware);

  // Health check endpoint
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "WorldJackpot Server Online";
    res.json({ message: ping });
  });

  // Demo endpoint (keep for testing)
  app.get("/api/demo", handleDemo);

  // Authentication routes
  app.post("/api/auth/login", login);
  app.post("/api/auth/register", register);
  app.get("/api/auth/me", me);
  app.post("/api/auth/logout", logout);
  app.post("/api/auth/connect-wallet", requireAuth, connectWallet);

  // Public lottery routes
  app.get("/api/lottery/current-drawing", getCurrentDrawingRoute);
  app.get("/api/lottery/latest-completed-drawing", getLatestCompletedDrawingRoute);
  app.get("/api/lottery/drawing-history", getDrawingHistoryRoute);
  app.get("/api/lottery/current-drawing-tickets", requireAuth, getCurrentDrawingTickets);
  app.get("/api/lottery/quicktipp-status", getQuicktippStatusRoute);
  app.get("/api/lottery/sales-status", optionalAuth, getTicketSalesStatusRoute);
  app.get("/api/lottery/current-prize-amounts", getCurrentPrizeAmountsRoute);
  app.get("/api/lottery/actual-winning-amounts", getActualWinningAmountsRoute);

  // Protected lottery routes
  app.post("/api/lottery/purchase-tickets", requireAuth, purchaseTickets);
  app.get("/api/lottery/my-tickets", requireAuth, getMyTickets);

  // Admin-only lottery routes
  app.post(
    "/api/lottery/perform-drawing",
    requireAuth,
    requireAdmin,
    performDrawing,
  );
  app.post(
    "/api/lottery/update-jackpot",
    requireAuth,
    requireAdmin,
    updateJackpot,
  );
  app.get("/api/lottery/admin-stats", requireAuth, requireAdmin, getAdminStatsRoute);
  app.get("/api/lottery/all-tickets", requireAuth, requireAdmin, getAllTicketsRoute);
  app.post("/api/lottery/toggle-quicktipp-1k", requireAuth, requireAdmin, toggleQuicktipp1kRoute);
  app.delete("/api/lottery/tickets/:ticketId", requireAuth, requireAdmin, deleteTicketRoute);
  app.post("/api/lottery/tickets/delete-multiple", requireAuth, requireAdmin, deleteMultipleTicketsRoute);
  app.get("/api/lottery/pending-jackpot-winners", requireAuth, requireAdmin, getPendingJackpotWinnersRoute);
  app.post("/api/lottery/approve-jackpot-winner", requireAuth, requireAdmin, approveJackpotWinnerRoute);
  app.post("/api/lottery/demo-intelligent-drawing", requireAuth, requireAdmin, demonstrateIntelligentDrawingRoute);
  app.get("/api/lottery/preview-intelligent-drawing", requireAuth, requireAdmin, previewIntelligentDrawingRoute);
  app.get("/api/lottery/manual-sales-stop-status", requireAuth, requireAdmin, getManualSalesStopStatusRoute);
  app.post("/api/lottery/toggle-manual-sales-stop", requireAuth, requireAdmin, toggleManualSalesStopRoute);
  app.get("/api/lottery/sales-exemptions", requireAuth, requireAdmin, getSalesStopExemptionsRoute);
  app.post("/api/lottery/sales-exemptions/add", requireAuth, requireAdmin, addSalesStopExemptionRoute);
  app.post("/api/lottery/sales-exemptions/remove", requireAuth, requireAdmin, removeSalesStopExemptionRoute);

  // Sophisticated payout system routes
  app.get("/api/lottery/reserve-fund", requireAuth, requireAdmin, getReserveFundRoute);
  app.post("/api/lottery/reserve-fund/set", requireAuth, requireAdmin, setReserveFundRoute);
  app.post("/api/lottery/reserve-fund/add", requireAuth, requireAdmin, addToReserveFundRoute);
  app.get("/api/lottery/reserve-stats", requireAuth, requireAdmin, getReserveStatsRoute);
  app.get("/api/lottery/enhanced-admin-stats", requireAuth, requireAdmin, getEnhancedAdminStatsRoute);
  app.get("/api/lottery/test-sophisticated-payouts/:drawingId?", requireAuth, requireAdmin, testSophisticatedPayoutsRoute);

  // Demo admin routes (now using real auth system)
  app.post("/api/demo/update-jackpot", requireAuth, requireAdmin, updateJackpot);
  app.post("/api/demo/perform-drawing", requireAuth, requireAdmin, performDrawing);
  app.get("/api/demo/admin-stats", requireAuth, requireAdmin, getAdminStatsRoute);
  app.get("/api/demo/all-tickets", requireAuth, requireAdmin, getAllTicketsRoute);

  // Auto-drawing routes
  app.get("/api/auto-drawing/status", getAutoDrawingStatus);
  app.post("/api/auto-drawing/toggle", requireAuth, requireAdmin, setAutoDrawingEnabled);
  app.post("/api/auto-drawing/manual-trigger", requireAuth, requireAdmin, triggerManualDrawing);
  app.post("/api/auto-drawing/manual-overrides", requireAuth, requireAdmin, setManualOverrides);
  app.get("/api/auto-drawing/manual-overrides", getManualOverrides);

  // Display override routes
  app.post("/api/display-overrides/update", requireAuth, requireAdmin, handleUpdateDisplayOverrides);
  app.get("/api/display-overrides", handleGetDisplayOverrides);

  // Coupon routes
  app.post("/api/coupons/validate", validateCouponRoute);
  app.post("/api/coupons/use", useCouponRoute);
  app.post("/api/coupons/create", requireAuth, requireAdmin, createCouponRoute);
  app.get("/api/coupons/all", requireAuth, requireAdmin, getAllCouponsRoute);
  app.delete("/api/coupons/:code", requireAuth, requireAdmin, deleteCouponRoute);
  app.post("/api/coupons/:code/toggle", requireAuth, requireAdmin, toggleCouponStatusRoute);

  // Payment routes (legacy)
  app.get("/api/payments/methods", getPaymentMethods);
  app.post("/api/payments/deposit", requireAuth, initiateDeposit);
  app.post("/api/payments/withdraw", requireAuth, initiateWithdrawal);
  app.get("/api/payments/transaction/:transactionId", requireAuth, getTransactionStatus);
  app.get("/api/payments/user/transactions", requireAuth, getUserTransactions);
  app.get("/api/payments/admin/transactions", requireAuth, requireAdmin, getAllTransactions);
  app.get("/api/payments/bitcoin/status", requireAuth, requireAdmin, getBitcoinStatus);
  app.get("/api/payments/bitcoin/price", getBitcoinPrice);
  app.post("/api/payments/validate-address", validateWalletAddress);

  // MetaMask ETH flow (Optimism)
  app.get("/api/crypto/config", getCryptoConfig);
  app.get("/api/lottery/price", (_req, res) => {
    try { res.json({ success: true, data: { price: getTicketPriceUsd() } }); } catch { res.json({ success: false, error: 'Failed to load price' }); }
  });
  app.post("/api/lottery/price", requireAuth, requireAdmin, (req, res) => {
    try {
      const p = Number(req.body?.price);
      if (!Number.isFinite(p) || p < 0) return res.json({ success: false, error: 'Invalid price' });
      setTicketPriceUsd(p);
      res.json({ success: true, data: { price: getTicketPriceUsd() } });
    } catch (e) {
      res.json({ success: false, error: 'Failed to set price' });
    }
  });
  app.get("/api/crypto/eth-usd", getEthUsdPrice);
  app.post("/api/lottery/purchase-tickets-eth", requireAuth, purchaseTicketsEth);
  app.post("/api/crypto/sweep-to-payout", requireAuth, requireAdmin, sweepFundsToPayout);

  // Admin delegation routes (super admin only)
  app.use("/api/admin-delegation", requireAuth, adminDelegationRoutes);

  // Geoblocking API routes (Admin only)
  app.get("/api/geoblocking/status", requireAuth, requireAdmin, getGeoblockingStatus);
  app.post("/api/geoblocking/update", requireAuth, requireAdmin, updateCountryBlocking);
  app.post("/api/geoblocking/bulk-update", requireAuth, requireAdmin, bulkUpdateCountries);
  app.get("/api/geoblocking/user-country", getUserCountry);

  console.log(`🚀 WorldJackpot Server initialized`);
  console.log(`📊 Admin account: Admin@world.com / Admin25!`);
  console.log(`👩 Lara account: Lara@world.com / Lara123`);
  console.log(
    `🧪 Test accounts: Test1@world.com to Test10@world.com / Test2025`,
  );

  return app;
}
