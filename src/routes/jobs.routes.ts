import { Router } from "express";
import { JobScraperController } from "../controllers/JobScraperController";

const router = Router();

router.get("/health", JobScraperController.healthCheck);

router.get("/", JobScraperController.getJobs);

// Reference data endpoints
router.get("/sources", JobScraperController.getJobSources);
router.get("/technologies", JobScraperController.getTechnologies);
router.get("/role-filters", JobScraperController.getRoleFilters);

export default router;
