import { bitcoinService, BitcoinTransaction } from './BitcoinService';
import { users } from '../routes/simple-auth';
import { ethService } from './EthService';

export interface PaymentMethod {
  id: string;
  type: 'fiat' | 'crypto';
  name: string;
  icon: string;
  minAmount: number;
  maxAmount: number;
  fees: {
    fixed: number; // Feste Gebühr in EUR
    percentage: number; // Prozentuale Gebühr
  };
  processingTime: string;
  enabled: boolean;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'deposit' | 'withdrawal';
  method: PaymentMethod;
  amount: number; // EUR
  amountReceived?: number; // EUR nach Gebühren
  fees: number; // EUR
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  createdAt: Date;
  completedAt?: Date;
  externalId?: string; // ID von externem Zahlungsanbieter
  bitcoinTx?: BitcoinTransaction;
  details: Record<string, any>;
}

// Verfügbare Zahlungsmethoden
export const PAYMENT_METHODS: PaymentMethod[] = [
  // Fiat-Einzahlungen
  {
    id: 'bank_transfer',
    type: 'fiat',
    name: 'Bank Transfer (SEPA)',
    icon: '🏦',
    minAmount: 10,
    maxAmount: 10000,
    fees: { fixed: 0, percentage: 0 },
    processingTime: '1-3 business days',
    enabled: true
  },
  {
    id: 'paypal',
    type: 'fiat',
    name: 'PayPal',
    icon: 'https://www.paypalobjects.com/webstatic/icon/pp196.png',
    minAmount: 5,
    maxAmount: 5000,
    fees: { fixed: 0.35, percentage: 2.9 },
    processingTime: 'Instant',
    enabled: true
  },
  {
    id: 'credit_card',
    type: 'fiat',
    name: 'Credit/Debit Card',
    icon: '💳',
    minAmount: 5,
    maxAmount: 2000,
    fees: { fixed: 0.30, percentage: 2.9 },
    processingTime: 'Instant',
    enabled: true
  },
  // Krypto-Einzahlungen
  {
    id: 'bitcoin',
    type: 'crypto',
    name: 'Bitcoin (BTC)',
    icon: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
    minAmount: 10,
    maxAmount: 50000,
    fees: { fixed: 0, percentage: 1 },
    processingTime: '10-60 minutes',
    enabled: true
  },
  {
    id: 'ethereum',
    type: 'crypto',
    name: 'Ethereum (ETH)',
    icon: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
    minAmount: 10,
    maxAmount: 50000,
    fees: { fixed: 0, percentage: 1 },
    processingTime: '2-10 minutes',
    enabled: true
  },
  {
    id: 'usdt',
    type: 'crypto',
    name: 'Tether (USDT)',
    icon: 'https://assets.coingecko.com/coins/images/325/large/Tether.png',
    minAmount: 10,
    maxAmount: 50000,
    fees: { fixed: 0, percentage: 0.5 },
    processingTime: '2-10 minutes',
    enabled: true
  },
  {
    id: 'usdc',
    type: 'crypto',
    name: 'USD Coin (USDC)',
    icon: 'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png',
    minAmount: 10,
    maxAmount: 50000,
    fees: { fixed: 0, percentage: 0.5 },
    processingTime: '2-10 minutes',
    enabled: true
  },
  {
    id: 'litecoin',
    type: 'crypto',
    name: 'Litecoin (LTC)',
    icon: 'https://assets.coingecko.com/coins/images/2/large/litecoin.png',
    minAmount: 10,
    maxAmount: 50000,
    fees: { fixed: 0, percentage: 1 },
    processingTime: '5-30 minutes',
    enabled: true
  },
  {
    id: 'binancecoin',
    type: 'crypto',
    name: 'BNB (BNB)',
    icon: 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png',
    minAmount: 10,
    maxAmount: 50000,
    fees: { fixed: 0, percentage: 0.5 },
    processingTime: '2-10 minutes',
    enabled: true
  }
];

class PaymentService {
  private transactions: Map<string, Transaction> = new Map();
  private depositAddresses: Map<string, string> = new Map(); // userId -> deposit address

