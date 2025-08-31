let overridePriceUsd: number | null = null;

export function setTicketPriceUsd(newPrice: number) {
  if (!Number.isFinite(newPrice) || newPrice < 0) throw new Error('Invalid price');
  overridePriceUsd = Number(newPrice);
}

export function getTicketPriceUsd(): number {
  if (overridePriceUsd != null) return overridePriceUsd;
  const raw = process.env.TICKET_PRICE_USD;
  const n = raw ? Number(raw) : NaN;
  if (Number.isFinite(n) && n >= 0) return n;
  return 2; // default $2 per ticket
}
