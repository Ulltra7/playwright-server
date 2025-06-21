import express from "express";
import cors from "cors";
import routes from "./routes";
import { CronJobService } from "./services/CronJobService";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/", routes);

const cronJobService = new CronJobService();

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📋 Health check available at http://localhost:${PORT}/health`);

  cronJobService.startDailyJobScraping();
  console.log("🕘 Daily job scraping cron job started (Arbeitnow + SwissDevJobs)");
});
