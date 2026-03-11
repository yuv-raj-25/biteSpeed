import express from "express";
import dotenv from "dotenv";
import { initDb } from "./config/db";
import identifyRouter from "./routes/identify.route";

dotenv.config();

const app = express();

app.use(express.json());

app.get("/", (_req, res) => {
  res.send("Server running 🚀");
});

// Routes
app.use("/", identifyRouter);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 3000;

const start = async () => {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

start();



app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime()
  });
});