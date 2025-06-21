"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const JobScraperController_1 = require("../controllers/JobScraperController");
const router = (0, express_1.Router)();
// Health check endpoint
router.get("/health", JobScraperController_1.JobScraperController.healthCheck);
// Job management endpoints
router.get("/jobs", JobScraperController_1.JobScraperController.getJobs);
router.get("/jobs/stats", JobScraperController_1.JobScraperController.getJobStats);
router.patch("/jobs/:jobId/status", JobScraperController_1.JobScraperController.updateApplicationStatus);
// Job application endpoints
router.get("/jobs/for-application", JobScraperController_1.JobScraperController.getJobsForApplication);
router.post("/jobs/apply", JobScraperController_1.JobScraperController.applyToJobs);
// Reference data endpoints
router.get("/jobs/sources", JobScraperController_1.JobScraperController.getJobSources);
router.get("/jobs/technologies", JobScraperController_1.JobScraperController.getTechnologies);
router.get("/jobs/role-filters", JobScraperController_1.JobScraperController.getRoleFilters);
// Analysis endpoints
router.get("/jobs/analyze-technologies", JobScraperController_1.JobScraperController.analyzeTechnologies);
router.get("/jobs/analyze-categories", JobScraperController_1.JobScraperController.analyzeJobCategories);
// Job filtering endpoints - removed for security, filtering happens automatically after scraping
exports.default = router;
