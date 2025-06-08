import { Request, Response } from "express";
import { SwissDevJobsScraper } from "../scrapers/SwissDevJobsScraper";
import { ScraperResponse } from "../types/job";
import { SupabaseService, JobApplication } from "../services/SupabaseService";

export class JobScraperController {
  private static supabaseService = new SupabaseService();

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

  // New endpoint: Scrape and save to database
  static async scrapeAndSaveSwissDevJobs(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      console.log("🕷️ Starting Swiss Dev Jobs scraping and saving process...");

      const scraper = new SwissDevJobsScraper();
      const scrapedResult = await scraper.scrapeJobs();

      if (!scrapedResult.jobs || scrapedResult.jobs.length === 0) {
        res.status(200).json({
          status: "success",
          message: "Scraping completed, but no jobs found",
          data: { inserted: 0, skipped: 0, errors: [] },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Convert scraped jobs to the format expected by SupabaseService
      const jobsWithTechnologies = scrapedResult.jobs.map((job) => ({
        job: {
          job_title: job.title,
          company: job.company,
          location: job.location,
          job_url: job.url,
          salary: job.salary,
          description: job.description,
          requirements: job.requirements?.join("\n"),
          source_id: "", // Will be handled by SupabaseService
          scraped_at: new Date(),
          application_status: "not_applied" as const,
          priority: "medium" as const,
          source: { name: "swissdevjobs", display_name: "Swiss Dev Jobs" },
        },
        technologies: job.technologies || [],
      }));

      // Bulk insert to database
      const result = await JobScraperController.supabaseService.bulkInsertJobs(
        jobsWithTechnologies
      );

      console.log(
        `✅ Database operation completed: ${result.inserted} inserted, ${result.skipped} skipped`
      );

      const response: ScraperResponse = {
        status: "success",
        message: `Scraping and saving completed: ${result.inserted} new jobs saved, ${result.skipped} duplicates skipped`,
        data: result,
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      console.error("❌ Error scraping and saving Swiss Dev Jobs:", error);

      const errorResponse: ScraperResponse = {
        status: "error",
        message: "Failed to scrape and save Swiss Dev Jobs",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      };

      res.status(500).json(errorResponse);
    }
  }

  // Get all jobs from database
  static async getJobs(req: Request, res: Response): Promise<void> {
    try {
      const { status, company, source, priority } = req.query;

      const filters: any = {};
      if (status) filters.status = status as string;
      if (company) filters.company = company as string;
      if (source) filters.source = source as string;
      if (priority) filters.priority = priority as string;

      const jobs = await JobScraperController.supabaseService.getJobs(filters);

      res.status(200).json({
        status: "success",
        message: `Retrieved ${jobs.length} jobs`,
        data: jobs,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("❌ Error fetching jobs:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch jobs from database",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Update application status
  static async updateApplicationStatus(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { jobId } = req.params;
      const { status, applied_at, interview_date, notes } = req.body;

      if (!status) {
        res.status(400).json({
          status: "error",
          message: "Application status is required",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const additionalData: any = {};
      if (applied_at) additionalData.applied_at = new Date(applied_at);
      if (interview_date)
        additionalData.interview_date = new Date(interview_date);
      if (notes !== undefined) additionalData.notes = notes;

      const success =
        await JobScraperController.supabaseService.updateApplicationStatus(
          jobId,
          status,
          additionalData
        );

      if (success) {
        res.status(200).json({
          status: "success",
          message: `Application status updated to: ${status}`,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          status: "error",
          message: "Failed to update application status",
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("❌ Error updating application status:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to update application status",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Get job statistics
  static async getJobStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await JobScraperController.supabaseService.getJobStats();

      res.status(200).json({
        status: "success",
        message: "Job statistics retrieved",
        data: stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("❌ Error fetching job stats:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch job statistics",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Get all job sources
  static async getJobSources(req: Request, res: Response): Promise<void> {
    try {
      const sources =
        await JobScraperController.supabaseService.getJobSources();

      res.status(200).json({
        status: "success",
        message: `Retrieved ${sources.length} job sources`,
        data: sources,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("❌ Error fetching job sources:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch job sources",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Get all technologies
  static async getTechnologies(req: Request, res: Response): Promise<void> {
    try {
      const technologies =
        await JobScraperController.supabaseService.getTechnologies();

      res.status(200).json({
        status: "success",
        message: `Retrieved ${technologies.length} technologies`,
        data: technologies,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("❌ Error fetching technologies:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch technologies",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  }
}
