"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobScraperController = void 0;
const SwissDevJobsScraper_1 = require("../scrapers/SwissDevJobsScraper");
class JobScraperController {
    static async scrapeSwissDevJobs(req, res) {
        try {
            const scraper = new SwissDevJobsScraper_1.SwissDevJobsScraper();
            const result = await scraper.scrapeJobs();
            const response = {
                status: 'success',
                message: 'Swiss Dev Jobs page accessed successfully',
                data: result,
                timestamp: new Date().toISOString()
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('❌ Error scraping Swiss Dev Jobs:', error);
            const errorResponse = {
                status: 'error',
                message: 'Failed to scrape Swiss Dev Jobs',
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            };
            res.status(500).json(errorResponse);
        }
    }
    static async healthCheck(req, res) {
        res.status(200).json({
            status: 'ok',
            message: 'Playwright server is running',
            timestamp: new Date().toISOString()
        });
    }
}
exports.JobScraperController = JobScraperController;
