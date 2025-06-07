export const REGION_QUEUE_URLS: Record<string, string> = {
  "us-east-1": process.env.SQS_US_EAST_1!,
  "eu-west-1": process.env.SQS_EU_WEST_1!,
  "ap-south-1": process.env.SQS_AP_SOUTH_1!,
};
