import type { RequestHandler } from 'express';
import { ApiResponse, TicketPurchaseRequest } from '../../shared/types';
import { ethService } from '../services/EthService';
import { createTicket } from '../data/lottery';
import { getTicketPriceUsd } from '../utils/pricing';

let cachedPrice: { ts: number; price: number } | null = null;

async function fetchLiveEthUsd(): Promise<number> {
  const now = Date.now();
  if (cachedPrice && now - cachedPrice.ts < 30000) return cachedPrice.price;
  const apiKey = process.env.CMC_API_KEY || '';
  if (!apiKey) throw new Error('CMC_API_KEY not set');
  const url = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=ETH&convert=USD';
  const resp = await fetch(url, { headers: { 'X-CMC_PRO_API_KEY': apiKey } as any });
  if (!resp.ok) throw new Error('Failed to fetch price');
  const json = await resp.json();
  const price = Number(json?.data?.ETH?.quote?.USD?.price);
  if (!Number.isFinite(price) || price <= 0) throw new Error('Invalid price data');
  cachedPrice = { ts: now, price };
  return price;
}

export const getCryptoConfig: RequestHandler = (_req, res) => {
  try {
    const chain = ethService.getActiveChain();
    const cfg = ethService.getChainConfig(chain);
    if (!cfg.rpcUrl || !cfg.depositWallet) {
      return res.json({ success: false, error: 'ETH not configured on server' });
    }
    const chainName = chain === 'op-mainnet' ? 'Optimism' : 'Optimism Sepolia';
    const response: ApiResponse<any> = {
      success: true,
      data: {
        asset: 'ETH',
        chain,
        chainName,
        chainIdHex: cfg.chainIdHex,
        rpcUrl: cfg.rpcUrl,
        depositWallet: cfg.depositWallet,
        decimals: cfg.decimals
      }
    };
    res.json(response);
  } catch (e) {
    res.json({ success: false, error: 'Failed to load crypto config' });
  }
};

export const getEthUsdPrice: RequestHandler = async (_req, res) => {
  try {
    const price = await fetchLiveEthUsd();
    res.json({ success: true, data: { price } });
  } catch (e) {
    res.json({ success: false, error: 'Failed to load price' });
  }
};

export const purchaseTicketsEth: RequestHandler = async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) return res.json({ success: false, error: 'Authentication required' });

    const { tickets, couponCode, payment }: (TicketPurchaseRequest & any) = req.body;

    if (!tickets || !Array.isArray(tickets) || tickets.length === 0) {
      return res.json({ success: false, error: 'No tickets provided' });
    }

    for (const ticket of tickets) {
      if (!Array.isArray(ticket.mainNumbers) || !Array.isArray(ticket.worldNumbers)) {
        return res.json({ success: false, error: 'Invalid ticket format' });
      }
      if (ticket.mainNumbers.length !== 5 || ticket.worldNumbers.length !== 2) {
        return res.json({ success: false, error: 'Invalid ticket format' });
      }
      const invalidMain = ticket.mainNumbers.some((n: number) => n < 1 || n > 50);
      const invalidWorld = ticket.worldNumbers.some((n: number) => n < 1 || n > 12);
      if (invalidMain || invalidWorld) return res.json({ success: false, error: 'Numbers out of range' });
      if (new Set(ticket.mainNumbers).size !== 5 || new Set(ticket.worldNumbers).size !== 2) {
        return res.json({ success: false, error: 'Duplicate numbers in ticket' });
      }
    }

    const price = getTicketPriceUsd();
    const baseCost = tickets.length * price;

    let discount = 0;
    if (couponCode) {
      const { validateCoupon } = await import('../data/coupons');
      const result = validateCoupon(couponCode, tickets.length);
      if (!result.isValid) {
        return res.json({ success: false, error: result.message || 'Invalid coupon' });
      }
      discount = result.discount;
    }
    const totalCostUsd = baseCost * (1 - discount / 100);

    if (totalCostUsd <= 0) {
      const created = tickets.map((t: any) => createTicket(user.id, t.mainNumbers, t.worldNumbers));
      if (couponCode && discount > 0) {
        const { useCoupon } = await import('../data/coupons');
        useCoupon(couponCode);
      }
      const response: ApiResponse<any> = {
        success: true,
        data: { tickets: created, totalCostETH: 0 }
      };
      return res.json(response);
    }

    const chain = ethService.getActiveChain();
    // Use live CMC price; align rounding with client (ceil to wei)
    let ethUsd: number;
    try {
      ethUsd = await fetchLiveEthUsd();
    } catch (e) {
      return res.json({ success: false, error: 'Failed to load ETH price' });
    }
    const usdScaled = BigInt(Math.round(totalCostUsd * 1e6));
    const priceScaled = BigInt(Math.round(ethUsd * 1e6));
    const numerator = usdScaled * (10n ** 18n);
    const expectedWei = (numerator + priceScaled - 1n) / priceScaled;

    if (!payment || typeof payment !== 'object') {
      return res.json({ success: false, error: 'Payment details required' });
    }
    const { txHash, sender } = payment as { txHash: string; sender: string };
    if (!txHash || !sender) {
      return res.json({ success: false, error: 'Invalid payment details' });
    }

    const validation = await ethService.validateIncomingTransfer({
      chain,
      txHash,
      expectedAmountWei: expectedWei,
      expectedSender: sender,
    });
    if (!validation.ok) {
      return res.json({ success: false, error: validation.reason || 'Payment validation failed' });
    }

    const created = tickets.map((t: any) => createTicket(user.id, t.mainNumbers, t.worldNumbers));

    if (couponCode && discount > 0) {
      const { useCoupon } = await import('../data/coupons');
      useCoupon(couponCode);
    }

    const response: ApiResponse<any> = {
      success: true,
      data: {
        tickets: created,
        totalCostUSD: totalCostUsd,
        amountEth: ethService.fromWei(expectedWei),
        txHash,
      }
    };
    res.json(response);
  } catch (error) {
    console.error('Error in purchaseTicketsEth:', error);
    res.json({ success: false, error: 'Failed to purchase tickets' });
  }
};
