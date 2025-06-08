import dotenv from "dotenv";
dotenv.config();

import { REGION_SQS_MAP } from "../config/regionSqsClient";
import { REGION_QUEUE_URLS } from "../config/regionQueueUrls";
import { SendMessageBatchCommand } from "@aws-sdk/client-sqs";
import prisma from "../db/db";

export const runScheduler = async () => {
  const now = new Date();

  const dueMonitors = await prisma.monitor.findMany({
    where: {
      isPaused: false,
      isDeleted: false,
      lastCheckedAt: {
        lte: new Date(now.getTime() - 180 * 1000),
      },
    },
  });

  console.log("[dueMonitors]", dueMonitors);

  if (!dueMonitors.length) {
    console.log(`[${now.toISOString()}] No monitors to schedule.`);
    return;
  }

  const jobs = [];

  for (const monitor of dueMonitors) {
    for (const region of monitor.regions) {
      jobs.push({
        region,
        monitorId: monitor.id,
        url: monitor.url,
        method: monitor.method || "GET",
        expectedStatus: monitor.expectedStatus,
        timeout: monitor.timeout,
      });
    }
  }

  for (const job of jobs) {
    const entry = {
      Id: `${job.monitorId}-${Date.now()}`,
      MessageBody: JSON.stringify(job),
    };

    const queueUrl = REGION_QUEUE_URLS[job.region];

    console.log(
      `[${new Date().toISOString()}] Enqueuing 1 job to region: ${job.region}, queue: ${queueUrl}`,
    );

    try {
      await REGION_SQS_MAP[job.region].send(
        new SendMessageBatchCommand({
          QueueUrl: queueUrl,
          Entries: [entry],
        }),
      );

      console.log(
        `Successfully enqueued job to region: ${job.region}, queue: ${queueUrl}`,
      );
    } catch (error) {
      console.error(
        `Failed to enqueue job for region ${job.region}, queue: ${queueUrl}:`,
        error,
      );
    }
  }

  await Promise.all(
    dueMonitors.map(async (monitor) => {
      const updated = await prisma.monitor.update({
        where: { id: monitor.id },
        data: { lastCheckedAt: now },
      });
      console.log(`[Updated Monitor]`, updated);
    }),
  );

  console.log(
    `[${now.toISOString()}]  Scheduled ${jobs.length} jobs across all regions.`,
  );
};
