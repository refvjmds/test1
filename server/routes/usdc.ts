import { RequestHandler } from 'express';
import { ApiResponse, TicketPurchaseRequest } from '../../shared/types';
import { usdcService, SupportedChain } from '../services/UsdcService';
import { createTicket } from '../data/lottery';
import { getTicketPriceUsd } from '../utils/pricing';

export const getCryptoConfig: RequestHandler = (_req, res) => {
  try {
    const chain = usdcService.getActiveChain();
    const cfg = usdcService.getChainConfig(chain);
    if (!cfg.rpcUrl || !cfg.tokenAddress) {
      return res.json({ success: false, error: 'USDC not configured on server' });
    }
    const chainName = chain === 'op-mainnet' ? 'Optimism' : 'Optimism Sepolia';
    const response: ApiResponse<any> = {
      success: true,
      data: {
        chain,
        chainName,
        chainIdHex: cfg.chainIdHex,
        rpcUrl: cfg.rpcUrl,
        tokenAddress: cfg.tokenAddress,
        depositWallet: cfg.depositWallet,
        decimals: cfg.decimals,
      }
    };
    res.json(response);
  } catch (e) {
    res.json({ success: false, error: 'Failed to load crypto config' });
  }
};

export const purchaseTicketsUsdc: RequestHandler = async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) return res.json({ success: false, error: 'Authentication required' });

    const { tickets, couponCode, payment }: (TicketPurchaseRequest & any) = req.body;

    if (!tickets || !Array.isArray(tickets) || tickets.length === 0) {
      return res.json({ success: false, error: 'No tickets provided' });
    }

    // Basic ticket validation (same as original)
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

    // Price calculation in USDC
    const price = getTicketPriceUsd();
    const baseCost = tickets.length * price;
    // Apply coupon (percentage) using existing validation endpoint would require extra request; for simplicity trust provided couponCode like original route
    let discount = 0;
    if (couponCode) {
      // We call internal validator to ensure parity
      const { validateCoupon } = await import('../data/coupons');
      const result = validateCoupon(couponCode, tickets.length);
      if (!result.isValid) {
        return res.json({ success: false, error: result.message || 'Invalid coupon' });
      }
      discount = result.discount;
    }
    const totalCost = baseCost * (1 - discount / 100);

    // FREE purchase path (e.g., 100% coupon): create tickets immediately, no on-chain tx
    if (totalCost <= 0) {
      const created = tickets.map((t: any) => createTicket(user.id, t.mainNumbers, t.worldNumbers));
      if (couponCode && discount > 0) {
        const { useCoupon } = await import('../data/coupons');
        useCoupon(couponCode);
      }
      const response: ApiResponse<any> = {
        success: true,
        data: { tickets: created, totalCostUSDC: 0 }
      };
      return res.json(response);
    }

    const expectedAmount6 = usdcService.toUnit6(totalCost.toFixed(6));

    // Validate payment object
    if (!payment || typeof payment !== 'object') {
      return res.json({ success: false, error: 'Payment details required' });
    }
    const { chain, txHash, sender } = payment as { chain: SupportedChain; txHash: string; sender: string };
    const activeChain = usdcService.getActiveChain();
    if (chain !== activeChain || !txHash || !sender) {
      return res.json({ success: false, error: 'Invalid payment details' });
    }

    const validation = await usdcService.validateIncomingTransfer({
      chain: activeChain,
      txHash,
      expectedAmount6: expectedAmount6,
      expectedSender: sender,
    });
    if (!validation.ok) {
      return res.json({ success: false, error: validation.reason || 'Payment validation failed' });
    }

    // Revenue split disabled: keep 100% on deposit wallet

    // Create tickets
    const created = tickets.map((t: any) => createTicket(user.id, t.mainNumbers, t.worldNumbers));

    // Consume coupon usage if applied
    if (couponCode && discount > 0) {
      const { useCoupon } = await import('../data/coupons');
      useCoupon(couponCode);
    }

    const response: ApiResponse<any> = {
      success: true,
      data: {
        tickets: created,
        totalCostUSDC: totalCost,
        txHash,
      }
    };
    res.json(response);
  } catch (error) {
    console.error('Error in purchaseTicketsUsdc:', error);
    res.json({ success: false, error: 'Failed to purchase tickets' });
  }
};

export const sweepFundsToPayout: RequestHandler = async (_req, res) => {
  try {
    const result = await usdcService.sweepAllToPayout(usdcService.getActiveChain());
    const response: ApiResponse<any> = { success: true, data: result };
    res.json(response);
  } catch (e) {
    console.error('Error sweeping funds:', e);
    res.json({ success: false, error: 'Failed to sweep funds' });
  }
};
