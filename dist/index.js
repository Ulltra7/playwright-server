"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const routes_1 = __importDefault(require("./routes"));
const CronJobService_1 = require("./services/CronJobService");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Middleware
app.use(express_1.default.json());
// Routes
app.use("/", routes_1.default);
// Initialize cron job service
const cronJobService = new CronJobService_1.CronJobService();
// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📋 Health check available at http://localhost:${PORT}/health`);
    // Start the daily cron job for Arbeitnow scraping
    cronJobService.startDailyJobScraping();
    console.log('🕘 Daily Arbeitnow job scraping cron job started');
});
