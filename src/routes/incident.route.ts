import { Router } from "express";
import {
  CreateIncident,
  GetIncidentById,
  ListIncidents,
  ResolveIncident,
  GetIncidentTimeline,
  GetIncidentSummary,
} from "../controller/incident.controller";

const IncidentRouter = Router();

IncidentRouter.route("").post(CreateIncident);
IncidentRouter.route("").get(ListIncidents);
IncidentRouter.route("/:id").get(GetIncidentById);
IncidentRouter.route("/:id/resolve").patch(ResolveIncident);
IncidentRouter.route("/timeline/:monitorId").get(GetIncidentTimeline);
IncidentRouter.route("/summary/:monitorId").get(GetIncidentSummary);

export default IncidentRouter;
