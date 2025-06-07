import dotenv from "dotenv";
dotenv.config();

import { REGION_SQS_MAP } from "../config/regionSqsClient";
import { REGION_QUEUE_URLS } from "../config/regionQueueUrls";
import { SendMessageBatchCommand } from "@aws-sdk/client-sqs";
import { jobPayloads } from "../types/user.types";
import prisma from "../db/db";

function chunkArray<T>(arr: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size),
  );
}

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

  for (const monitor of dueMonitors) {
    for (const region of monitor.regions) {
      jobPayloads.push({
        region,
        monitorId: monitor.id,
        url: monitor.url,
        method: monitor.method || "GET",
        expectedStatus: monitor.expectedStatus,
        timeout: monitor.timeout,
      });
    }
  }

  const grouped = jobPayloads.reduce(
    (acc, job) => {
      acc[job.region] = acc[job.region] || [];
      acc[job.region].push(job);
      return acc;
    },
    {} as Record<string, typeof jobPayloads>,
  );

  for (const region of Object.keys(grouped)) {
    const regionJobs = grouped[region];
    const batches = chunkArray(regionJobs, 10);

    for (const batch of batches) {
      const entries = batch.map((job, i) => ({
        Id: `${job.monitorId}-${i}`,
        MessageBody: JSON.stringify(job),
      }));

      try {
        await REGION_SQS_MAP[region].send(
          new SendMessageBatchCommand({
            QueueUrl: REGION_QUEUE_URLS[region],
            Entries: entries,
          }),
        );
      } catch (error) {
        console.error(`Failed to enqueue jobs for region ${region}:`, error);
      }
    }
  }

  await Promise.all(
    dueMonitors.map((monitor) =>
      prisma.monitor.update({
        where: { id: monitor.id },
        data: { lastCheckedAt: now },
      }),
    ),
  );

  console.log(`[${now.toISOString()}] Scheduled ${jobPayloads.length} jobs.`);
};
