import { createHash } from 'crypto';

// Bitcoin Wallet-Konfiguration (NIEMALS private Schlüssel hier speichern!)
interface BitcoinConfig {
  houseWallet: string; // 60% der Einnahmen gehen hierhin
  payoutWallet: string; // Gewinne werden von hier ausgezahlt
  network: 'mainnet' | 'testnet';
  apiEndpoint?: string;
}

interface BitcoinTransaction {
  id: string;
  from: string;
  to: string;
  amount: number; // in BTC
  amountSat: number; // in Satoshis
  fee: number; // in Satoshis
  status: 'pending' | 'confirmed' | 'failed';
  txHash?: string;
  blockHeight?: number;
  timestamp: Date;
}

interface WalletBalance {
  address: string;
  balance: number; // in BTC
  balanceSat: number; // in Satoshis
  unconfirmed: number;
}

class BitcoinService {
  private config: BitcoinConfig = {
    houseWallet: 'bc1qc6xrt0x2ezcs3796nsg9t84kyf3ywzmcw57t0rteceedre4576vsmfjn2j',
    payoutWallet: 'bc1q3wunw4679z3scfskadmz5ut5mk4t7848gyef6p',
    network: 'mainnet',
    // In production würde hier eine echte Bitcoin API verwendet werden
    apiEndpoint: process.env.BITCOIN_API_ENDPOINT || 'https://blockstream.info/api'
  };

  private pendingTransactions: Map<string, BitcoinTransaction> = new Map();

  constructor() {
    console.log('🪙 Bitcoin Service initialized');
    console.log(`🏦 House Wallet: ${this.config.houseWallet}`);
    console.log(`💰 Payout Wallet: ${this.config.payoutWallet}`);
  }

  // Aktuelle Bitcoin-Preise abrufen
  async getBitcoinPrice(): Promise<number> {
    try {
      // In production: echte API wie CoinGecko oder CoinMarketCap
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=eur');
      const data = await response.json();
      return data.bitcoin.eur;
    } catch (error) {
      console.error('Error fetching Bitcoin price:', error);
      return 45000; // Fallback-Preis
    }
  }

  // EUR zu BTC konvertieren
  async eurToBtc(eurAmount: number): Promise<number> {
    const btcPrice = await this.getBitcoinPrice();
    return eurAmount / btcPrice;
  }

  // BTC zu EUR konvertieren
  async btcToEur(btcAmount: number): Promise<number> {
    const btcPrice = await this.getBitcoinPrice();
    return btcAmount * btcPrice;
  }

  // Satoshis zu BTC
  satToBtc(satoshis: number): number {
    return satoshis / 100000000;
  }

  // BTC zu Satoshis
  btcToSat(btc: number): number {
    return Math.round(btc * 100000000);
  }

  // Wallet-Guthaben abrufen (Simulation für Demo)
  async getWalletBalance(address: string): Promise<WalletBalance> {
    try {
      // In production: echte Blockchain-API
      const response = await fetch(`${this.config.apiEndpoint}/address/${address}`);
      const data = await response.json();
      
      return {
        address,
        balance: this.satToBtc(data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum),
        balanceSat: data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum,
        unconfirmed: this.satToBtc(data.mempool_stats.funded_txo_sum - data.mempool_stats.spent_txo_sum)
      };
    } catch (error) {
      console.error(`Error fetching balance for ${address}:`, error);
      // Fallback für Demo
      return {
        address,
        balance: Math.random() * 10, // Demo-Guthaben
        balanceSat: Math.round(Math.random() * 1000000000),
        unconfirmed: 0
      };
    }
  }

  // House-Wallet Guthaben
  async getHouseWalletBalance(): Promise<WalletBalance> {
    return this.getWalletBalance(this.config.houseWallet);
  }

  // Payout-Wallet Guthaben  
  async getPayoutWalletBalance(): Promise<WalletBalance> {
    return this.getWalletBalance(this.config.payoutWallet);
  }

