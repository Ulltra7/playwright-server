import express from "express";
import cors from "cors";
import routes from "./routes";
import { CronJobService } from "./services/CronJobService";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/", routes);

// Job roles statistics endpoints
app.get("/api/job-roles/weekly", async (req, res) => {
  try {
    const supabaseService = new CronJobService().supabaseService || new (require("./services/SupabaseService").SupabaseService)();
    const data = await supabaseService.getJobRolesWeekly();
    res.json({
      status: "success",
      data: data
    });
  } catch (error) {
    console.error("Error fetching job roles weekly:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch job roles weekly data"
    });
  }
});

app.get("/api/job-roles/current-week", async (req, res) => {
  try {
    const supabaseService = new (require("./services/SupabaseService").SupabaseService)();
    const data = await supabaseService.getJobRolesCurrentWeek();
    res.json({
      status: "success",
      data: data
    });
  } catch (error) {
    console.error("Error fetching current week job roles:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch current week job roles data"
    });
  }
});

app.get("/api/job-roles/trend", async (req, res) => {
  try {
    const supabaseService = new (require("./services/SupabaseService").SupabaseService)();
    const data = await supabaseService.getJobRolesTrend();
    res.json({
      status: "success",
      data: data
    });
  } catch (error) {
    console.error("Error fetching job roles trend:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch job roles trend data"
    });
  }
});

const cronJobService = new CronJobService();

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📋 Health check available at http://localhost:${PORT}/health`);

  // cronJobService.startDailyJobScraping();
  console.log(
    "🕘 Daily job scraping cron job started (Arbeitnow + SwissDevJobs)"
  );
});
