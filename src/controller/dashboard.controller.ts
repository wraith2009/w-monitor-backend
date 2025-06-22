import prisma from "../db/db";
import { Request, Response } from "express";
import { apiResponse } from "../utils/responseHandler";
import {
  globalErrorHandler,
  ErrorFactory,
  BaseError,
} from "../utils/errorHandler";

export const GetDashboardStats = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      throw ErrorFactory.unauthorized("User not authenticated");
    }

    const [totalResults, upResults, avgResponse, totalIncidents, monitors] =
      await Promise.all([
        prisma.monitorResult.count({
          where: {
            monitor: {
              userId: user.userId,
            },
          },
        }),
        prisma.monitorResult.count({
          where: {
            isUp: true,
            monitor: {
              userId: user.userId,
            },
          },
        }),
        prisma.monitorResult.aggregate({
          _avg: { responseTime: true },
          where: {
            isUp: true,
            monitor: {
              userId: user.userId,
            },
          },
        }),
        prisma.incident.count({
          where: {
            monitor: {
              userId: user.userId,
            },
          },
        }),
        prisma.monitor.findMany({
          where: {
            userId: user.userId,
            isPaused: false,
            isDeleted: false,
          },
          select: {
            regions: true,
          },
        }),
      ]);

    const regionStats: Record<string, number> = {};
    monitors.forEach(({ regions }) => {
      regions.forEach((r) => {
        regionStats[r] = (regionStats[r] || 0) + 1;
      });
    });

    const stats = {
      overallUptime: totalResults === 0 ? 0 : (upResults / totalResults) * 100,
      averageResponseTime: avgResponse._avg.responseTime ?? 0,
      activeMonitorsByRegion: regionStats,
      totalIncidents,
    };

    apiResponse(res, {
      statusCode: 200,
      message: "Dashboard stats fetched successfully",
      data: stats,
    });
  } catch (error) {
    globalErrorHandler(error as BaseError, req, res);
  }
};

export const GetRegionStats = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) throw ErrorFactory.unauthorized("User not authenticated");

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const results = await prisma.monitorResult.findMany({
      where: {
        monitor: {
          userId: user.userId,
          isDeleted: false,
        },
        checkedAt: {
          gte: twentyFourHoursAgo,
        },
      },
      select: {
        region: true,
        isUp: true,
        responseTime: true,
        checkedAt: true,
      },
      orderBy: {
        checkedAt: "desc",
      },
    });

    const regionMap: Record<
      string,
      {
        total: number;
        up: number;
        totalResponse: number;
        countResponse: number;
        latestStatus?: boolean;
      }
    > = {};

    for (const result of results) {
      const { region, isUp, responseTime } = result;
      if (!regionMap[region]) {
        regionMap[region] = {
          total: 0,
          up: 0,
          totalResponse: 0,
          countResponse: 0,
          latestStatus: isUp,
        };
      }

      const group = regionMap[region];
      group.total += 1;
      if (isUp) group.up += 1;
      if (responseTime !== null && isUp) {
        group.totalResponse += responseTime;
        group.countResponse += 1;
      }
    }

    const data = Object.entries(regionMap).map(([region, stats]) => ({
      region,
      uptime:
        stats.total === 0
          ? 0
          : Number(((stats.up / stats.total) * 100).toFixed(2)),
      avgResponse:
        stats.countResponse === 0
          ? null
          : Math.round(stats.totalResponse / stats.countResponse),
      status: stats.latestStatus ? "Up" : "Down",
    }));

    apiResponse(res, {
      statusCode: 200,
      message: "Region stats fetched successfully",
      data,
    });
  } catch (error) {
    globalErrorHandler(error as BaseError, req, res);
  }
};

export const GetUptimeTrend = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) throw ErrorFactory.unauthorized("User not authenticated");

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const results = await prisma.monitorResult.findMany({
      where: {
        monitor: {
          userId: user.userId,
          isDeleted: false,
        },
        checkedAt: {
          gte: twentyFourHoursAgo,
        },
      },
      select: {
        isUp: true,
        responseTime: true,
        checkedAt: true,
      },
    });

    const buckets: Record<string, { up: number; total: number }> = {};

    for (let i = 0; i < 24; i++) {
      const label = `${i.toString().padStart(2, "0")}:00`;
      buckets[label] = { up: 0, total: 0 };
    }

    results.forEach((result) => {
      const date = new Date(result.checkedAt);
      const hour = date.getHours();
      const label = `${hour.toString().padStart(2, "0")}:00`;

      if (!buckets[label]) return;

      buckets[label].total += 1;
      if (result.isUp) buckets[label].up += 1;
    });

    const trend = Object.entries(buckets).map(([hour, data]) => ({
      hour,
      uptime:
        data.total === 0
          ? null
          : Number(((data.up / data.total) * 100).toFixed(2)),
    }));

    apiResponse(res, {
      statusCode: 200,
      message: "24h uptime trend fetched successfully",
      data: trend,
    });
  } catch (error) {
    globalErrorHandler(error as BaseError, req, res);
  }
};