  constructor() {
    console.log('💳 Payment Service initialized');
    // In production: Verbindung zu echten Zahlungsanbietern initialisieren
  }

  // Einzahlung initiieren
  async initiateDeposit(
    userId: string, 
    methodId: string, 
    amount: number, 
    details: Record<string, any> = {}
  ): Promise<Transaction> {
    const method = PAYMENT_METHODS.find(m => m.id === methodId);
    if (!method) {
      throw new Error('Payment method not found');
    }

    if (!method.enabled) {
      throw new Error('Payment method is currently disabled');
    }

    if (amount < method.minAmount || amount > method.maxAmount) {
      throw new Error(`Amount must be between ${method.minAmount} and ${method.maxAmount} EUR`);
    }

    const fees = this.calculateFees(amount, method);
    const amountReceived = amount - fees;

    const transaction: Transaction = {
      id: this.generateTransactionId(),
      userId,
      type: 'deposit',
      method,
      amount,
      amountReceived,
      fees,
      status: 'pending',
      createdAt: new Date(),
      details
    };

    this.transactions.set(transaction.id, transaction);

    console.log(`💰 Deposit initiated:`, {
      id: transaction.id,
      userId,
      method: method.name,
      amount: `${amount} EUR`,
      fees: `${fees} EUR`
    });

    // Spezifische Verarbeitung je nach Zahlungsmethode
    await this.processDeposit(transaction);

    return transaction;
  }

  // Auszahlung initiieren
  async initiateWithdrawal(
    userId: string, 
    methodId: string, 
    amount: number, 
    details: Record<string, any> = {}
  ): Promise<Transaction> {
    const user = users.find(u => u.id === userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.balance < amount) {
      throw new Error('Insufficient balance');
    }

    const method = PAYMENT_METHODS.find(m => m.id === methodId);
    if (!method) {
      throw new Error('Payment method not found');
    }

    const fees = this.calculateFees(amount, method);
    const amountReceived = amount - fees;

    const transaction: Transaction = {
      id: this.generateTransactionId(),
      userId,
      type: 'withdrawal',
      method,
      amount,
      amountReceived,
      fees,
      status: 'pending',
      createdAt: new Date(),
      details
    };

    this.transactions.set(transaction.id, transaction);

    // Guthaben sofort reduzieren (wird bei Fehler zurückgebucht)
    user.balance -= amount;

    console.log(`💸 Withdrawal initiated:`, {
      id: transaction.id,
      userId,
      method: method.name,
      amount: `${amount} EUR`,
      fees: `${fees} EUR`
    });

    // Auszahlung verarbeiten
    await this.processWithdrawal(transaction);

    return transaction;
  }

  // Einzahlung verarbeiten
  private async processDeposit(transaction: Transaction): Promise<void> {
    transaction.status = 'processing';

    try {
      switch (transaction.method.id) {
        case 'bitcoin':
        case 'ethereum':
        case 'usdt':
        case 'usdc':
        case 'litecoin':
        case 'binancecoin':
          await this.processCryptoDeposit(transaction);
          break;
        case 'paypal':
          await this.processPayPalDeposit(transaction);
          break;
        case 'credit_card':
          await this.processCreditCardDeposit(transaction);
          break;
        case 'bank_transfer':
          await this.processBankTransferDeposit(transaction);
          break;
        default:
          throw new Error(`Unsupported deposit method: ${transaction.method.id}`);
      }
    } catch (error) {
      console.error('Deposit processing failed:', error);
      transaction.status = 'failed';
    }
  }

  // Auszahlung verarbeiten
  private async processWithdrawal(transaction: Transaction): Promise<void> {
    transaction.status = 'processing';

    try {
      switch (transaction.method.id) {
        case 'bitcoin':
        case 'ethereum':
        case 'usdt':
        case 'usdc':
        case 'litecoin':
        case 'binancecoin':
          await this.processCryptoWithdrawal(transaction);
          break;
        case 'paypal':
          await this.processPayPalWithdrawal(transaction);
          break;
        case 'credit_card':
          await this.processCreditCardWithdrawal(transaction);
          break;
        case 'bank_transfer':
          await this.processBankTransferWithdrawal(transaction);
          break;
        default:
          throw new Error(`Unsupported withdrawal method: ${transaction.method.id}`);
      }
    } catch (error) {
      console.error('Withdrawal processing failed:', error);
      transaction.status = 'failed';
      
      // Guthaben zurückbuchen bei Fehler
      const user = users.find(u => u.id === transaction.userId);
      if (user) {
        user.balance += transaction.amount;
      }
    }
  }

