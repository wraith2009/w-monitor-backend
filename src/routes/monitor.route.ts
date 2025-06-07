import { Router } from "express";
import {
  DeleteMonitor,
  FetchMonitor,
  RegisterMonitor,
  UpdateMonitor,
} from "../controller/register.controller";

const MonitorRouter = Router();

MonitorRouter.route("/register-monitor").post(RegisterMonitor);
MonitorRouter.route("/update-monitor/:id").put(UpdateMonitor);
MonitorRouter.route("/delete-monitor/:id").put(DeleteMonitor);
MonitorRouter.route("/get-monitor").get(FetchMonitor);

export default MonitorRouter;
