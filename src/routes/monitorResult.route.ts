import { Router } from "express";
import { saveMonitorResult } from "../worker/jobWorker";

const MonitorResultRouter = Router();

MonitorResultRouter.route("/save-result").post(saveMonitorResult);

export default MonitorResultRouter;