  // Krypto-Einzahlung verarbeiten
  private async processCryptoDeposit(transaction: Transaction): Promise<void> {
    // Temporäre Einzahlungsadresse generieren (in production: echte Wallet-API)
    const depositAddress = this.generateDepositAddress(transaction.userId, transaction.method.id);
    transaction.details.depositAddress = depositAddress;

    console.log(`🪙 Crypto deposit address generated: ${depositAddress}`);

    // Simuliere Krypto-Einzahlung (in production: echte Blockchain-Überwachung)
    setTimeout(() => {
      this.completeCryptoDeposit(transaction.id);
    }, 10000); // 10 Sekunden Simulation
  }

  // Krypto-Auszahlung verarbeiten
  private async processCryptoWithdrawal(transaction: Transaction): Promise<void> {
    const userWallet = transaction.details.cryptoAddress;
    if (!userWallet) {
      throw new Error('Crypto address required');
    }

    switch (transaction.method.id) {
      case 'bitcoin': {
        if (!bitcoinService.validateBitcoinAddress(userWallet)) {
          throw new Error('Invalid Bitcoin address');
        }
        const bitcoinTx = await bitcoinService.payoutToUser(userWallet, transaction.amountReceived || 0);
        transaction.bitcoinTx = bitcoinTx;
        transaction.externalId = bitcoinTx.id;
        this.monitorBitcoinTransaction(transaction.id, bitcoinTx.id);
        break;
      }
      case 'ethereum': {
        if (!ethService.validateEthAddress(userWallet)) {
          throw new Error('Invalid Ethereum address');
        }
        const result = await ethService.payoutToUser(userWallet, transaction.amountReceived || 0);
        transaction.externalId = result.txHash;
        transaction.details.txHash = result.txHash;
        transaction.status = 'completed';
        transaction.completedAt = new Date();
        break;
      }
      default:
        throw new Error(`Unsupported crypto withdrawal method: ${transaction.method.id}`);
    }
  }

  // PayPal verarbeiten (Simulation)
  private async processPayPalDeposit(transaction: Transaction): Promise<void> {
    transaction.externalId = `PP_${Date.now()}`;
    
    setTimeout(() => {
      this.completeTransaction(transaction.id);
    }, 2000);
  }

  private async processPayPalWithdrawal(transaction: Transaction): Promise<void> {
    transaction.externalId = `PP_OUT_${Date.now()}`;
    
    setTimeout(() => {
      this.completeTransaction(transaction.id);
    }, 3000);
  }

  // Kreditkarte verarbeiten (Simulation)
  private async processCreditCardDeposit(transaction: Transaction): Promise<void> {
    transaction.externalId = `CC_${Date.now()}`;
    
    setTimeout(() => {
      this.completeTransaction(transaction.id);
    }, 1000);
  }

  private async processCreditCardWithdrawal(transaction: Transaction): Promise<void> {
    transaction.externalId = `CC_OUT_${Date.now()}`;
    
    setTimeout(() => {
      this.completeTransaction(transaction.id);
    }, 5000);
  }

  // Banküberweisung verarbeiten (Simulation)
  private async processBankTransferDeposit(transaction: Transaction): Promise<void> {
    transaction.externalId = `BT_${Date.now()}`;
    
    setTimeout(() => {
      this.completeTransaction(transaction.id);
    }, 60000); // 1 Minute für Demo
  }

  private async processBankTransferWithdrawal(transaction: Transaction): Promise<void> {
    transaction.externalId = `BT_OUT_${Date.now()}`;
    
    setTimeout(() => {
      this.completeTransaction(transaction.id);
    }, 120000); // 2 Minuten für Demo
  }

