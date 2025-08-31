import { RequestHandler } from "express";
import { ApiResponse } from "../../shared/types";
import { autoDrawingService } from "../services/AutoDrawingService";

export const getAutoDrawingStatus: RequestHandler = (req, res) => {
  try {
    const config = autoDrawingService.getConfig();
    const countdown = autoDrawingService.getTimeUntilNextDrawing();
    
    const response: ApiResponse = {
      success: true,
      data: {
        enabled: config.enabled,
        nextScheduledTime: config.nextScheduledTime,
        countdown,
        dayOfWeek: config.dayOfWeek,
        hour: config.hour,
        minute: config.minute
      },
    };
    
    res.json(response);
  } catch (error) {
    console.error("Error getting auto-drawing status:", error);
    res.json({ success: false, error: "Failed to get auto-drawing status" });
  }
};

export const setAutoDrawingEnabled: RequestHandler = (req, res) => {
  try {
    const { enabled } = req.body;
    
    if (typeof enabled !== "boolean") {
      return res.json({ success: false, error: "Invalid enabled value" });
    }
    
    autoDrawingService.setAutoDrawingEnabled(enabled);
    
    const config = autoDrawingService.getConfig();
    const countdown = autoDrawingService.getTimeUntilNextDrawing();
    
    const response: ApiResponse = {
      success: true,
      data: {
        enabled: config.enabled,
        nextScheduledTime: config.nextScheduledTime,
        countdown
      },
    };
    
    res.json(response);
  } catch (error) {
    console.error("Error setting auto-drawing enabled:", error);
    res.json({ success: false, error: "Failed to update auto-drawing setting" });
  }
};

export const triggerManualDrawing: RequestHandler = (req, res) => {
  try {
    const success = autoDrawingService.triggerManualDrawing();

    if (success) {
      const response: ApiResponse = {
        success: true,
        data: { message: "Manual drawing triggered successfully" },
      };
      res.json(response);
    } else {
      res.json({ success: false, error: "Failed to trigger manual drawing" });
    }
  } catch (error) {
    console.error("Error triggering manual drawing:", error);
    res.json({ success: false, error: "Failed to trigger manual drawing" });
  }
};

// In-memory storage for manual overrides
let manualOverrides = {
  title: "",
  date: "",
  time: ""
};

export const setManualOverrides: RequestHandler = (req, res) => {
  try {
    const { title, date, time } = req.body;

    if (title !== undefined) manualOverrides.title = title;
    if (date !== undefined) manualOverrides.date = date;
    if (time !== undefined) manualOverrides.time = time;

    const response: ApiResponse = {
      success: true,
      data: manualOverrides,
    };

    res.json(response);
  } catch (error) {
    console.error("Error setting manual overrides:", error);
    res.json({ success: false, error: "Failed to set manual overrides" });
  }
};

export const getManualOverrides: RequestHandler = (req, res) => {
  try {
    const response: ApiResponse = {
      success: true,
      data: manualOverrides,
    };

    res.json(response);
  } catch (error) {
    console.error("Error getting manual overrides:", error);
    res.json({ success: false, error: "Failed to get manual overrides" });
  }
};
