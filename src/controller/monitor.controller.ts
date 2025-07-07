import prisma from "../db/db";
import { Request, Response } from "express";
import {
  globalErrorHandler,
  BaseError,
  ErrorFactory,
} from "../utils/errorHandler";
import { apiResponse } from "../utils/responseHandler";
import {
  CreateMonitorSchema,
  UpdateMonitorSchema,
  DeleteMonitorSchema,
} from "../utils/validators/register.validator";
import { generateSlug } from "../utils/slugGeneration";

export const RegisterMonitor = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      throw ErrorFactory.unauthorized("User not authenticated");
    }

    const [dbUser, monitorCount] = await Promise.all([
      prisma.user.findUnique({
        where: { id: user.userId },
        select: { subPlan: true },
      }),
      prisma.monitor.count({
        where: {
          userId: user.userId,
        },
      }),
    ]);

    if (!dbUser) {
      throw ErrorFactory.notFound("User record not found");
    }

    let maxMonitors: number | null = null;
    switch (dbUser.subPlan) {
      case "BASIC":
        maxMonitors = 2;
        break;
      case "PREMIUM":
        maxMonitors = 10;
        break;
      case "ENTERPRISE":
        maxMonitors = null;
        break;
      default:
        maxMonitors = 2;
    }

    if (maxMonitors !== null && monitorCount >= maxMonitors) {
      throw ErrorFactory.forbidden(
        `Monitor limit reached for your plan (${dbUser.subPlan}). Please upgrade to add more monitors.`,
      );
    }

    const validation = CreateMonitorSchema.safeParse(req.body);
    if (!validation.success) {
      throw ErrorFactory.validation(validation.error);
    }
    const data = validation.data;

    const monitor = await prisma.monitor.create({
      data: {
        websiteName: data.websiteName,
        url: data.url,
        method: data.method,
        expectedStatus: data.expectedStatus,
        interval: data.interval,
        timeout: data.timeout,
        isPaused: data.isPaused ?? false,
        regions: data.regions,
        lastCheckedAt: new Date(),
        user: {
          connect: { id: user.userId },
        },
      },
    });

    if (!monitor) {
      throw ErrorFactory.dbOperation("Unable to create monitor record");
    }

    void generateSlug(monitor.id);

    apiResponse(res, {
      statusCode: 201,
      message: "Monitor registered successfully",
      data: monitor,
    });
  } catch (error) {
    globalErrorHandler(error as BaseError, req, res);
  }
};

export const UpdateMonitor = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = req.user;
    const { id } = req.params;
    const validData = UpdateMonitorSchema.safeParse(req.body);

    if (!validData?.success) {
      throw ErrorFactory.validation(validData?.error);
    }

    const parsedData = validData?.data;

    const updated = prisma.monitor.update({
      where: {
        id: Number(id),
        userId: user?.userId,
      },
      data: {
        ...parsedData,
      },
    });

    if (!updated) {
      throw ErrorFactory.dbOperation("unable to update monitor entry");
    }

    apiResponse(res, {
      statusCode: 200,
      message: "updated website entry",
    });
  } catch (error) {
    globalErrorHandler(error as BaseError, req, res);
  }
};

export const DeleteMonitor = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = req.user;
    const { id } = req.params;

    const validData = DeleteMonitorSchema.safeParse(req.body);
    if (!validData?.success) {
      throw ErrorFactory.validation(validData?.error);
    }

    const ParsedData = validData?.data;

    const updated = await prisma.monitor.update({
      where: {
        id: Number(id),
        userId: user?.userId,
      },
      data: {
        ...ParsedData,
        isPaused: true,
      },
    });

    if (!updated) {
      throw ErrorFactory.conflict(
        "there seems to be a conflict while deleting this entry",
      );
    }

    apiResponse(res, {
      statusCode: 200,
      message: "deleted entry",
    });
  } catch (error) {
    globalErrorHandler(error as BaseError, req, res);
  }
};

export const FetchMonitor = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      throw ErrorFactory.unauthorized("Unauthorized access");
    }

    const monitors = await prisma.monitor.findMany({
      where: { userId: user.userId },
    });

    const monitorIds = monitors.map((m) => m.id);

    const [totalResults, upResults, avgResponseResults] = await Promise.all([
      prisma.monitorResult.groupBy({
        by: ["monitorId"],
        where: { monitorId: { in: monitorIds } },
        _count: { id: true },
      }),
      prisma.monitorResult.groupBy({
        by: ["monitorId"],
        where: { monitorId: { in: monitorIds }, isUp: true },
        _count: { id: true },
      }),
      prisma.monitorResult.groupBy({
        by: ["monitorId"],
        where: { monitorId: { in: monitorIds } },
        _avg: { responseTime: true },
      }),
    ]);

    const totalMap = new Map<number, number>();
    totalResults.forEach((r) => totalMap.set(r.monitorId, r._count.id));

    const upMap = new Map<number, number>();
    upResults.forEach((r) => upMap.set(r.monitorId, r._count.id));

    const avgResponseMap = new Map<number, number | null>();
    avgResponseResults.forEach((r) =>
      avgResponseMap.set(r.monitorId, r._avg.responseTime),
    );

    const monitorsWithStats = monitors.map((monitor) => {
      const total = totalMap.get(monitor.id) || 0;
      const up = upMap.get(monitor.id) || 0;
      const uptimePercentage = total > 0 ? (up / total) * 100 : null;
      const averageResponseTime = avgResponseMap.get(monitor.id) ?? null;

      return {
        ...monitor,
        uptimePercentage,
        averageResponseTime,
      };
    });

    apiResponse(res, {
      statusCode: 200,
      message:
        "Monitors fetched successfully with uptime % and avg response time",
      data: monitorsWithStats,
    });
  } catch (error) {
    globalErrorHandler(error as BaseError, req, res);
  }
};

