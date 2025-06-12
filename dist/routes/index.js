"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const JobScraperController_1 = require("../controllers/JobScraperController");
const router = (0, express_1.Router)();
// Health check endpoint
router.get("/health", JobScraperController_1.JobScraperController.healthCheck);
// Job scraping endpoints
router.get("/scrape/swissdevjobs", JobScraperController_1.JobScraperController.scrapeSwissDevJobs);
router.post("/scrape/swissdevjobs/save", JobScraperController_1.JobScraperController.scrapeAndSaveSwissDevJobs);
// Arbeitnow scraping endpoints
router.post("/scrape/arbeitnow/save", JobScraperController_1.JobScraperController.scrapeAndSaveArbeitnowJobs);
// Cron job endpoints
router.post("/cron/arbeitnow/run", JobScraperController_1.JobScraperController.runArbeitnowCronJob);
router.post("/cron/start", JobScraperController_1.JobScraperController.startDailyCronJob);
router.get("/cron/status", JobScraperController_1.JobScraperController.getCronJobStatus);
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
exports.default = router;
