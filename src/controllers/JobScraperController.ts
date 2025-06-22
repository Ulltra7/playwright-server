import { Request, Response } from "express";
import { SwissDevJobsScraper } from "../scrapers/SwissDevJobsScraper";
import { ScraperResponse } from "../types/job";
import { SupabaseService, JobApplication } from "../services/SupabaseService";
import { JobApplicationService, JobApplicationResult } from "../services/JobApplicationService";
import { CronJobService } from "../services/CronJobService";
import { MAIN_ROLE_FILTERS } from "../config/roleFilters";

export class JobScraperController {
  private static supabaseService = new SupabaseService();
  private static cronJobService = new CronJobService();

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

      // SwissDevJobsScraper now returns JobInput[] format
      // No conversion needed, just pass directly to bulkInsertJobs
      const result = await JobScraperController.supabaseService.bulkInsertJobs(
        scrapedResult.jobs
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
      const { search, page, limit, sortBy, sortOrder, role } = req.query;

      const filters: any = {};
      if (search) filters.search = search as string;
      if (role) filters.role = role as string;

      // Parse pagination parameters
      if (page) filters.page = parseInt(page as string, 10);
      if (limit) filters.pageSize = parseInt(limit as string, 10);

      // Validate pagination parameters
      if (filters.page && (isNaN(filters.page) || filters.page < 1)) {
        filters.page = 1;
      }
      if (
        filters.pageSize &&
        (isNaN(filters.pageSize) ||
          filters.pageSize < 1 ||
          filters.pageSize > 100)
      ) {
        filters.pageSize = 20;
      }

      // Sorting parameters
      if (sortBy) filters.sortBy = sortBy as string;
      if (sortOrder && ["asc", "desc"].includes(sortOrder as string)) {
        filters.sortOrder = sortOrder as "asc" | "desc";
      }

      const result = await JobScraperController.supabaseService.getJobs(
        filters
      );

      res.status(200).json({
        status: "success",
        message: `Retrieved ${result.data.length} jobs`,
        data: result.data,
        pagination: {
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
          totalPages: result.totalPages,
          hasMore: result.page < result.totalPages,
        },
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

  // Get role filters for frontend
  static async getRoleFilters(req: Request, res: Response): Promise<void> {
    try {
      res.status(200).json({
        status: "success",
        message: "Role filters retrieved",
        data: MAIN_ROLE_FILTERS,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("❌ Error fetching role filters:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch role filters",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  }

  static async getJobCountsByCategory(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      // Get job counts by role
      const roleCounts =
        await JobScraperController.supabaseService.getActiveJobCountsByRole();

      // Calculate total active jobs
      const totalActiveJobs = Object.values(roleCounts).reduce(
        (sum, count) => sum + count,
        0
      );

      // Sort roles by count (descending)
      const sortedRoles = Object.entries(roleCounts)
        .sort(([, a], [, b]) => b - a)
        .map(([role, count]) => ({
          role,
          count,
          percentage:
            totalActiveJobs > 0
              ? ((count / totalActiveJobs) * 100).toFixed(1)
              : "0.0",
        }));

      res.status(200).json({
        status: "success",
        message: "Job counts by role retrieved successfully",
        data: {
          totalActiveJobs,
          roles: sortedRoles,
          summary: roleCounts,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("❌ Error getting job counts by role:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to get job counts by role",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Apply to jobs endpoint
  static async applyToJobs(req: Request, res: Response): Promise<void> {
    try {
      console.log("🚀 Starting job application process...");

      // Get jobs that are ready for application
      const jobsForApplication =
        await JobScraperController.supabaseService.getJobsForApplication();

      if (jobsForApplication.length === 0) {
        res.status(200).json({
          status: "success",
          message: "No jobs found matching the criteria for application",
          data: {
            totalProcessed: 0,
            successful: 0,
            failed: 0,
            results: [],
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      console.log(
        `📋 Found ${jobsForApplication.length} jobs ready for application`
      );

      const applicationService = new JobApplicationService();
      const results: JobApplicationResult[] = [];
      let successful = 0;
      let failed = 0;

      // Process each job (you might want to limit this for testing)
      const maxJobs = parseInt(req.query.limit as string) || 50;
      const jobsToProcess = jobsForApplication.slice(0, maxJobs);

      console.log(
        `🎯 Processing ${jobsToProcess.length} jobs (limited to ${maxJobs})`
      );

      for (const job of jobsToProcess) {
        try {
          console.log(`\n📝 Processing: ${job.job_title} at ${job.company}`);

          const result = await applicationService.applyToJob(job);
          results.push(result);

          if (result.success) {
            successful++;
            console.log(`✅ Successfully processed: ${job.job_title}`);
          } else {
            failed++;
            console.log(
              `❌ Failed to process: ${job.job_title} - ${result.message}`
            );
          }

          // Add small delay between applications to be respectful
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } catch (error) {
          failed++;
          const errorResult: JobApplicationResult = {
            jobId: job.id || "",
            jobTitle: job.job_title,
            company: job.company,
            success: false,
            status: "error",
            message: `Unexpected error: ${
              error instanceof Error ? error.message : String(error)
            }`,
            error: error instanceof Error ? error.message : String(error),
          };
          results.push(errorResult);
          console.error(
            `💥 Unexpected error processing ${job.job_title}:`,
            error
          );
        }
      }

      res.status(200).json({
        status: "success",
        message: `Job application process completed. ${successful} successful, ${failed} failed.`,
        data: {
          totalProcessed: results.length,
          successful,
          failed,
          results,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("❌ Error in job application process:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to process job applications",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Get jobs ready for application (preview)
  static async getJobsForApplication(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const jobs =
        await JobScraperController.supabaseService.getJobsForApplication();

      res.status(200).json({
        status: "success",
        message: `Found ${jobs.length} jobs ready for application`,
        data: {
          count: jobs.length,
          jobs: jobs.map((job: any) => ({
            id: job.id,
            job_title: job.job_title,
            company: job.company,
            location: job.location,
            job_url: job.job_url,
            technologies: job.technologies,
            updated_at: job.updated_at,
          })),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("❌ Error fetching jobs for application:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch jobs ready for application",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  }
}
