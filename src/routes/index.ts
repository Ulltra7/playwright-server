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

// Job management endpoints
router.get("/jobs", JobScraperController.getJobs);
router.get("/jobs/stats", JobScraperController.getJobStats);
router.patch(
  "/jobs/:jobId/status",
  JobScraperController.updateApplicationStatus
);

// Reference data endpoints
router.get("/jobs/sources", JobScraperController.getJobSources);
router.get("/jobs/technologies", JobScraperController.getTechnologies);

export default router;
