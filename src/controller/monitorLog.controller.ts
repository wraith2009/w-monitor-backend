import prisma from "../db/db";
import { Request, Response } from "express";
import { apiResponse } from "../utils/responseHandler";

import {
  globalErrorHandler,
  ErrorFactory,
  BaseError,
} from "../utils/errorHandler";

export const GetMonitorLogs = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) throw ErrorFactory.unauthorized("User not authenticated");

    const { monitorId } = req.params;
    const { region, level, cursor, limit = "50" } = req.query;

    const parsedMonitorId = parseInt(monitorId, 10);
    if (isNaN(parsedMonitorId)) {
      throw ErrorFactory.notFound("Invalid monitorId");
    }

    const [monitor, dbUser] = await Promise.all([
      prisma.monitor.findUnique({
        where: { id: parsedMonitorId },
        select: { id: true, userId: true },
      }),
      prisma.user.findUnique({
        where: { id: user.userId },
        select: { subPlan: true },
      }),
    ]);

    if (!monitor || monitor.userId !== user.userId) {
      throw ErrorFactory.forbidden("Access denied to this monitor's logs");
    }

    if (!dbUser) throw ErrorFactory.notFound("User not found");

    const logWindowHours =
      dbUser.subPlan === "PREMIUM"
        ? 24
        : dbUser.subPlan === "ENTERPRISE"
          ? 164
          : 1;

    const cutoffDate = new Date(Date.now() - logWindowHours * 60 * 60 * 1000);

    const whereCondition: any = {
      monitorId: monitor.id,
      createdAt: { gte: cutoffDate },
    };
    if (region) whereCondition.region = region;
    if (level) whereCondition.level = level;

    const take = parseInt(limit as string, 10);

    const logs = await prisma.monitorLog.findMany({
      where: whereCondition,
      orderBy: { createdAt: "desc" },
      take: take + 1,
      ...(cursor
        ? { cursor: { id: parseInt(cursor as string, 10) }, skip: 1 }
        : {}),
    });

    let nextCursor: string | null = null;
    if (logs.length > take) {
      const nextItem = logs.pop(); // remove extra item
      nextCursor = nextItem?.id.toString() ?? null;
    }

    apiResponse(res, {
      statusCode: 200,
      message: "Logs fetched successfully",
      data: { logs, nextCursor },
    });
  } catch (error) {
    globalErrorHandler(error as BaseError, req, res);
  }
};

export const GetAllMonitorLogs = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) throw ErrorFactory.unauthorized("User not authenticated");

    const { region, level, monitorId, cursor, limit = "50" } = req.query;

    let parsedMonitorId: number | undefined;
    if (monitorId) {
      parsedMonitorId = parseInt(monitorId as string, 10);
      if (isNaN(parsedMonitorId)) {
        throw ErrorFactory.notFound("Invalid monitorId in query");
      }
    }

    const [dbUser, userMonitors] = await Promise.all([
      prisma.user.findUnique({
        where: { id: user.userId },
        select: { subPlan: true },
      }),
      prisma.monitor.findMany({
        where: { userId: user.userId },
        select: { id: true },
      }),
    ]);

    if (!dbUser) throw ErrorFactory.notFound("User not found");

    if (userMonitors.length === 0) {
      apiResponse(res, {
        statusCode: 200,
        message: "No monitors found for user",
        data: { logs: [], nextCursor: null },
      });
      return;
    }

    const logWindowHours =
      dbUser.subPlan === "PREMIUM"
        ? 24
        : dbUser.subPlan === "ENTERPRISE"
          ? 164
          : 1;

    const cutoffDate = new Date(Date.now() - logWindowHours * 60 * 60 * 1000);
    const userMonitorIds = userMonitors.map((m) => m.id);

    const whereCondition: any = {
      monitorId: parsedMonitorId ? parsedMonitorId : { in: userMonitorIds },
      createdAt: { gte: cutoffDate },
    };
    if (region) whereCondition.region = region;
    if (level) whereCondition.level = level;

    const take = parseInt(limit as string, 10);

    const logs = await prisma.monitorLog.findMany({
      where: whereCondition,
      orderBy: { createdAt: "desc" },
      take: take + 1,
      ...(cursor
        ? { cursor: { id: parseInt(cursor as string, 10) }, skip: 1 }
        : {}),
    });

    let nextCursor: string | null = null;
    if (logs.length > take) {
      const nextItem = logs.pop();
      nextCursor = nextItem?.id.toString() ?? null;
    }

    apiResponse(res, {
      statusCode: 200,
      message: "Logs fetched successfully",
      data: { logs, nextCursor },
    });
  } catch (error) {
    globalErrorHandler(error as BaseError, req, res);
  }
};
