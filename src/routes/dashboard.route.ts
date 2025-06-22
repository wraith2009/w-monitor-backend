import { Router } from "express";
import {
  GetDashboardStats,
  GetRegionStats,
  GetUptimeTrend,
} from "../controller/dashboard.controller";

const DashboardRouter = Router();

DashboardRouter.route("/stats").get(GetDashboardStats);
DashboardRouter.route("/region-stats").get(GetRegionStats);
DashboardRouter.route("/uptime-trend").get(GetUptimeTrend);

export default DashboardRouter;
