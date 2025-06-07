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
        user: {
          connect: { id: user.id },
        },
      },
    });

    if (!monitor) {
      throw ErrorFactory.dbOperation("unable to create monitor record");
    }

    void generateSlug(monitor?.id);

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
        userId: user?.id,
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
        userId: user?.id,
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
      throw ErrorFactory.unauthorized("unauthorized access");
    }

    const websiteData = await prisma.monitor.findMany({
      where: {
        userId: user?.id,
      },
    });

    apiResponse(res, {
      statusCode: 200,
      message: "website fetched successfully",
      data: websiteData,
    });
  } catch (error) {
    globalErrorHandler(error as BaseError, req, res);
  }
};
