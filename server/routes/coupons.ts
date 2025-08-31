import { RequestHandler } from "express";
import { ApiResponse, CouponCreateRequest, CouponValidationResponse } from "../../shared/types";
import { 
  createCoupon, 
  validateCoupon, 
  useCoupon, 
  getAllCoupons, 
  deleteCoupon, 
  toggleCouponStatus 
} from "../data/coupons";

export const validateCouponRoute: RequestHandler = (req, res) => {
  try {
    const { code, ticketCount } = req.body;

    if (!code || typeof ticketCount !== 'number') {
      return res.json({ 
        success: false, 
        error: "Code and ticket count are required" 
      });
    }

    const validation = validateCoupon(code, ticketCount);
    
    const response: ApiResponse<CouponValidationResponse> = {
      success: true,
      data: validation,
    };

    res.json(response);
  } catch (error) {
    console.error("Error validating coupon:", error);
    res.json({ success: false, error: "Failed to validate coupon" });
  }
};

export const useCouponRoute: RequestHandler = (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.json({ success: false, error: "Coupon code is required" });
    }

    const success = useCoupon(code);
    
    const response: ApiResponse = {
      success,
      data: { used: success },
    };

    res.json(response);
  } catch (error) {
    console.error("Error using coupon:", error);
    res.json({ success: false, error: "Failed to use coupon" });
  }
};

// Admin routes
export const createCouponRoute: RequestHandler = (req, res) => {
  try {
    const request: CouponCreateRequest = req.body;

    if (!request.discountPercent || request.discountPercent < 5 || request.discountPercent > 100) {
      return res.json({ 
        success: false, 
        error: "Discount must be between 5 and 100 percent" 
      });
    }

    if (!request.usageLimit || request.usageLimit < 1) {
      return res.json({ 
        success: false, 
        error: "Usage limit must be at least 1" 
      });
    }

    const coupon = createCoupon(request);
    
    const response: ApiResponse = {
      success: true,
      data: coupon,
    };

    res.json(response);
  } catch (error) {
    console.error("Error creating coupon:", error);
    res.json({ success: false, error: "Failed to create coupon" });
  }
};

export const getAllCouponsRoute: RequestHandler = (req, res) => {
  try {
    const coupons = getAllCoupons();
    
    const response: ApiResponse = {
      success: true,
      data: coupons,
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching coupons:", error);
    res.json({ success: false, error: "Failed to fetch coupons" });
  }
};

export const deleteCouponRoute: RequestHandler = (req, res) => {
  try {
    const { code } = req.params;

    if (!code) {
      return res.json({ success: false, error: "Coupon code is required" });
    }

    const success = deleteCoupon(code);
    
    const response: ApiResponse = {
      success,
      data: { deleted: success },
    };

    res.json(response);
  } catch (error) {
    console.error("Error deleting coupon:", error);
    res.json({ success: false, error: "Failed to delete coupon" });
  }
};

export const toggleCouponStatusRoute: RequestHandler = (req, res) => {
  try {
    const { code } = req.params;

    if (!code) {
      return res.json({ success: false, error: "Coupon code is required" });
    }

    const success = toggleCouponStatus(code);
    
    const response: ApiResponse = {
      success,
      data: { toggled: success },
    };

    res.json(response);
  } catch (error) {
    console.error("Error toggling coupon status:", error);
    res.json({ success: false, error: "Failed to toggle coupon status" });
  }
};
