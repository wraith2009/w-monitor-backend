import { Request, Response } from "express";
import prisma from "../db/db";
import { z } from "zod";
import { apiResponse } from "../utils/responseHandler";
import {
  ErrorFactory,
  BaseError,
  globalErrorHandler,
} from "../utils/errorHandler";

const ResultPayloadSchema = z.object({
  monitorId: z.number(),
  region: z.string(),
  statusCode: z.number().optional(),
  isUp: z.boolean(),
  responseTime: z.number(),
  errorMessage: z.string().optional(),
});

export const saveMonitorResult = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (
      !authHeader ||
      authHeader !== `Bearer ${process.env.INTERNAL_API_SECRET}`
    ) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    const result = ResultPayloadSchema.safeParse(req.body);
    if (!result.success) {
      throw ErrorFactory.validation(result.error);
    }

    const { monitorId, region, statusCode, isUp, responseTime, errorMessage } =
      result.data;

    await prisma.monitorResult.create({
      data: {
        monitorId,
        region,
        isUp,
        statusCode,
        responseTime,
        errorMessage,
      },
    });

    await prisma.monitorLog.create({
      data: {
        monitorId,
        region,
        level: isUp ? "INFO" : "ERROR",
        message: isUp
          ? `Monitor responded with status ${statusCode}`
          : `Monitor failed: ${errorMessage}`,
        meta: { responseTime, statusCode },
      },
    });

    if (!isUp) {
      const activeIncident = await prisma.incident.findFirst({
        where: {
          monitorId,
          status: "OPEN",
        },
      });

      if (!activeIncident) {
        await prisma.incident.create({
          data: {
            monitorId,
            status: "OPEN",
            summary: `Downtime detected from ${region}`,
          },
        });
      }
    } else {
      await prisma.incident.updateMany({
        where: {
          monitorId,
          status: "OPEN",
        },
        data: {
          status: "RESOLVED",
          resolvedAt: new Date(),
        },
      });
    }

    return apiResponse(res, {
      statusCode: 200,
      message: "Monitor result saved",
    });
  } catch (error) {
    globalErrorHandler(error as BaseError, req, res);
  }
};
