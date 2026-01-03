import express from "express";
import cors from "cors";
import jobRoutes from "./routes/jobs.routes";
import statisticsRoutes from "./routes/statistics.routes";
import { CronJobService } from "./services/CronJobService";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/jobs", jobRoutes);
app.use("/api/statistics", statisticsRoutes);

const cronJobService = new CronJobService();

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  cronJobService.startDailyJobScraping();
  cronJobService.startDailyJobEvaluation();
});
