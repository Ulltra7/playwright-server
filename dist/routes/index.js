"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const JobScraperController_1 = require("../controllers/JobScraperController");
const router = (0, express_1.Router)();
// Health check endpoint
router.get('/health', JobScraperController_1.JobScraperController.healthCheck);
// Job scraping endpoints
router.get('/scrape/swissdevjobs', JobScraperController_1.JobScraperController.scrapeSwissDevJobs);
exports.default = router;
