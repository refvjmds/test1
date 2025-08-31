import { ethers } from 'ethers';
import type { SupportedChain } from './UsdcService';

interface EthConfig {
  chainIdHex: string;
  rpcUrl: string;
  depositWallet: string; // receives ticket purchases
  payoutWallet: string;  // used for winner payouts
  decimals: number;      // ETH = 18
}

export interface EthPurchaseValidationResult {
  ok: boolean;
  reason?: string;
  txHash?: string;
  confirmations?: number;
  amountWei?: bigint; // amount in wei
  sender?: string;
  to?: string;
}

class EthService {
  private providers: Map<SupportedChain, ethers.JsonRpcProvider> = new Map();
  private config: Record<SupportedChain, EthConfig>;

  constructor() {
    const rpcSepolia = process.env.OP_RPC_URL || '';
    const rpcMainnet = process.env.OP_MAINNET_RPC_URL || '';

    const depositWallet = (process.env.DEPOSIT_WALLET_ADDRESS || '').toLowerCase();
    const payoutWallet = (process.env.PAYOUT_WALLET_ADDRESS || '').toLowerCase();

    this.config = {
      'op-sepolia': {
        chainIdHex: '0xaa37dc', // 11155420
        rpcUrl: rpcSepolia,
        depositWallet,
        payoutWallet,
        decimals: 18,
      },
      'op-mainnet': {
        chainIdHex: '0xa', // 10
        rpcUrl: rpcMainnet,
        depositWallet,
        payoutWallet,
        decimals: 18,
      },
    };

    if (!rpcSepolia) console.warn('OP_RPC_URL (Sepolia) is not set');
    if (!rpcMainnet) console.warn('OP_MAINNET_RPC_URL is not set');
    if (!depositWallet) console.warn('DEPOSIT_WALLET_ADDRESS is not set');
    if (!payoutWallet) console.warn('PAYOUT_WALLET_ADDRESS is not set');
  }

  getChainConfig(chain: SupportedChain): EthConfig {
    return this.config[chain];
  }

  isBlockedAddress(address: string): boolean {
    const a = (address || '').toLowerCase();
    const fromEnv = (process.env.BLOCKED_ETH_ADDRESSES || '')
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);
    return fromEnv.includes(a);
  }

  // Determine active chain based on env toggle (default sepolia)
  getActiveChain(): SupportedChain {
    return (process.env.CRYPTO_CHAIN === 'op-mainnet') ? 'op-mainnet' : 'op-sepolia';
  }

  getProvider(chain: SupportedChain): ethers.JsonRpcProvider {
    let p = this.providers.get(chain);
    if (!p) {
      const cfg = this.getChainConfig(chain);
      p = new ethers.JsonRpcProvider(cfg.rpcUrl);
      this.providers.set(chain, p);
    }
    return p;
  }

  toWei(amountEth: number | string): bigint {
    const n = typeof amountEth === 'number' ? amountEth.toString() : amountEth;
    const [intPart, fracPartRaw] = n.split('.');
    const frac = (fracPartRaw || '').padEnd(18, '0').slice(0, 18);
    return BigInt(intPart || '0') * 10n ** 18n + BigInt(frac || '0');
  }

  fromWei(amountWei: bigint): string {
    const intPart = amountWei / 10n ** 18n;
    const frac = amountWei % (10n ** 18n);
    return `${intPart}.${frac.toString().padStart(18, '0')}`;
  }

  getEthUsdPrice(): number {
    const raw = process.env.ETH_USD_PRICE;
    const n = raw ? Number(raw) : NaN;
    if (Number.isFinite(n) && n > 0) return n;
    return NaN; // not configured
  }

  async validateIncomingTransfer(params: {
    chain: SupportedChain;
    txHash: string;
    expectedAmountWei: bigint;
    expectedSender: string;
  }): Promise<EthPurchaseValidationResult> {
    const { chain, txHash, expectedAmountWei, expectedSender } = params;
    const cfg = this.getChainConfig(chain);

    const provider = this.getProvider(chain);
    const receipt = await provider.waitForTransaction(txHash, 1, 60_000);
    if (!receipt) return { ok: false, reason: 'Transaction not found' };
    if (receipt.status !== 1) return { ok: false, reason: 'Transaction reverted', txHash };

    const tx = await provider.getTransaction(txHash);
    if (!tx) return { ok: false, reason: 'Transaction not found (tx)', txHash };

    const toAddr = (tx.to || '').toLowerCase();
    const fromAddr = (tx.from || '').toLowerCase();
    const value = BigInt(tx.value?.toString() || '0');

    if (this.isBlockedAddress(toAddr)) return { ok: false, reason: 'Blocked recipient', txHash };
    if (toAddr !== cfg.depositWallet) return { ok: false, reason: 'Wrong recipient', txHash };
    if (fromAddr !== expectedSender.toLowerCase()) return { ok: false, reason: 'Wrong sender', txHash };
    if (value !== expectedAmountWei) return { ok: false, reason: 'Amount mismatch', txHash };

    const current = await provider.getBlockNumber();
    const confs = current - (receipt.blockNumber ?? current) + 1;
    if (confs < 1) return { ok: false, reason: 'Not enough confirmations', txHash, confirmations: confs };

    return { ok: true, txHash, confirmations: confs, amountWei: value, sender: fromAddr, to: toAddr };
  }

  async getEthPriceEur(): Promise<number> {
    try {
      const resp = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=eur');
      const json = await resp.json();
      const price = Number(json?.ethereum?.eur);
      if (!Number.isFinite(price) || price <= 0) throw new Error('Invalid ETH price');
      return price;
    } catch (e) {
      throw new Error('Failed to fetch ETH/EUR price');
    }
  }

  async eurToEth(eurAmount: number): Promise<number> {
    const price = await this.getEthPriceEur();
    return eurAmount / price;
  }

  validateEthAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  async payoutToUser(to: string, amountEur: number): Promise<{ txHash: string; amountEth: string }> {
    if (!this.validateEthAddress(to)) {
      throw new Error('Invalid Ethereum address');
    }
    const chain = this.getActiveChain();
    const provider = this.getProvider(chain);
    const cfg = this.getChainConfig(chain);

    const pk = process.env.PAYOUT_PRIVATE_KEY || '';
    const phrase = process.env.PAYOUT_WALLET_MNEMONIC || '';
    let wallet: ethers.Wallet;
    if (pk) {
      wallet = new ethers.Wallet(pk, provider);
    } else if (phrase) {
      wallet = ethers.Wallet.fromPhrase(phrase).connect(provider);
    } else {
      throw new Error('Payout credentials not configured');
    }

    if (cfg.payoutWallet && wallet.address.toLowerCase() !== cfg.payoutWallet) {
      console.warn(`Payout wallet address mismatch. Env: ${cfg.payoutWallet}, Wallet: ${wallet.address}`);
    }

    const amountEthNum = await this.eurToEth(amountEur);
    const wei = this.toWei(amountEthNum.toString());

    const tx = await wallet.sendTransaction({ to, value: wei });
    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) {
      throw new Error('ETH payout failed');
    }
    return { txHash: tx.hash, amountEth: this.fromWei(wei) };
  }
}

export const ethService = new EthService();
