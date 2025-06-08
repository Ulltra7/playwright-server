import { Router } from "express";
import { JobScraperController } from "../controllers/JobScraperController";

const router = Router();

// Health check endpoint
router.get("/health", JobScraperController.healthCheck);

// Job scraping endpoints
router.get("/scrape/swissdevjobs", JobScraperController.scrapeSwissDevJobs);

export default router;
