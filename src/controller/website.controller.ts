import prisma from "../db/db";
import { Request, Response } from "express";
import { apiResponse } from "../utils/responseHandler";
import {
  globalErrorHandler,
  ErrorFactory,
  BaseError,
} from "../utils/errorHandler";

export const GetWebsiteDashboardStats = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { slug } = req.params;

    if (!slug) {
      throw ErrorFactory.forbidden("Can not proceed further without slug");
    }

    const monitor = await prisma.monitor.findFirst({
      where: {
        slug: slug,
        isDeleted: false,
      },
    });

    if (!monitor) {
      throw ErrorFactory.notFound("Monitor not found");
    }

    const [totalResults, upResults, avgResponse, totalIncidents] =
      await Promise.all([
        prisma.monitorResult.count({
          where: {
            monitorId: monitor?.id,
          },
        }),
        prisma.monitorResult.count({
          where: {
            monitorId: monitor?.id,
            isUp: true,
          },
        }),
        prisma.monitorResult.aggregate({
          _avg: { responseTime: true },
          where: {
            monitorId: monitor?.id,
            isUp: true,
          },
        }),
        prisma.incident.count({
          where: {
            monitorId: monitor?.id,
          },
        }),
      ]);

    const regionStats: Record<string, number> = {};
    monitor.regions.forEach((region) => {
      regionStats[region] = 1;
    });

    const stats = {
      monitorId: monitor.id,
      monitorName: monitor.websiteName,
      monitorUrl: monitor.url,
      overallUptime: totalResults === 0 ? 0 : (upResults / totalResults) * 100,
      averageResponseTime: avgResponse._avg.responseTime ?? 0,
      activeMonitorsByRegion: regionStats,
      totalIncidents,
      totalChecks: totalResults,
      successfulChecks: upResults,
    };

    apiResponse(res, {
      statusCode: 200,
      message: "Website dashboard stats fetched successfully",
      data: stats,
    });
  } catch (error) {
    globalErrorHandler(error as BaseError, req, res);
  }
};

export const GetWebsiteRegionStats = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = req.user;
    const { monitorId } = req.params;

    if (!user) throw ErrorFactory.unauthorized("User not authenticated");

    if (!monitorId) {
      throw ErrorFactory.notFound("Monitor ID is required");
    }

    const monitor = await prisma.monitor.findFirst({
      where: {
        id: parseInt(monitorId),
        userId: user.userId,
        isDeleted: false,
      },
    });

    if (!monitor) {
      throw ErrorFactory.notFound("Monitor not found");
    }

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const results = await prisma.monitorResult.findMany({
      where: {
        monitorId: parseInt(monitorId),
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
      message: "Website region stats fetched successfully",
      data: {
        monitorId: monitor.id,
        monitorName: monitor.websiteName,
        monitorUrl: monitor.url,
        regionStats: data,
      },
    });
  } catch (error) {
    globalErrorHandler(error as BaseError, req, res);
  }
};

export const GetWebsiteUptimeTrend = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = req.user;
    const { monitorId } = req.params;

    if (!user) throw ErrorFactory.unauthorized("User not authenticated");

    if (!monitorId) {
      throw ErrorFactory.notFound("Monitor ID is required");
    }

    const monitor = await prisma.monitor.findFirst({
      where: {
        id: parseInt(monitorId),
        userId: user.userId,
        isDeleted: false,
      },
    });

    if (!monitor) {
      throw ErrorFactory.notFound("Monitor not found");
    }

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const results = await prisma.monitorResult.findMany({
      where: {
        monitorId: parseInt(monitorId),
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
      message: "Website 24h uptime trend fetched successfully",
      data: {
        monitorId: monitor.id,
        monitorName: monitor.websiteName,
        monitorUrl: monitor.url,
        trend,
      },
    });
  } catch (error) {
    globalErrorHandler(error as BaseError, req, res);
  }
};

export const GetWebsiteExtendedUptimeTrend = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = req.user;
    const { monitorId } = req.params;
    const { timeRange = "7d" } = req.query;

    if (!user) throw ErrorFactory.unauthorized("User not authenticated");

    if (!monitorId) {
      throw ErrorFactory.notFound("Monitor ID is required");
    }

    const monitor = await prisma.monitor.findFirst({
      where: {
        id: parseInt(monitorId),
        userId: user.userId,
        isDeleted: false,
      },
    });

    if (!monitor) {
      throw ErrorFactory.notFound("Monitor not found");
    }

    const now = new Date();
    let daysBack: number;
    let bucketSize: string;

    switch (timeRange) {
      case "7d":
        daysBack = 7;
        bucketSize = "day";
        break;
      case "30d":
        daysBack = 30;
        bucketSize = "day";
        break;
      case "90d":
        daysBack = 90;
        bucketSize = "day";
        break;
      default:
        daysBack = 7;
        bucketSize = "day";
    }

    const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

    const results = await prisma.monitorResult.findMany({
      where: {
        monitorId: parseInt(monitorId),
        checkedAt: {
          gte: startDate,
        },
      },
      select: {
        isUp: true,
        responseTime: true,
        checkedAt: true,
      },
    });

    const buckets: Record<string, { up: number; total: number }> = {};

    for (let i = 0; i < daysBack; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const label = date.toISOString().split("T")[0]; // YYYY-MM-DD format
      buckets[label] = { up: 0, total: 0 };
    }

    results.forEach((result) => {
      const date = new Date(result.checkedAt);
      const label = date.toISOString().split("T")[0];

      if (!buckets[label]) return;

      buckets[label].total += 1;
      if (result.isUp) buckets[label].up += 1;
    });

    const trend = Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        uptime:
          data.total === 0
            ? null
            : Number(((data.up / data.total) * 100).toFixed(2)),
        totalChecks: data.total,
        successfulChecks: data.up,
      }));

    apiResponse(res, {
      statusCode: 200,
      message: `Website ${timeRange} uptime trend fetched successfully`,
      data: {
        monitorId: monitor.id,
        monitorName: monitor.websiteName,
        monitorUrl: monitor.url,
        timeRange,
        trend,
      },
    });
  } catch (error) {
    globalErrorHandler(error as BaseError, req, res);
  }
};
