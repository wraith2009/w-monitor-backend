import { Router } from "express";
import {
  GetAllMonitorLogs,
  GetMonitorLogs,
} from "../controller/monitorLog.controller";

const MonitorLogRouter = Router();

MonitorLogRouter.route("/:monitorId/logs").get(GetMonitorLogs);
MonitorLogRouter.route("/logs").get(GetAllMonitorLogs);

export default MonitorLogRouter;
