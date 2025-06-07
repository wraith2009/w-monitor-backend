export interface UserPayload {
  email: string;
  userId: number;
}

export const jobPayloads: {
  region: string;
  monitorId: number;
  url: string;
  method: string;
  expectedStatus: number;
  timeout: number;
}[] = [];
