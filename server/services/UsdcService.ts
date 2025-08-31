import { ethers } from 'ethers';

export type SupportedChain = 'op-sepolia' | 'op-mainnet';

interface UsdcConfig {
  chainIdHex: string;
  rpcUrl: string;
  tokenAddress: string; // USDC ERC20 token address on the chain
  depositWallet: string; // receives ticket purchases
  splitWallet: string;   // receives 60%
  payoutWallet: string;  // used for winner payouts
  decimals: number;      // USDC = 6
}

export interface PurchaseValidationResult {
  ok: boolean;
  reason?: string;
  txHash?: string;
  confirmations?: number;
  amount6?: bigint; // amount in 10^6
  sender?: string;
  to?: string;
}

const ERC20_ABI = [
  'function transfer(address to, uint256 value) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'event Transfer(address indexed from, address indexed to, uint256 value)'
];

class UsdcService {
  private providers: Map<SupportedChain, ethers.JsonRpcProvider> = new Map();
  private usdcContracts: Map<SupportedChain, ethers.Contract> = new Map();
  private config: Record<SupportedChain, UsdcConfig>;
  private mnemonic: string;

  constructor() {
    const rpcSepolia = process.env.OP_RPC_URL || '';
    const tokenSepolia = process.env.USDC_TOKEN_ADDRESS_OP_SEPOLIA || '';
    const rpcMainnet = process.env.OP_MAINNET_RPC_URL || '';
    const tokenMainnet = process.env.USDC_TOKEN_ADDRESS_OP_MAINNET || '';

    const depositWallet = (process.env.DEPOSIT_WALLET_ADDRESS || '').toLowerCase();
    const splitWallet = (process.env.SPLIT_WALLET_ADDRESS || '').toLowerCase();
    const payoutWallet = (process.env.PAYOUT_WALLET_ADDRESS || '').toLowerCase();
    const mnemonic = process.env.USDC_MNEMONIC || '';

    this.mnemonic = mnemonic;
    this.config = {
      'op-sepolia': {
        chainIdHex: '0xaa37dc', // 11155420
        rpcUrl: rpcSepolia,
        tokenAddress: tokenSepolia,
        depositWallet,
        splitWallet,
        payoutWallet,
        decimals: 6,
      },
      'op-mainnet': {
        chainIdHex: '0xa', // 10
        rpcUrl: rpcMainnet,
        tokenAddress: tokenMainnet,
        depositWallet,
        splitWallet,
        payoutWallet,
        decimals: 6,
      },
    };

    if (!rpcSepolia) console.warn('OP_RPC_URL (Sepolia) is not set');
    if (!tokenSepolia) console.warn('USDC_TOKEN_ADDRESS_OP_SEPOLIA is not set');
    if (!rpcMainnet) console.warn('OP_MAINNET_RPC_URL is not set');
    if (!tokenMainnet) console.warn('USDC_TOKEN_ADDRESS_OP_MAINNET is not set');
    if (!depositWallet) console.warn('DEPOSIT_WALLET_ADDRESS is not set');
    if (!splitWallet) console.warn('SPLIT_WALLET_ADDRESS is not set');
    if (!payoutWallet) console.warn('PAYOUT_WALLET_ADDRESS is not set');
    if (!mnemonic) console.warn('USDC_MNEMONIC is not set');
  }

