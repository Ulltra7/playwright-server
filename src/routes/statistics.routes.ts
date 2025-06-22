import { Router } from "express";
import { StatisticsController } from "../controllers/StatisticsController";

const router = Router();

router.get("/jobs/by-role", StatisticsController.getJobCountsByRole);
router.get(
  "/jobs/by-technology",
  StatisticsController.getJobCountsByTechnology
);
router.get("/jobs/role-trends", StatisticsController.getJobRoleTrends);

export default router;