  // Bitcoin-Transaktion erstellen (für Auszahlungen)
  async createTransaction(
    to: string, 
    amountBtc: number, 
    purpose: 'house_payment' | 'user_payout' | 'winner_payout'
  ): Promise<BitcoinTransaction> {
    const transaction: BitcoinTransaction = {
      id: this.generateTransactionId(),
      from: purpose === 'house_payment' ? 'internal' : this.config.payoutWallet,
      to,
      amount: amountBtc,
      amountSat: this.btcToSat(amountBtc),
      fee: 1000, // Standard-Gebühr in Satoshis
      status: 'pending',
      timestamp: new Date()
    };

    this.pendingTransactions.set(transaction.id, transaction);
    
    console.log(`🔄 Created ${purpose} transaction:`, {
      id: transaction.id,
      to: transaction.to,
      amount: `${amountBtc} BTC`,
      purpose
    });

    // In production: echte Bitcoin-Transaktion über Hardware-Wallet oder sichere API
    setTimeout(() => {
      this.simulateTransactionConfirmation(transaction.id);
    }, 5000); // Simuliere 5 Sekunden Bestätigung

    return transaction;
  }

  // 60% der Einnahmen an House-Wallet senden
  async sendToHouseWallet(eurAmount: number): Promise<BitcoinTransaction> {
    const btcAmount = await this.eurToBtc(eurAmount);
    return this.createTransaction(this.config.houseWallet, btcAmount, 'house_payment');
  }

  // Gewinne an Benutzer auszahlen
  async payoutToUser(userWallet: string, eurAmount: number): Promise<BitcoinTransaction> {
    const btcAmount = await this.eurToBtc(eurAmount);
    return this.createTransaction(userWallet, btcAmount, 'user_payout');
  }

  // Lottogewinn an Gewinner auszahlen
  async payoutWinner(winnerWallet: string, eurAmount: number): Promise<BitcoinTransaction> {
    const btcAmount = await this.eurToBtc(eurAmount);
    return this.createTransaction(winnerWallet, btcAmount, 'winner_payout');
  }

  // Transaktion-Status abrufen
  getTransaction(transactionId: string): BitcoinTransaction | undefined {
    return this.pendingTransactions.get(transactionId);
  }

  // Alle ausstehenden Transaktionen
  getPendingTransactions(): BitcoinTransaction[] {
    return Array.from(this.pendingTransactions.values())
      .filter(tx => tx.status === 'pending');
  }

  // Alle bestätigten Transaktionen
  getConfirmedTransactions(): BitcoinTransaction[] {
    return Array.from(this.pendingTransactions.values())
      .filter(tx => tx.status === 'confirmed');
  }

  // Private Hilfsmethoden
  private generateTransactionId(): string {
    return createHash('sha256')
      .update(`${Date.now()}-${Math.random()}`)
      .digest('hex')
      .substring(0, 16);
  }

  private simulateTransactionConfirmation(transactionId: string): void {
    const transaction = this.pendingTransactions.get(transactionId);
    if (transaction) {
      transaction.status = 'confirmed';
      transaction.txHash = this.generateTxHash();
      transaction.blockHeight = Math.floor(Math.random() * 1000000) + 800000;
      
      console.log(`✅ Transaction confirmed:`, {
        id: transactionId,
        txHash: transaction.txHash,
        amount: `${transaction.amount} BTC`
      });
    }
  }

  private generateTxHash(): string {
    return createHash('sha256')
      .update(`${Date.now()}-${Math.random()}-txhash`)
      .digest('hex');
  }

  // Wallet-Adresse validieren
  validateBitcoinAddress(address: string): boolean {
    // Vereinfachte Validierung - in production würde eine richtige Bibliothek verwendet
    const bech32Regex = /^bc1[a-z0-9]{39,59}$/;
    const legacyRegex = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/;
    
    return bech32Regex.test(address) || legacyRegex.test(address);
  }

  // Service-Status
  getServiceStatus() {
    return {
      houseWallet: this.config.houseWallet,
      payoutWallet: this.config.payoutWallet,
      network: this.config.network,
      pendingTransactions: this.getPendingTransactions().length,
      confirmedTransactions: this.getConfirmedTransactions().length
    };
  }
}

// Singleton-Instanz exportieren
export const bitcoinService = new BitcoinService();
export type { BitcoinTransaction, WalletBalance };