  getChainConfig(chain: SupportedChain): UsdcConfig {
    return this.config[chain];
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

  getUsdcContract(chain: SupportedChain): ethers.Contract {
    let c = this.usdcContracts.get(chain);
    if (!c) {
      const cfg = this.getChainConfig(chain);
      c = new ethers.Contract(cfg.tokenAddress, ERC20_ABI, this.getProvider(chain));
      this.usdcContracts.set(chain, c);
    }
    return c;
  }

  async getTokenBalance(chain: SupportedChain, address: string): Promise<bigint> {
    const usdc = this.getUsdcContract(chain);
    const bal = await usdc.balanceOf(address);
    return BigInt(bal.toString());
  }

  async sweepToPayout(chain: SupportedChain, fromAddress: string): Promise<string | null> {
    const cfg = this.getChainConfig(chain);
    const balance = await this.getTokenBalance(chain, fromAddress);
    if (balance === 0n) return null;
    const signer = await this.resolveSignerForAddress(chain, fromAddress);
    const usdc = this.getUsdcContract(chain).connect(signer);
    const tx = await usdc.transfer(cfg.payoutWallet, balance);
    const rc = await tx.wait(1);
    if (rc?.status !== 1) throw new Error('Sweep transfer failed');
    return tx.hash;
  }

  async sweepAllToPayout(chain: SupportedChain): Promise<{ fromDeposit?: string | null }> {
    const cfg = this.getChainConfig(chain);
    const fromDeposit = await this.sweepToPayout(chain, cfg.depositWallet);
    return { fromDeposit };
  }

  getDepositSigner(chain: SupportedChain, accountIndex = 0): ethers.HDNodeWallet {
    if (!this.mnemonic) throw new Error('USDC_MNEMONIC not configured');
    const wallet = ethers.HDNodeWallet.fromPhrase(this.mnemonic).derivePath(`m/44'/60'/0'/0/${accountIndex}`);
    return wallet.connect(this.getProvider(chain));
  }

  async resolveSignerForAddress(chain: SupportedChain, targetAddress: string): Promise<ethers.HDNodeWallet> {
    // Try first few indices to match the given address
    const addrLower = targetAddress.toLowerCase();
    for (let i = 0; i < 10; i++) {
      const signer = this.getDepositSigner(chain, i);
      if ((await signer.getAddress()).toLowerCase() === addrLower) return signer;
    }
    throw new Error('Mnemonic does not derive the expected wallet address');
  }

  toUnit6(amountUsdc: number | string): bigint {
    const n = typeof amountUsdc === 'number' ? amountUsdc.toString() : amountUsdc;
    const [intPart, fracPartRaw] = n.split('.');
    const frac = (fracPartRaw || '').padEnd(6, '0').slice(0, 6);
    return BigInt(intPart || '0') * 10n ** 6n + BigInt(frac || '0');
  }

  fromUnit6(amount6: bigint): string {
    const intPart = amount6 / 10n ** 6n;
    const frac = amount6 % (10n ** 6n);
    return `${intPart}.${frac.toString().padStart(6, '0')}`;
  }

  async validateIncomingTransfer(params: {
    chain: SupportedChain;
    txHash: string;
    expectedAmount6: bigint;
    expectedSender: string;
  }): Promise<PurchaseValidationResult> {
    const { chain, txHash, expectedAmount6, expectedSender } = params;
    const cfg = this.getChainConfig(chain);
    if (!cfg.tokenAddress) return { ok: false, reason: 'Token address not configured' };

    const provider = this.getProvider(chain);
    const receipt = await provider.waitForTransaction(txHash, 1, 60_000);
    if (!receipt) return { ok: false, reason: 'Transaction not found' };
    if (receipt.status !== 1) return { ok: false, reason: 'Transaction reverted', txHash };

    // Parse Transfer events from this token contract only
    const usdc = this.getUsdcContract(chain);
    const iface = usdc.interface;
    let matched: { from: string; to: string; value: bigint } | null = null;

    for (const log of receipt.logs || []) {
      if (!log.address || log.address.toLowerCase() !== cfg.tokenAddress.toLowerCase()) continue;
      try {
        const parsed = iface.parseLog({ topics: log.topics, data: log.data });
        if (parsed && parsed.name === 'Transfer') {
          const from = (parsed.args[0] as string).toLowerCase();
          const to = (parsed.args[1] as string).toLowerCase();
          const value = BigInt(parsed.args[2].toString());
          if (to === cfg.depositWallet && from === expectedSender.toLowerCase()) {
            matched = { from, to, value };
            break;
          }
        }
      } catch {}
    }

    // Fallback: parse transaction input if logs didn't match (some RPCs omit logs or proxies wrap events)
    if (!matched) {
      const tx = await provider.getTransaction(txHash);
      if (tx && tx.to && tx.to.toLowerCase() === cfg.tokenAddress.toLowerCase() && typeof tx.data === 'string' && tx.data.startsWith('0xa9059cbb')) {
        // transfer(address,uint256)
        const toEncoded = tx.data.slice(10, 74); // 32 bytes after method id
        const valEncoded = tx.data.slice(74, 138);
        const toAddr = '0x' + toEncoded.slice(24);
        const val = BigInt('0x' + valEncoded);
        const senderLower = (tx.from || '').toLowerCase();
        if (senderLower === expectedSender.toLowerCase() && toAddr.toLowerCase() === cfg.depositWallet.toLowerCase()) {
          matched = { from: senderLower, to: cfg.depositWallet.toLowerCase(), value: val };
        }
      }
    }

    if (!matched) return { ok: false, reason: 'No matching USDC transfer to deposit wallet found', txHash };
    if (matched.value !== expectedAmount6) return { ok: false, reason: 'Amount mismatch', txHash };

    const current = await provider.getBlockNumber();
    const confs = current - (receipt.blockNumber ?? current) + 1;
    if (confs < 1) return { ok: false, reason: 'Not enough confirmations', txHash, confirmations: confs };

    return { ok: true, txHash, confirmations: confs, amount6: matched.value, sender: matched.from, to: matched.to };
  }

  async splitRevenue(_chain: SupportedChain, _amount6: bigint): Promise<{ splitTxHash: string }> {
    // Split disabled: keep all funds on deposit wallet
    return { splitTxHash: '' };
  }

  async payout(chain: SupportedChain, to: string, amount6: bigint): Promise<string> {
    const cfg = this.getChainConfig(chain);
    const signer = await this.resolveSignerForAddress(chain, cfg.payoutWallet);
    const usdc = this.getUsdcContract(chain).connect(signer);
    const tx = await usdc.transfer(to, amount6);
    const rc = await tx.wait(1);
    if (rc?.status !== 1) throw new Error('Payout transfer failed');
    return tx.hash;
  }
}

export const usdcService = new UsdcService();
