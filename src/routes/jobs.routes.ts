import { Router } from "express";
import { JobScraperController } from "../controllers/JobScraperController";

const router = Router();

router.get("/health", JobScraperController.healthCheck);

router.get("/", JobScraperController.getJobs);

// Job application endpoints
router.get("/for-application", JobScraperController.getJobsForApplication);
router.post("/apply", JobScraperController.applyToJobs);

// Reference data endpoints
router.get("/sources", JobScraperController.getJobSources);
router.get("/technologies", JobScraperController.getTechnologies);
router.get("/role-filters", JobScraperController.getRoleFilters);

export default router;
