import { SQSClient } from "@aws-sdk/client-sqs";

export const REGION_SQS_MAP: Record<string, SQSClient> = {
  "us-east-1": new SQSClient({
    region: "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_US_EAST_1!,
      secretAccessKey: process.env.AWS_SECRET_KEY_US_EAST_1!,
    },
  }),
  "eu-west-1": new SQSClient({
    region: "eu-west-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_EU_WEST_1!,
      secretAccessKey: process.env.AWS_SECRET_KEY_EU_WEST_1!,
    },
  }),
  "ap-south-1": new SQSClient({
    region: "ap-south-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_AP_SOUTH_1!,
      secretAccessKey: process.env.AWS_SECRET_KEY_AP_SOUTH_1!,
    },
  }),
};