  // Transaktion abschließen
  private completeTransaction(transactionId: string): void {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) return;

    transaction.status = 'completed';
    transaction.completedAt = new Date();

    if (transaction.type === 'deposit') {
      // Guthaben zum Benutzer hinzufügen
      const user = users.find(u => u.id === transaction.userId);
      if (user && transaction.amountReceived) {
        user.balance += transaction.amountReceived;
        console.log(`✅ Deposit completed: +${transaction.amountReceived}€ to user ${user.email}`);
        
        // 60% an House-Wallet senden
        this.sendToHouseWallet(transaction.amountReceived);
      }
    }

    console.log(`✅ Transaction completed: ${transactionId}`);
  }

  // Krypto-Einzahlung abschließen
  private completeCryptoDeposit(transactionId: string): void {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) return;

    // Simuliere empfangene Krypto-Zahlung
    const simulatedAmount = transaction.amount;
    transaction.details.receivedAmount = simulatedAmount;
    transaction.details.txHash = `0x${Math.random().toString(16).substr(2, 64)}`;

    this.completeTransaction(transactionId);
  }

  // Bitcoin-Transaktion überwachen
  private monitorBitcoinTransaction(transactionId: string, bitcoinTxId: string): void {
    const checkStatus = () => {
      const bitcoinTx = bitcoinService.getTransaction(bitcoinTxId);
      const transaction = this.transactions.get(transactionId);
      
      if (!bitcoinTx || !transaction) return;

      if (bitcoinTx.status === 'confirmed') {
        transaction.status = 'completed';
        transaction.completedAt = new Date();
        transaction.details.txHash = bitcoinTx.txHash;
        console.log(`✅ Bitcoin withdrawal completed: ${transactionId}`);
      } else if (bitcoinTx.status === 'failed') {
        transaction.status = 'failed';
        // Guthaben zurückbuchen
        const user = users.find(u => u.id === transaction.userId);
        if (user) {
          user.balance += transaction.amount;
        }
      } else {
        // Weiter überwachen
        setTimeout(checkStatus, 5000);
      }
    };

    setTimeout(checkStatus, 5000);
  }

  // 60% an House-Wallet senden
  private async sendToHouseWallet(amount: number): Promise<void> {
    const houseAmount = amount * 0.6;
    try {
      await bitcoinService.sendToHouseWallet(houseAmount);
      console.log(`🏦 Sent ${houseAmount}€ (60%) to house wallet`);
    } catch (error) {
      console.error('Failed to send to house wallet:', error);
    }
  }

  // Hilfsmethoden
  private calculateFees(amount: number, method: PaymentMethod): number {
    return method.fees.fixed + (amount * method.fees.percentage / 100);
  }

  private generateTransactionId(): string {
    return `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateDepositAddress(userId: string, cryptoType: string): string {
    // In production: echte Wallet-API verwenden
    const hash = require('crypto').createHash('sha256')
      .update(`${userId}-${cryptoType}-${Date.now()}`)
      .digest('hex');

    if (cryptoType === 'bitcoin') {
      return `bc1q${hash.substr(0, 39)}`;
    } else if (cryptoType === 'litecoin') {
      return `ltc1q${hash.substr(0, 39)}`;
    } else if (cryptoType === 'ethereum' || cryptoType === 'usdt' || cryptoType === 'usdc') {
      return `0x${hash.substr(0, 40)}`;
    } else if (cryptoType === 'binancecoin') {
      return `bnb${hash.substr(0, 39)}`;
    }

    return hash.substr(0, 34);
  }

  // Public API Methoden
  getTransaction(transactionId: string): Transaction | undefined {
    return this.transactions.get(transactionId);
  }

  getUserTransactions(userId: string): Transaction[] {
    return Array.from(this.transactions.values())
      .filter(tx => tx.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getAllTransactions(): Transaction[] {
    return Array.from(this.transactions.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getPaymentMethods(): PaymentMethod[] {
    return PAYMENT_METHODS.filter(method => method.enabled);
  }
}

// Singleton-Instanz exportieren
export const paymentService = new PaymentService();
