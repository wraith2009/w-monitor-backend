import { Router } from "express";
import {
  addMonitorRecipient,
  DeleteMonitor,
  FetchMonitor,
  getMonitorRecipient,
  RegisterMonitor,
  removeMonitorRecipient,
  UpdateMonitor,
} from "../controller/monitor.controller";

const MonitorRouter = Router();

MonitorRouter.route("/register-monitor").post(RegisterMonitor);
MonitorRouter.route("/update-monitor/:id").put(UpdateMonitor);
MonitorRouter.route("/delete-monitor/:id").put(DeleteMonitor);
MonitorRouter.route("/get-monitor").get(FetchMonitor);
MonitorRouter.route("/monitors/:monitorId/recipients").post(
  addMonitorRecipient,
);
MonitorRouter.route("/monitors/:monitorId/recipients").delete(
  removeMonitorRecipient,
);
MonitorRouter.route("/monitors/:monitorId").get(getMonitorRecipient);
export default MonitorRouter;
