"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobScraperController = void 0;
const SwissDevJobsScraper_1 = require("../scrapers/SwissDevJobsScraper");
const SupabaseService_1 = require("../services/SupabaseService");
const JobApplicationService_1 = require("../services/JobApplicationService");
const ArbeitnowScraper_1 = require("../services/ArbeitnowScraper");
const CronJobService_1 = require("../services/CronJobService");
const JobFilterService_1 = require("../services/JobFilterService");
const roleFilters_1 = require("../config/roleFilters");
class JobScraperController {
    static async scrapeSwissDevJobs(req, res) {
        try {
            const scraper = new SwissDevJobsScraper_1.SwissDevJobsScraper();
            const result = await scraper.scrapeJobs();
            const response = {
                status: "success",
                message: "Swiss Dev Jobs page accessed successfully",
                data: result,
                timestamp: new Date().toISOString(),
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error("❌ Error scraping Swiss Dev Jobs:", error);
            const errorResponse = {
                status: "error",
                message: "Failed to scrape Swiss Dev Jobs",
                error: error instanceof Error ? error.message : "Unknown error",
                timestamp: new Date().toISOString(),
            };
            res.status(500).json(errorResponse);
        }
    }
    static async healthCheck(req, res) {
        res.status(200).json({
            status: "ok",
            message: "Playwright server is running",
            timestamp: new Date().toISOString(),
        });
    }
    // New endpoint: Scrape and save to database
    static async scrapeAndSaveSwissDevJobs(req, res) {
        try {
            console.log("🕷️ Starting Swiss Dev Jobs scraping and saving process...");
            const scraper = new SwissDevJobsScraper_1.SwissDevJobsScraper();
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
                    application_status: "not_applied",
                    priority: "medium",
                    source: { name: "swissdevjobs", display_name: "Swiss Dev Jobs" },
                },
                technologies: job.technologies || [],
            }));
            // Bulk insert to database
            const result = await JobScraperController.supabaseService.bulkInsertJobs(jobsWithTechnologies);
            console.log(`✅ Database operation completed: ${result.inserted} inserted, ${result.skipped} skipped`);
            const response = {
                status: "success",
                message: `Scraping and saving completed: ${result.inserted} new jobs saved, ${result.skipped} duplicates skipped`,
                data: result,
                timestamp: new Date().toISOString(),
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error("❌ Error scraping and saving Swiss Dev Jobs:", error);
            const errorResponse = {
                status: "error",
                message: "Failed to scrape and save Swiss Dev Jobs",
                error: error instanceof Error ? error.message : "Unknown error",
                timestamp: new Date().toISOString(),
            };
            res.status(500).json(errorResponse);
        }
    }
    // Get all jobs from database
    static async getJobs(req, res) {
        try {
            const { status, company, source, priority, technology, search, page, limit, sortBy, sortOrder, role } = req.query;
            const filters = {};
            if (status)
                filters.status = status;
            if (company)
                filters.company = company;
            if (source)
                filters.source = source;
            if (priority)
                filters.priority = priority;
            if (technology)
                filters.technology = technology;
            if (search)
                filters.search = search;
            if (role)
                filters.role = role;
            // Parse pagination parameters
            if (page)
                filters.page = parseInt(page, 10);
            if (limit)
                filters.limit = parseInt(limit, 10);
            // Validate pagination parameters
            if (filters.page && (isNaN(filters.page) || filters.page < 1)) {
                filters.page = 1;
            }
            if (filters.limit && (isNaN(filters.limit) || filters.limit < 1 || filters.limit > 100)) {
                filters.limit = 20;
            }
            // Sorting parameters
            if (sortBy)
                filters.sortBy = sortBy;
            if (sortOrder && ['asc', 'desc'].includes(sortOrder)) {
                filters.sortOrder = sortOrder;
            }
            const result = await JobScraperController.supabaseService.getJobs(filters);
            res.status(200).json({
                status: "success",
                message: `Retrieved ${result.data.length} jobs`,
                data: result.data,
                pagination: {
                    total: result.total,
                    page: result.page,
                    limit: result.limit,
                    totalPages: result.totalPages,
                    hasMore: result.page < result.totalPages
                },
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
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
    static async updateApplicationStatus(req, res) {
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
            const additionalData = {};
            if (applied_at)
                additionalData.applied_at = new Date(applied_at);
            if (interview_date)
                additionalData.interview_date = new Date(interview_date);
            if (notes !== undefined)
                additionalData.notes = notes;
            const success = await JobScraperController.supabaseService.updateApplicationStatus(jobId, status, additionalData);
            if (success) {
                res.status(200).json({
                    status: "success",
                    message: `Application status updated to: ${status}`,
                    timestamp: new Date().toISOString(),
                });
            }
            else {
                res.status(500).json({
                    status: "error",
                    message: "Failed to update application status",
                    timestamp: new Date().toISOString(),
                });
            }
        }
        catch (error) {
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
    static async getJobStats(req, res) {
        try {
            const stats = await JobScraperController.supabaseService.getJobStats();
            res.status(200).json({
                status: "success",
                message: "Job statistics retrieved",
                data: stats,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
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
    static async getJobSources(req, res) {
        try {
            const sources = await JobScraperController.supabaseService.getJobSources();
            res.status(200).json({
                status: "success",
                message: `Retrieved ${sources.length} job sources`,
                data: sources,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
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
    static async getTechnologies(req, res) {
        try {
            const technologies = await JobScraperController.supabaseService.getTechnologies();
            res.status(200).json({
                status: "success",
                message: `Retrieved ${technologies.length} technologies`,
                data: technologies,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
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
    static async getRoleFilters(req, res) {
        try {
            res.status(200).json({
                status: "success",
                message: "Role filters retrieved",
                data: roleFilters_1.MAIN_ROLE_FILTERS,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error("❌ Error fetching role filters:", error);
            res.status(500).json({
                status: "error",
                message: "Failed to fetch role filters",
                error: error instanceof Error ? error.message : "Unknown error",
                timestamp: new Date().toISOString(),
            });
        }
    }
    // Apply to jobs endpoint
    static async applyToJobs(req, res) {
        try {
            console.log("🚀 Starting job application process...");
            // Get jobs that are ready for application
            const jobsForApplication = await JobScraperController.supabaseService.getJobsForApplication();
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
            console.log(`📋 Found ${jobsForApplication.length} jobs ready for application`);
            const applicationService = new JobApplicationService_1.JobApplicationService();
            const results = [];
            let successful = 0;
            let failed = 0;
            // Process each job (you might want to limit this for testing)
            const maxJobs = parseInt(req.query.limit) || 50; // Default to 10 if not specified
            const jobsToProcess = jobsForApplication.slice(0, maxJobs);
            console.log(`🎯 Processing ${jobsToProcess.length} jobs (limited to ${maxJobs})`);
            // for testing, filter for only one specific job
            const filteredJobUrl = "https://swissdevjobs.ch/jobs/Eventfrog-AG-Senior-Software-Engineer-Angular-mwd-80-100";
            const filteredJobsToProcess = jobsToProcess.filter((job) => job.job_url === filteredJobUrl);
            for (const job of filteredJobsToProcess) {
                try {
                    console.log(`\n📝 Processing: ${job.job_title} at ${job.company}`);
                    const result = await applicationService.applyToJob(job);
                    results.push(result);
                    if (result.success) {
                        successful++;
                        console.log(`✅ Successfully processed: ${job.job_title}`);
                    }
                    else {
                        failed++;
                        console.log(`❌ Failed to process: ${job.job_title} - ${result.message}`);
                    }
                    // Add small delay between applications to be respectful
                    await new Promise((resolve) => setTimeout(resolve, 2000));
                }
                catch (error) {
                    failed++;
                    const errorResult = {
                        jobId: job.id || "",
                        jobTitle: job.job_title,
                        company: job.company,
                        success: false,
                        status: "error",
                        message: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
                        error: error instanceof Error ? error.message : String(error),
                    };
                    results.push(errorResult);
                    console.error(`💥 Unexpected error processing ${job.job_title}:`, error);
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
        }
        catch (error) {
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
    static async getJobsForApplication(req, res) {
        try {
            const jobs = await JobScraperController.supabaseService.getJobsForApplication();
            res.status(200).json({
                status: "success",
                message: `Found ${jobs.length} jobs ready for application`,
                data: {
                    count: jobs.length,
                    jobs: jobs.map((job) => ({
                        id: job.id,
                        job_title: job.job_title,
                        company: job.company,
                        location: job.location,
                        job_url: job.job_url,
                        technologies: job.technologies,
                        scraped_at: job.scraped_at,
                    })),
                },
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error("❌ Error fetching jobs for application:", error);
            res.status(500).json({
                status: "error",
                message: "Failed to fetch jobs for application",
                error: error instanceof Error ? error.message : "Unknown error",
                timestamp: new Date().toISOString(),
            });
        }
    }
    // Arbeitnow scraping methods
    static async scrapeAndSaveArbeitnowJobs(req, res) {
        try {
            console.log("🕷️ Starting Arbeitnow jobs scraping and saving process...");
            const scraper = new ArbeitnowScraper_1.ArbeitnowScraper();
            const scrapedResult = await scraper.scrapeWithoutBrowser();
            if (!scrapedResult.jobs || scrapedResult.jobs.length === 0) {
                res.status(200).json({
                    status: "success",
                    message: "Scraping completed, but no jobs found",
                    data: { inserted: 0, skipped: 0, errors: [] },
                    timestamp: new Date().toISOString(),
                });
                return;
            }
            // Bulk insert to database
            const result = await JobScraperController.supabaseService.bulkInsertJobs(scrapedResult.jobs);
            console.log(`✅ Database operation completed: ${result.inserted} inserted, ${result.skipped} skipped`);
            const response = {
                status: "success",
                message: `Arbeitnow scraping and saving completed: ${result.inserted} new jobs saved, ${result.skipped} duplicates skipped`,
                data: result,
                timestamp: new Date().toISOString(),
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error("❌ Error scraping and saving Arbeitnow jobs:", error);
            const errorResponse = {
                status: "error",
                message: "Failed to scrape and save Arbeitnow jobs",
                error: error instanceof Error ? error.message : "Unknown error",
                timestamp: new Date().toISOString(),
            };
            res.status(500).json(errorResponse);
        }
    }
    // Manual trigger for Arbeitnow cron job
    static async runArbeitnowCronJob(req, res) {
        try {
            console.log("🕘 Manually triggering Arbeitnow cron job...");
            await JobScraperController.cronJobService.runArbeitnowScraping();
            res.status(200).json({
                status: "success",
                message: "Arbeitnow cron job executed successfully",
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error("❌ Error running Arbeitnow cron job:", error);
            res.status(500).json({
                status: "error",
                message: "Failed to run Arbeitnow cron job",
                error: error instanceof Error ? error.message : "Unknown error",
                timestamp: new Date().toISOString(),
            });
        }
    }
    // Manual trigger for all scrapers
    static async runAllScrapersCronJob(req, res) {
        try {
            console.log("🕘 Manually triggering all scrapers...");
            await JobScraperController.cronJobService.runAllScrapers();
            res.status(200).json({
                status: "success",
                message: "All scrapers executed successfully",
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error("❌ Error running all scrapers:", error);
            res.status(500).json({
                status: "error",
                message: "Failed to run all scrapers",
                error: error instanceof Error ? error.message : "Unknown error",
                timestamp: new Date().toISOString(),
            });
        }
    }
    // Start the daily cron job
    static async startDailyCronJob(req, res) {
        try {
            JobScraperController.cronJobService.startDailyJobScraping();
            res.status(200).json({
                status: "success",
                message: "Daily Arbeitnow cron job started (scheduled for 9:00 AM daily)",
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error("❌ Error starting daily cron job:", error);
            res.status(500).json({
                status: "error",
                message: "Failed to start daily cron job",
                error: error instanceof Error ? error.message : "Unknown error",
                timestamp: new Date().toISOString(),
            });
        }
    }
    // Get cron job status
    static async getCronJobStatus(req, res) {
        try {
            const status = JobScraperController.cronJobService.getJobsStatus();
            res.status(200).json({
                status: "success",
                message: "Cron job status retrieved",
                data: status,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error("❌ Error getting cron job status:", error);
            res.status(500).json({
                status: "error",
                message: "Failed to get cron job status",
                error: error instanceof Error ? error.message : "Unknown error",
                timestamp: new Date().toISOString(),
            });
        }
    }
    // Job filtering methods removed - filtering happens automatically via cron job
    // Analyze job categories and distribution
    static async analyzeJobCategories(req, res) {
        try {
            console.log("📊 Analyzing job categories...");
            const jobFilterService = new JobFilterService_1.JobFilterService();
            const analysis = await jobFilterService.analyzeJobDistribution();
            res.status(200).json({
                status: "success",
                message: "Job category analysis completed",
                data: analysis,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error("❌ Error analyzing job categories:", error);
            res.status(500).json({
                status: "error",
                message: "Failed to analyze job categories",
                error: error instanceof Error ? error.message : "Unknown error",
                timestamp: new Date().toISOString(),
            });
        }
    }
    // Analyze technologies in database
    static async analyzeTechnologies(req, res) {
        try {
            console.log("📊 Analyzing technologies in database...");
            // Get all technologies
            const technologies = await JobScraperController.supabaseService.getTechnologies();
            // Get all jobs with their technologies
            const allJobsResult = await JobScraperController.supabaseService.getJobs({
                limit: 10000
            });
            // Count technology usage
            const techUsageCount = {};
            allJobsResult.data.forEach(job => {
                if (job.technologies && Array.isArray(job.technologies)) {
                    job.technologies.forEach((tech) => {
                        const techName = typeof tech === 'string' ? tech : tech.name;
                        if (techName) {
                            techUsageCount[techName] = (techUsageCount[techName] || 0) + 1;
                        }
                    });
                }
            });
            // Sort technologies by usage
            const sortedTechUsage = Object.entries(techUsageCount)
                .sort(([, a], [, b]) => b - a)
                .map(([tech, count]) => ({ technology: tech, count }));
            res.status(200).json({
                status: "success",
                message: "Technology analysis completed",
                data: {
                    totalTechnologies: technologies.length,
                    totalJobs: allJobsResult.total,
                    technologies: technologies,
                    topUsedTechnologies: sortedTechUsage.slice(0, 50),
                    allTechnologyUsage: sortedTechUsage
                },
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error("❌ Error analyzing technologies:", error);
            res.status(500).json({
                status: "error",
                message: "Failed to analyze technologies",
                error: error instanceof Error ? error.message : "Unknown error",
                timestamp: new Date().toISOString(),
            });
        }
    }
}
exports.JobScraperController = JobScraperController;
JobScraperController.supabaseService = new SupabaseService_1.SupabaseService();
JobScraperController.cronJobService = new CronJobService_1.CronJobService();
JobScraperController.jobFilterService = new JobFilterService_1.JobFilterService();
