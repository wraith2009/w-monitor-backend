import { SubscriptionPlanEnum } from "@prisma/client";
export interface UserPayload {
  email: string;
  userId: number;
  subPlan: SubscriptionPlanEnum;
  isEmailVerified: boolean;
}

export const jobPayloads: {
  region: string;
  monitorId: number;
  url: string;
  method: string;
  expectedStatus: number;
  timeout: number;
}[] = [];