export const addMonitorRecipient = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const user = req.user;
  const { monitorId } = req.params;
  const { email } = req.body;

  if (!email || typeof email !== "string") {
    throw ErrorFactory.notFound("Email not provided or invalid type");
  }

  try {
    const parsedMonitorId = parseInt(monitorId, 10);
    if (isNaN(parsedMonitorId)) {
      throw ErrorFactory.notFound("Invalid monitorId");
    }

    const [existingMonitor, dbUser, recipientCount] = await Promise.all([
      prisma.monitor.findUnique({
        where: {
          id: parsedMonitorId,
          userId: user?.userId,
        },
      }),
      prisma.user.findUnique({
        where: { id: user?.userId },
        select: { subPlan: true },
      }),
      prisma.monitorAlertRecipient.count({
        where: {
          monitorId: parsedMonitorId,
        },
      }),
    ]);

    if (!existingMonitor) {
      throw ErrorFactory.notFound("Monitor not found");
    }

    if (!dbUser) {
      throw ErrorFactory.notFound("User not found");
    }

    const maxRecipients =
      dbUser.subPlan === "PREMIUM"
        ? 3
        : dbUser.subPlan === "ENTERPRISE"
          ? 10
          : 1;

    if (recipientCount >= maxRecipients) {
      throw ErrorFactory.forbidden(
        `Recipient limit reached for your plan (${dbUser.subPlan}). Upgrade your plan to add more recipients.`,
      );
    }

    await prisma.monitorAlertRecipient.create({
      data: {
        email,
        monitorId: parsedMonitorId,
      },
    });

    apiResponse(res, {
      statusCode: 201,
      message: "Recipient added successfully",
    });
  } catch (error) {
    globalErrorHandler(error as BaseError, req, res);
  }
};

export const removeMonitorRecipient = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const user = req.user;
  const { monitorId } = req.params;

  const { email } = req.body;
  if (!email || typeof email !== "string") {
    throw ErrorFactory.notFound("Invalid email parameter");
  }

  try {
    const existingMonitor = await prisma.monitor.findUnique({
      where: {
        id: parseInt(monitorId),
        userId: user?.userId,
      },
    });

    if (!existingMonitor) {
      throw ErrorFactory.notFound("Monitor not found or not authorized");
    }

    const recipient = await prisma.monitorAlertRecipient.findFirst({
      where: {
        monitorId: parseInt(monitorId),
        email,
      },
    });

    if (!recipient) {
      throw ErrorFactory.notFound("Recipient not found for this monitor");
    }

    await prisma.monitorAlertRecipient.delete({
      where: {
        id: recipient.id,
      },
    });

    apiResponse(res, {
      statusCode: 200,
      message: "Recipient removed successfully",
    });
  } catch (error) {
    globalErrorHandler(error as BaseError, req, res);
  }
};

export const getMonitorRecipient = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = req.user;
    const { monitorId } = req.params;

    if (!user) {
      throw ErrorFactory.unauthorized("User not authenticated");
    }

    const parsedMonitorId = parseInt(monitorId, 10);
    if (isNaN(parsedMonitorId)) {
      throw ErrorFactory.notFound("Invalid monitorId provided");
    }

    const monitor = await prisma.monitor.findFirst({
      where: {
        id: parsedMonitorId,
        userId: user.userId,
        isDeleted: false,
      },
      select: {
        id: true,
        websiteName: true,
        url: true,
      },
    });

    if (!monitor) {
      throw ErrorFactory.notFound("Monitor not found or access denied");
    }

    const recipients = await prisma.monitorAlertRecipient.findMany({
      where: {
        monitorId: monitor.id,
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    apiResponse(res, {
      statusCode: 200,
      message: "Monitor recipients fetched successfully",
      data: {
        monitorId: monitor.id,
        monitorName: monitor.websiteName,
        monitorUrl: monitor.url,
        recipients,
      },
    });
  } catch (error) {
    globalErrorHandler(error as BaseError, req, res);
  }
};
