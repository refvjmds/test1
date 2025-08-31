import { RequestHandler } from "express";
import { ApiResponse, DisplayOverrideRequest } from "@shared/types";
import { updateDisplayOverrides, getCurrentDrawing, getGlobalDisplayOverrides } from "../data/lottery";
import { autoDrawingService } from "../services/AutoDrawingService";

export const handleUpdateDisplayOverrides: RequestHandler = (req, res) => {
  try {
    const { title, date, time, globalOverrides }: DisplayOverrideRequest = req.body;

    const success = updateDisplayOverrides({ title, date, time, globalOverrides });

    if (success) {
      // Recalculate next drawing time if time-related overrides were changed
      if (globalOverrides && (date || time)) {
        console.log('🎲 Recalculating next drawing time due to manual override changes');
        autoDrawingService.recalculateNextDrawingTime();
      }

      const overrides = globalOverrides ? getGlobalDisplayOverrides() : getCurrentDrawing()?.displayOverrides;
      const response: ApiResponse<any> = {
        success: true,
        data: {
          message: globalOverrides ? "Global display overrides updated successfully" : "Display overrides updated successfully",
          displayOverrides: overrides,
        },
      };
      res.json(response);
    } else {
      const response: ApiResponse = {
        success: false,
        error: globalOverrides ? "Failed to update global overrides" : "No active drawing found",
      };
      res.status(404).json(response);
    }
  } catch (error) {
    console.error("Error updating display overrides:", error);
    const response: ApiResponse = {
      success: false,
      error: "Internal server error",
    };
    res.status(500).json(response);
  }
};

export const handleGetDisplayOverrides: RequestHandler = (req, res) => {
  try {
    // First check for global overrides, then fallback to current drawing overrides
    const globalOverrides = getGlobalDisplayOverrides();

    if (globalOverrides && globalOverrides.globalOverrides) {
      const response: ApiResponse<any> = {
        success: true,
        data: globalOverrides,
      };
      res.json(response);
    } else {
      const currentDrawing = getCurrentDrawing();
      const response: ApiResponse<any> = {
        success: true,
        data: currentDrawing?.displayOverrides || {},
      };
      res.json(response);
    }
  } catch (error) {
    console.error("Error getting display overrides:", error);
    const response: ApiResponse = {
      success: false,
      error: "Internal server error",
    };
    res.status(500).json(response);
  }
};
