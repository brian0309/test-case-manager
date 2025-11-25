import { Request, Response } from "express";
import * as exampleService from "../services/example.service.js";
import { User } from "../../../models/user.model.js";

/**
 * GET /api/example/example
 * Returns a hello world message
 * Protected route - requires authentication
 */
export const getExample = async (req: Request, res: Response): Promise<void> => {
  try {
    // userId is set by verifyToken middleware
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized - User ID not found",
      });
      return;
    }

    // Fetch user details
    const user = await User.findById(userId).select("email");

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // Get hello world message from service
    const result = exampleService.getHelloWorld(userId, user.email);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error in getExample:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
