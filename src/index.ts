import express from "express";
import cors from "cors";
import routes from "./routes";
import { CronJobService } from "./services/CronJobService";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

app.use("/", routes);

const cronJobService = new CronJobService();

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  cronJobService.startDailyJobScraping();
});
