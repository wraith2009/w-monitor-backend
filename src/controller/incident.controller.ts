import prisma from "../db/db";
import { Request, Response } from "express";
import { apiResponse } from "../utils/responseHandler";
import {
  globalErrorHandler,
  ErrorFactory,
  BaseError,
} from "../utils/errorHandler";

export const CreateIncident = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = req.user;
    const { monitorId, summary } = req.body;

    if (!user) throw ErrorFactory.unauthorized("User not authenticated");
    if (!monitorId) throw ErrorFactory.notFound("Monitor ID is required");

    const monitor = await prisma.monitor.findFirst({
      where: {
        id: monitorId,
        userId: user.userId,
        isDeleted: false,
      },
    });
    if (!monitor) throw ErrorFactory.notFound("Monitor not found");

    const incident = await prisma.incident.create({
      data: {
        monitorId,
        summary,
      },
    });

    apiResponse(res, {
      statusCode: 201,
      message: "Incident created successfully",
      data: incident,
    });
  } catch (error) {
    globalErrorHandler(error as BaseError, req, res);
  }
};

export const ListIncidents = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = req.user;
    const { monitorId, status, region, month, year } = req.query;

    if (!user) throw ErrorFactory.unauthorized("User not authenticated");

    const filters: any = {
      monitor: {
        userId: user.userId,
        isDeleted: false,
      },
      ...(monitorId ? { monitorId: Number(monitorId) } : {}),
      ...(status ? { status: String(status) } : {}),
      ...(region
        ? { summary: { contains: String(region), mode: "insensitive" } }
        : {}),
    };

    if (month && year) {
      const monthNumber = Number(month);
      const yearNumber = Number(year);

      if (
        isNaN(monthNumber) ||
        monthNumber < 1 ||
        monthNumber > 12 ||
        isNaN(yearNumber)
      ) {
        throw ErrorFactory.notFound("Invalid month or year for filtering.");
      }

      const startDate = new Date(yearNumber, monthNumber - 1, 1);
      const endDate = new Date(yearNumber, monthNumber, 0, 23, 59, 59, 999);

      filters.startedAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    const incidents = await prisma.incident.findMany({
      where: filters,
      orderBy: { startedAt: "desc" },
    });

    apiResponse(res, {
      statusCode: 200,
      message: "Incidents fetched successfully",
      data: incidents,
    });
  } catch (error) {
    globalErrorHandler(error as BaseError, req, res);
  }
};

export const GetIncidentById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = req.user;
    const { id } = req.params;

    if (!user) throw ErrorFactory.unauthorized("User not authenticated");

    const incident = await prisma.incident.findFirst({
      where: {
        id: Number(id),
        monitor: {
          userId: user.userId,
          isDeleted: false,
        },
      },
    });

    if (!incident) throw ErrorFactory.notFound("Incident not found");

    apiResponse(res, {
      statusCode: 200,
      message: "Incident fetched successfully",
      data: incident,
    });
  } catch (error) {
    globalErrorHandler(error as BaseError, req, res);
  }
};

export const ResolveIncident = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { summary } = req.body;

    if (!user) throw ErrorFactory.unauthorized("User not authenticated");

    const incident = await prisma.incident.update({
      where: { id: Number(id) },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date(),
        summary,
      },
    });

    apiResponse(res, {
      statusCode: 200,
      message: "Incident resolved successfully",
      data: incident,
    });
  } catch (error) {
    globalErrorHandler(error as BaseError, req, res);
  }
};

export const GetIncidentTimeline = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = req.user;
    const { monitorId } = req.params;

    if (!user) throw ErrorFactory.unauthorized("User not authenticated");

    const timeline = await prisma.incident.findMany({
      where: {
        monitorId: Number(monitorId),
        monitor: {
          userId: user.userId,
          isDeleted: false,
        },
      },
      orderBy: { startedAt: "desc" },
    });

    apiResponse(res, {
      statusCode: 200,
      message: "Incident timeline fetched",
      data: timeline,
    });
  } catch (error) {
    globalErrorHandler(error as BaseError, req, res);
  }
};

export const GetIncidentSummary = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = req.user;
    const { monitorId } = req.params;

    if (!user) throw ErrorFactory.unauthorized("User not authenticated");

    const [total, open, resolved] = await Promise.all([
      prisma.incident.count({ where: { monitorId: Number(monitorId) } }),
      prisma.incident.count({
        where: { monitorId: Number(monitorId), status: "OPEN" },
      }),
      prisma.incident.count({
        where: { monitorId: Number(monitorId), status: "RESOLVED" },
      }),
    ]);

    const downtimes = await prisma.incident.findMany({
      where: {
        monitorId: Number(monitorId),
        resolvedAt: {
          not: null,
        },
      },
      select: {
        startedAt: true,
        resolvedAt: true,
      },
    });

    const totalDowntimeMinutes = downtimes.reduce((acc, curr) => {
      return (
        acc + (curr.resolvedAt!.getTime() - curr.startedAt.getTime()) / 60000
      );
    }, 0);

    const avgDowntimeMinutes =
      downtimes.length > 0
        ? Number((totalDowntimeMinutes / downtimes.length).toFixed(2))
        : 0;

    apiResponse(res, {
      statusCode: 200,
      message: "Incident summary fetched",
      data: {
        totalIncidents: total,
        openIncidents: open,
        resolvedIncidents: resolved,
        avgDowntimeMinutes,
        totalDowntimeMinutes,
      },
    });
  } catch (error) {
    globalErrorHandler(error as BaseError, req, res);
  }
};
