import dotenv from "dotenv";
dotenv.config();

import { Request, Response, NextFunction } from "express";
import express from "express";
import cron from "node-cron";
import { runScheduler } from "./scheduler/runScheduler";

const app = express();

app.use(express.json());

// Routes
import AuthRouter from "./routes/auth.route";
import MonitorRouter from "./routes/monitor.route";
import { verifyRequest } from "./middleware/auth.middleware";
import MonitorResultRouter from "./routes/monitorResult.route";

app.use("/api", MonitorResultRouter);
app.use("/api", AuthRouter);
app.use("/api", verifyRequest, MonitorRouter);

app.get("/", (_, res: Response) => {
  res.send("Server running");
});

app.use((req: Request, res: Response, next: NextFunction) => {
  const error: any = new Error("Not found");
  error.status = 404;
  next(error);
});

app.use((error: any, req: Request, res: Response) => {
  console.error(error);
  res.status(error.status || 500);
  res.json({
    error: {
      message: error.message,
      status: error.status || 500,
    },
  });
});

cron.schedule("* * * * *", async () => {
  console.log(`[Scheduler] Tick at ${new Date().toISOString()}`);
  await runScheduler();
});

export default app;
