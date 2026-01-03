import { Request, Response } from "express";
import { SwissDevJobsScraper } from "../scrapers/SwissDevJobsScraper";
import { ScraperResponse } from "../types/job";
import { SupabaseService, JobApplication } from "../services/SupabaseService";
import { JobApplicationService, JobApplicationResult } from "../services/JobApplicationService";
import { CronJobService } from "../services/CronJobService";
import { JobEvaluationService } from "../services/JobEvaluationService";
import { MAIN_ROLE_FILTERS } from "../config/roleFilters";

export class JobScraperController {
  private static supabaseService = new SupabaseService();
  private static cronJobService = new CronJobService();
  private static jobEvaluationService = new JobEvaluationService();

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

  // Get interesting jobs HTML page
  static async getInterestingJobsPage(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const jobs = await JobScraperController.jobEvaluationService.getInterestingJobs();

      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Interesting Jobs</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: #f5f5f5;
      color: #333;
      line-height: 1.6;
      padding: 2rem;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 {
      margin-bottom: 1rem;
      color: #1a1a1a;
    }
    .stats {
      background: #fff;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      margin-bottom: 2rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .stats span {
      margin-right: 2rem;
      color: #666;
    }
    .stats strong {
      color: #2563eb;
    }
    .job-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .job-card {
      background: #fff;
      border-radius: 8px;
      padding: 1.5rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      transition: box-shadow 0.2s;
    }
    .job-card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .job-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
    }
    .job-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: #1a1a1a;
      text-decoration: none;
    }
    .job-title:hover {
      color: #2563eb;
    }
    .job-company {
      color: #666;
      margin-top: 0.25rem;
    }
    .scores {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .score-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 500;
    }
    .score-overall {
      background: #dcfce7;
      color: #166534;
    }
    .score-overall.medium {
      background: #fef9c3;
      color: #854d0e;
    }
    .score-remote {
      background: #dbeafe;
      color: #1e40af;
    }
    .score-tech {
      background: #f3e8ff;
      color: #6b21a8;
    }
    .job-details {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin: 1rem 0;
      padding: 1rem 0;
      border-top: 1px solid #eee;
      border-bottom: 1px solid #eee;
    }
    .detail-item {
      display: flex;
      flex-direction: column;
    }
    .detail-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      color: #888;
      margin-bottom: 0.25rem;
    }
    .detail-value {
      font-weight: 500;
    }
    .remote-badge {
      display: inline-block;
      padding: 0.125rem 0.5rem;
      border-radius: 4px;
      font-size: 0.85rem;
    }
    .remote-badge.remote {
      background: #dcfce7;
      color: #166534;
    }
    .remote-badge.hybrid {
      background: #dbeafe;
      color: #1e40af;
    }
    .remote-badge.onsite {
      background: #fee2e2;
      color: #991b1b;
    }
    .remote-badge.unknown {
      background: #f3f4f6;
      color: #6b7280;
    }
    .tech-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .tech-tag {
      background: #f3f4f6;
      color: #374151;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
    }
    .tech-tag.matched {
      background: #dcfce7;
      color: #166534;
    }
    .reasoning {
      margin-top: 1rem;
      padding: 1rem;
      background: #f9fafb;
      border-radius: 6px;
      font-size: 0.9rem;
      color: #555;
    }
    .apply-btn {
      display: inline-block;
      margin-top: 1rem;
      padding: 0.5rem 1rem;
      background: #2563eb;
      color: #fff;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
      transition: background 0.2s;
    }
    .apply-btn:hover {
      background: #1d4ed8;
    }
    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      background: #fff;
      border-radius: 8px;
    }
    .empty-state h2 {
      color: #666;
      margin-bottom: 0.5rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Interesting Jobs</h1>
    <div class="stats">
      <span>Total: <strong>${jobs.length}</strong> jobs</span>
      <span>Updated: <strong>${new Date().toLocaleString('de-CH')}</strong></span>
    </div>

    ${jobs.length === 0 ? `
      <div class="empty-state">
        <h2>No interesting jobs found yet</h2>
        <p>Run the job evaluation first: <code>yarn evaluate:jobs</code></p>
      </div>
    ` : `
      <div class="job-list">
        ${jobs.map((evaluation: any) => {
          const job = evaluation.jobs;
          return `
          <div class="job-card">
            <div class="job-header">
              <div>
                <a href="${job?.job_url || '#'}" target="_blank" class="job-title">${job?.job_title || 'Unknown Title'}</a>
                <div class="job-company">${job?.company || 'Unknown Company'} • ${job?.location || 'Unknown Location'}</div>
              </div>
              <div class="scores">
                <span class="score-badge score-overall ${evaluation.overall_score >= 8 ? '' : 'medium'}">${evaluation.overall_score}/10</span>
                <span class="score-badge score-remote">Remote: ${evaluation.remote_score}/5</span>
                <span class="score-badge score-tech">Tech: ${evaluation.tech_match_score}/5</span>
              </div>
            </div>

            <div class="job-details">
              <div class="detail-item">
                <span class="detail-label">Remote Type</span>
                <span class="detail-value">
                  <span class="remote-badge ${evaluation.remote_type}">${evaluation.remote_type}${evaluation.remote_days_per_week ? ` (${evaluation.remote_days_per_week} days/week)` : ''}</span>
                </span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Seniority</span>
                <span class="detail-value">${evaluation.seniority} ${evaluation.seniority_match ? '✓' : ''}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Languages</span>
                <span class="detail-value">${evaluation.required_languages?.join(', ') || 'Not specified'} ${evaluation.language_match ? '✓' : ''}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Domain Fit</span>
                <span class="detail-value">${evaluation.domain_relevance_score}/5</span>
              </div>
            </div>

            <div class="detail-item">
              <span class="detail-label">Matched Technologies</span>
              <div class="tech-list">
                ${(evaluation.matched_technologies || []).map((tech: string) => `<span class="tech-tag matched">${tech}</span>`).join('')}
              </div>
            </div>

            <div class="reasoning">
              <strong>AI Analysis:</strong> ${evaluation.ai_reasoning}
            </div>

            <a href="${job?.job_url || '#'}" target="_blank" class="apply-btn">View Job →</a>
          </div>
          `;
        }).join('')}
      </div>
    `}
  </div>
</body>
</html>
      `;

      res.setHeader('Content-Type', 'text/html');
      res.status(200).send(html);
    } catch (error) {
      console.error("❌ Error fetching interesting jobs:", error);
      res.status(500).send(`
        <html>
          <body>
            <h1>Error</h1>
            <p>Failed to load interesting jobs: ${error instanceof Error ? error.message : 'Unknown error'}</p>
          </body>
        </html>
      `);
    }
  }
}
