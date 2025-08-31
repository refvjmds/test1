import { Coupon, CouponCreateRequest } from "../../shared/types";

// In-memory storage for coupons
const coupons = new Map<string, Coupon>();

// Add some default coupons for testing
const defaultCoupons: Coupon[] = [
  {
    id: "coupon-1",
    code: "WELCOME10",
    discountPercent: 10,
    minTickets: 1,
    usageLimit: 100,
    usedCount: 0,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "coupon-2",
    code: "BULK20",
    discountPercent: 20,
    minTickets: 20,
    maxTickets: 50,
    usageLimit: 50,
    usedCount: 0,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "coupon-3",
    code: "FREE100",
    discountPercent: 100,
    minTickets: 1,
    usageLimit: 100000,
    usedCount: 0,
    isActive: true,
    createdAt: new Date().toISOString(),
  }
];

// Initialize with default coupons
defaultCoupons.forEach(coupon => {
  coupons.set(coupon.code, coupon);
});

export const createCoupon = (request: CouponCreateRequest & { customCode?: string }): Coupon => {
  // Use custom code if provided, otherwise generate a unique code
  let code: string;

  if (request.customCode && request.customCode.trim()) {
    code = request.customCode.trim().toUpperCase();

    // Check if custom code already exists
    if (coupons.has(code)) {
      throw new Error(`Gutschein-Code "${code}" existiert bereits`);
    }
  } else {
    code = generateCouponCode();
  }

  const coupon: Coupon = {
    id: `coupon-${Date.now()}`,
    code,
    discountPercent: request.discountPercent,
    minTickets: request.minTickets,
    maxTickets: request.maxTickets,
    usageLimit: request.usageLimit,
    usedCount: 0,
    isActive: true,
    createdAt: new Date().toISOString(),
    expiresAt: request.expiresAt,
  };

  coupons.set(code, coupon);
  return coupon;
};

export const validateCoupon = (code: string, ticketCount: number): { isValid: boolean; discount: number; message?: string } => {
  const coupon = coupons.get(code.toUpperCase());

  if (!coupon) {
    return { isValid: false, discount: 0, message: "Gutscheincode nicht gefunden" };
  }

  if (!coupon.isActive) {
    return { isValid: false, discount: 0, message: "Gutschein ist nicht aktiv" };
  }

  if (coupon.usedCount >= coupon.usageLimit) {
    return { isValid: false, discount: 0, message: "Gutschein bereits ausgeschöpft" };
  }

  if (coupon.expiresAt && new Date() > new Date(coupon.expiresAt)) {
    return { isValid: false, discount: 0, message: "Gutschein ist abgelaufen" };
  }

  if (coupon.minTickets && ticketCount < coupon.minTickets) {
    return { 
      isValid: false, 
      discount: 0, 
      message: `Mindestens ${coupon.minTickets} Spielscheine erforderlich` 
    };
  }

  if (coupon.maxTickets && ticketCount > coupon.maxTickets) {
    return { 
      isValid: false, 
      discount: 0, 
      message: `Maximal ${coupon.maxTickets} Spielscheine für diesen Gutschein` 
    };
  }

  return { isValid: true, discount: coupon.discountPercent };
};

export const useCoupon = (code: string): boolean => {
  const coupon = coupons.get(code.toUpperCase());
  
  if (!coupon || !coupon.isActive || coupon.usedCount >= coupon.usageLimit) {
    return false;
  }

  coupon.usedCount++;
  coupons.set(code, coupon);
  return true;
};

export const getAllCoupons = (): Coupon[] => {
  return Array.from(coupons.values()).sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

export const getCoupon = (code: string): Coupon | undefined => {
  return coupons.get(code.toUpperCase());
};

export const deleteCoupon = (code: string): boolean => {
  return coupons.delete(code.toUpperCase());
};

export const toggleCouponStatus = (code: string): boolean => {
  const coupon = coupons.get(code.toUpperCase());
  if (!coupon) return false;
  
  coupon.isActive = !coupon.isActive;
  coupons.set(code, coupon);
  return true;
};

const generateCouponCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};
