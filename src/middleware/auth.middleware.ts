import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UserPayload } from "../types/user.types";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

declare module "express" {
  export interface Request {
    user?: UserPayload;
  }
}

export const verifyRequest = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      res.status(401).json({ message: "Unauthorized User: Token is missing" });
      return;
    }

    if (!JWT_SECRET) {
      res
        .status(500)
        .json({ message: "Server configuration error: Missing JWT_SECRET" });
      return;
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);

      if (
        typeof decoded === "object" &&
        decoded !== null &&
        "email" in decoded &&
        "userId" in decoded &&
        "subPlan" in decoded &&
        "isEmailVerified" in decoded
      ) {
        if (!decoded.isEmailVerified) {
          res.status(403).json({
            message:
              "Email not verified. Please verify your email to continue.",
          });
          return;
        }
        req.user = decoded as UserPayload;
        next();
      } else {
        res.status(401).json({ message: "Invalid Token Structure" });
        return;
      }
    } catch (error) {
      console.error("Token verification error:", error);
      res.status(401).json({ message: "Invalid Token" });
      return;
    }
  } catch (error) {
    console.error("Request verification error:", error);
    res.status(500).json({
      message: "Internal server error during request verification",
    });
  }
};
