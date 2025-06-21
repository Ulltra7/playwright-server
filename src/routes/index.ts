import { Router } from "express";
import { JobScraperController } from "../controllers/JobScraperController";

const router = Router();

// Health check endpoint
router.get("/health", JobScraperController.healthCheck);

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
router.get("/jobs/role-filters", JobScraperController.getRoleFilters);

// Analysis endpoints
router.get("/jobs/analyze-technologies", JobScraperController.analyzeTechnologies);
router.get("/jobs/analyze-categories", JobScraperController.analyzeJobCategories);

// Job filtering endpoints - removed for security, filtering happens automatically after scraping

export default router;
