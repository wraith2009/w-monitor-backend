import { z } from "zod";

export enum Region {
  US_EAST_1 = "us-east-1",

  EU_WEST_1 = "eu-west-1",

  AP_SOUTH_1 = "ap-south-1",
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

const StatusEnum = z.enum(["UP", "PAUSED", "DOWN"]);

export const UpdateMonitorSchema = CreateMonitorSchema.omit({
  websiteName: true,
  url: true,
  regions: true,
}).transform((data) => {
  if (data.isPaused) {
    return { ...data, status: "PAUSED" as z.infer<typeof StatusEnum> };
  }
  return data;
});

export const DeleteMonitorSchema = z.object({
  isDeleted: z.boolean().default(true),
});
