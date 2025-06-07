import dotenv from "dotenv";
dotenv.config();

import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (_, res) => {
  res.send("Server running");
});

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
