import { Router } from "express";
import { JobScraperController } from "../controllers/JobScraperController";

const router = Router();

// Health check endpoint
router.get("/health", JobScraperController.healthCheck);

// Job scraping endpoints
router.get("/scrape/swissdevjobs", JobScraperController.scrapeSwissDevJobs);
router.post(
  "/scrape/swissdevjobs/save",
  JobScraperController.scrapeAndSaveSwissDevJobs
);

// Arbeitnow scraping endpoints
router.post(
  "/scrape/arbeitnow/save",
  JobScraperController.scrapeAndSaveArbeitnowJobs
);

// Cron job endpoints
router.post("/cron/arbeitnow/run", JobScraperController.runArbeitnowCronJob);
router.post("/cron/start", JobScraperController.startDailyCronJob);
router.get("/cron/status", JobScraperController.getCronJobStatus);

// Job management endpoints
router.get("/jobs", JobScraperController.getJobs);
router.get("/jobs/stats", JobScraperController.getJobStats);
router.patch(
  "/jobs/:jobId/status",
  JobScraperController.updateApplicationStatus
);

// Job application endpoints
router.get("/jobs/for-application", JobScraperController.getJobsForApplication);
router.post("/jobs/apply", JobScraperController.applyToJobs);

// Reference data endpoints
router.get("/jobs/sources", JobScraperController.getJobSources);
router.get("/jobs/technologies", JobScraperController.getTechnologies);

export default router;
