import { Request, Response } from "express";
import { SwissDevJobsScraper } from "../scrapers/SwissDevJobsScraper";
import { ScraperResponse } from "../types/job";

export class JobScraperController {
  static async scrapeSwissDevJobs(req: Request, res: Response): Promise<void> {
    try {
      const scraper = new SwissDevJobsScraper();
      const result = await scraper.scrapeJobs();

      const response: ScraperResponse = {
        status: "success",
        message: "Swiss Dev Jobs page accessed successfully",
        data: result,
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      console.error("❌ Error scraping Swiss Dev Jobs:", error);

      const errorResponse: ScraperResponse = {
        status: "error",
        message: "Failed to scrape Swiss Dev Jobs",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      };

      res.status(500).json(errorResponse);
    }
  }

  static async healthCheck(req: Request, res: Response): Promise<void> {
    res.status(200).json({
      status: "ok",
      message: "Playwright server is running",
      timestamp: new Date().toISOString(),
    });
  }
}
