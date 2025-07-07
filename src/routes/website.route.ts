import {
  GetWebsiteExtendedUptimeTrend,
  GetWebsiteUptimeTrend,
} from "./../controller/website.controller";
import { Router } from "express";
import {
  GetWebsiteDashboardStats,
  GetWebsiteRegionStats,
} from "../controller/website.controller";

const WebsiteRouter = Router();

WebsiteRouter.route("/stats/:slug").get(GetWebsiteDashboardStats);
WebsiteRouter.route("/region-stats/:slug").get(GetWebsiteRegionStats);
WebsiteRouter.route("/uptime-trend/:slug").get(GetWebsiteUptimeTrend);
WebsiteRouter.route("/extended-uptime-trend/:monitorId").get(
  GetWebsiteExtendedUptimeTrend,
);

export default WebsiteRouter;
