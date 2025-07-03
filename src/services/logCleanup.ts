import cron from "node-cron";
import prisma from "../db/db";

function getSevenDaysAgoDate(): Date {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
}

async function cleanupLogs() {
  console.log(`[${new Date().toISOString()}] Starting log cleanup job...`);
  const cutoffDate = getSevenDaysAgoDate();

  try {
    const deleted = await prisma.monitorLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    console.log(
      `[${new Date().toISOString()}] Log cleanup complete. Deleted ${deleted.count} entries older than 7 days.`,
    );
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Log cleanup failed:`, error);
  }
}

export const startLogCleanupJob = () => {
  cron.schedule("0 0 * * *", cleanupLogs);

  void cleanupLogs();
};
