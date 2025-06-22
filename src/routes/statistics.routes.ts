import { Router } from "express";
import { StatisticsController } from "../controllers/StatisticsController";

const router = Router();

// Job statistics endpoints
router.get("/jobs/by-role", StatisticsController.getJobCountsByRole);
router.get("/jobs/by-technology", StatisticsController.getJobCountsByTechnology);
router.get("/jobs/role-trends", StatisticsController.getJobRoleTrends);

// Future statistics endpoints can be added here
// router.get("/jobs/by-location", StatisticsController.getJobCountsByLocation);
// router.get("/jobs/by-company", StatisticsController.getJobCountsByCompany);
// router.get("/jobs/by-salary-range", StatisticsController.getJobCountsBySalaryRange);
// router.get("/jobs/trends", StatisticsController.getJobTrends);

export default router;