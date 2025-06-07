import { z } from "zod";

export enum Region {
  US_EAST_1 = "us-east-1",
  US_EAST_2 = "us-east-2",
  US_WEST_1 = "us-west-1",
  US_WEST_2 = "us-west-2",

  EU_WEST_1 = "eu-west-1",
  EU_WEST_2 = "eu-west-2",
  EU_WEST_3 = "eu-west-3",
  EU_CENTRAL_1 = "eu-central-1",
  EU_NORTH_1 = "eu-north-1",
  EU_SOUTH_1 = "eu-south-1",
  EU_SOUTH_2 = "eu-south-2",

  AP_SOUTH_1 = "ap-south-1",
  AP_SOUTH_2 = "ap-south-2",
  AP_NORTHEAST_1 = "ap-northeast-1",
  AP_NORTHEAST_2 = "ap-northeast-2",
  AP_NORTHEAST_3 = "ap-northeast-3",
  AP_SOUTHEAST_1 = "ap-southeast-1",
  AP_SOUTHEAST_2 = "ap-southeast-2",
  AP_EAST_1 = "ap-east-1",

  CA_CENTRAL_1 = "ca-central-1",

  SA_EAST_1 = "sa-east-1",

  ME_SOUTH_1 = "me-south-1",
  ME_CENTRAL_1 = "me-central-1",

  AF_SOUTH_1 = "af-south-1",
}

export const CreateMonitorSchema = z.object({
  websiteName: z.string().min(1),
  url: z.string().url(),
  method: z.enum(["GET", "POST", "PUT", "DELETE", "HEAD"]).default("GET"),
  expectedStatus: z.number().min(100).max(599).default(200),
  interval: z.number().min(30),
  timeout: z.number().min(1000),
  isPaused: z.boolean().optional().default(false),
  regions: z.array(z.nativeEnum(Region)).default([Region.AP_SOUTH_1]),
});

export const UpdateMonitorSchema = CreateMonitorSchema.omit({
  websiteName: true,
  url: true,
  regions: true,
});

export const DeleteMonitorSchema = z.object({
  isDeleted: z.boolean().default(true),
});
