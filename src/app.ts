import dotenv from "dotenv";
dotenv.config();

import { Request, Response, NextFunction } from "express";
import express from "express";
import cron from "node-cron";
import { runScheduler } from "./scheduler/runScheduler";
import cors from "cors";
import { startLogCleanupJob } from "./services/logCleanup";

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://w-monitor-frontend.vercel.app",
];

const corsOptions = {
  origin: function (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
// app.options("*", cors(corsOptions));

app.use(express.json());

// Routes
import AuthRouter from "./routes/auth.route";
import MonitorRouter from "./routes/monitor.route";
import { verifyRequest } from "./middleware/auth.middleware";
import MonitorResultRouter from "./routes/monitorResult.route";
import DashboardRouter from "./routes/dashboard.route";
import IncidentRouter from "./routes/incident.route";
import WebsiteRouter from "./routes/website.route";
import MonitorLogRouter from "./routes/monitorLog.route";

app.use("/api", MonitorResultRouter);
app.use("/api", AuthRouter);
app.use("/api/websites", WebsiteRouter);
app.use("/api", verifyRequest, MonitorRouter);
app.use("/api/Dashboard", verifyRequest, DashboardRouter);
app.use("/api/incidents", verifyRequest, IncidentRouter);
app.use("/api/monitor", verifyRequest, MonitorLogRouter);
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

console.log("[reached cleanup]");
startLogCleanupJob();

cron.schedule("* * * * *", async () => {
  console.log(`[Scheduler] Tick at ${new Date().toISOString()}`);
  await runScheduler();
});

export default app;
