import dotenv from "dotenv";
dotenv.config();

import { Request, Response, NextFunction } from "express";
import express from "express";

const app = express();

app.use(express.json());
// routes
import AuthRouter from "./routes/auth.route";

app.use("/api", AuthRouter);
app.get("/", (_, res: Response) => {
  res.send("Server running");
});

app.use((req: Request, res: Response, next: NextFunction) => {
  const error: any = new Error("Not found");
  error.status = 404;
  next(error);
});

app.use((error: any, req: Request, res: Response) => {
  console.error(error);
  res.status(error.status || 500);
  res.json({
    error: {
      message: error.message,
      status: error.status || 500,
    },
  });
});

export default app;
