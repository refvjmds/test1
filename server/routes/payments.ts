import { RequestHandler } from "express";
import { ApiResponse } from "@shared/types";
import { paymentService, PAYMENT_METHODS } from "../services/PaymentService";
import { bitcoinService } from "../services/BitcoinService";

// Verfügbare Zahlungsmethoden abrufen
export const getPaymentMethods: RequestHandler = (req, res) => {
  try {
    const methods = paymentService.getPaymentMethods();
    
    const response: ApiResponse<typeof methods> = {
      success: true,
      data: methods
    };
    
    res.json(response);
  } catch (error) {
    console.error("Error fetching payment methods:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch payment methods"
    });
  }
};

// Einzahlung initiieren
export const initiateDeposit: RequestHandler = async (req, res) => {
  try {
    const { methodId, amount, details } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required"
      });
    }

    if (!methodId || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid deposit parameters"
      });
    }

    const transaction = await paymentService.initiateDeposit(
      userId,
      methodId,
      parseFloat(amount),
      details || {}
    );

    const response: ApiResponse<typeof transaction> = {
      success: true,
      data: transaction
    };

    res.json(response);
  } catch (error) {
    console.error("Error initiating deposit:", error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to initiate deposit"
    });
  }
};

// Auszahlung initiieren
export const initiateWithdrawal: RequestHandler = async (req, res) => {
  try {
    const { methodId, amount, details } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required"
      });
    }

    if (!methodId || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid withdrawal parameters"
      });
    }

    const transaction = await paymentService.initiateWithdrawal(
      userId,
      methodId,
      parseFloat(amount),
      details || {}
    );

    const response: ApiResponse<typeof transaction> = {
      success: true,
      data: transaction
    };

    res.json(response);
  } catch (error) {
    console.error("Error initiating withdrawal:", error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to initiate withdrawal"
    });
  }
};

// Transaktions-Status abrufen
export const getTransactionStatus: RequestHandler = (req, res) => {
  try {
    const { transactionId } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required"
      });
    }

    const transaction = paymentService.getTransaction(transactionId);
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: "Transaction not found"
      });
    }

    // Nur eigene Transaktionen oder Admin-Zugriff
    if (transaction.userId !== userId && !(req as any).user?.isAdmin) {
      return res.status(403).json({
        success: false,
        error: "Access denied"
      });
    }

    const response: ApiResponse<typeof transaction> = {
      success: true,
      data: transaction
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching transaction:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch transaction"
    });
  }
};

// Benutzer-Transaktionen abrufen
export const getUserTransactions: RequestHandler = (req, res) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required"
      });
    }

    const transactions = paymentService.getUserTransactions(userId);

    const response: ApiResponse<typeof transactions> = {
      success: true,
      data: transactions
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching user transactions:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch transactions"
    });
  }
};

// Alle Transaktionen abrufen (Admin only)
export const getAllTransactions: RequestHandler = (req, res) => {
  try {
    const isAdmin = (req as any).user?.isAdmin;

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: "Admin access required"
      });
    }

    const transactions = paymentService.getAllTransactions();

    const response: ApiResponse<typeof transactions> = {
      success: true,
      data: transactions
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching all transactions:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch transactions"
    });
  }
};

// Bitcoin-Service Status (Admin only)
export const getBitcoinStatus: RequestHandler = async (req, res) => {
  try {
    const isAdmin = (req as any).user?.isAdmin;

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: "Admin access required"
      });
    }

    const [serviceStatus, houseBalance, payoutBalance, btcPrice] = await Promise.all([
      bitcoinService.getServiceStatus(),
      bitcoinService.getHouseWalletBalance(),
      bitcoinService.getPayoutWalletBalance(),
      bitcoinService.getBitcoinPrice()
    ]);

    const status = {
      service: serviceStatus,
      houseWallet: houseBalance,
      payoutWallet: payoutBalance,
      btcPrice,
      pendingTransactions: bitcoinService.getPendingTransactions(),
      confirmedTransactions: bitcoinService.getConfirmedTransactions()
    };

    const response: ApiResponse<typeof status> = {
      success: true,
      data: status
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching Bitcoin status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch Bitcoin status"
    });
  }
};

// Bitcoin-Preis abrufen
export const getBitcoinPrice: RequestHandler = async (req, res) => {
  try {
    const price = await bitcoinService.getBitcoinPrice();

    const response: ApiResponse<{ price: number; currency: string }> = {
      success: true,
      data: {
        price,
        currency: 'USD'
      }
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching Bitcoin price:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch Bitcoin price"
    });
  }
};

// Wallet-Adresse validieren
export const validateWalletAddress: RequestHandler = (req, res) => {
  try {
    const { address, type } = req.body;

    if (!address) {
      return res.status(400).json({
        success: false,
        error: "Address is required"
      });
    }

    let isValid = false;

    switch (type) {
      case 'bitcoin':
        isValid = bitcoinService.validateBitcoinAddress(address);
        break;
      case 'ethereum':
      case 'usdt':
      case 'usdc':
        // Ethereum-Adresse validieren (vereinfacht)
        isValid = /^0x[a-fA-F0-9]{40}$/.test(address);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: "Unsupported wallet type"
        });
    }

    const response: ApiResponse<{ valid: boolean; type: string }> = {
      success: true,
      data: {
        valid: isValid,
        type
      }
    };

    res.json(response);
  } catch (error) {
    console.error("Error validating wallet address:", error);
    res.status(500).json({
      success: false,
      error: "Failed to validate wallet address"
    });
  }
};
