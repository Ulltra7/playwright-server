import * as cron from 'node-cron';
import { ArbeitnowScraper } from './ArbeitnowScraper';
import { SwissDevJobsScraper } from '../scrapers/SwissDevJobsScraper';
import { SupabaseService } from './SupabaseService';
import { JobFilterService } from './JobFilterService';
import { NonITJobRemovalService } from './NonITJobRemovalService';

export class CronJobService {
  private supabaseService: SupabaseService;
  private arbeitnowScraper: ArbeitnowScraper;
  private swissDevJobsScraper: SwissDevJobsScraper;
  private jobFilterService: JobFilterService;
  private nonITJobRemovalService: NonITJobRemovalService;

  constructor() {
    this.supabaseService = new SupabaseService();
    this.arbeitnowScraper = new ArbeitnowScraper();
    this.swissDevJobsScraper = new SwissDevJobsScraper();
    this.jobFilterService = new JobFilterService();
    this.nonITJobRemovalService = new NonITJobRemovalService();
  }

  // Schedule daily job scraping at 7:00 AM and filtering 15 minutes later
  startDailyJobScraping(): void {
    console.log('🕘 Starting daily job scraping cron job...');
    
    // Cron expression: '0 7 * * *' = At 7:00 AM every day
    cron.schedule('0 7 * * *', async () => {
      console.log('🚀 Daily job scraping started at:', new Date().toISOString());
      await this.runAllScrapers();
    }, {
      timezone: "Europe/Zurich"
    });

    // Schedule IT job filtering at 7:15 AM (15 minutes after scraping)
    cron.schedule('15 7 * * *', async () => {
      console.log('🔍 Daily IT job filtering started at:', new Date().toISOString());
      await this.runITJobFiltering();
    }, {
      timezone: "Europe/Zurich"
    });

    console.log('✅ Daily job scraping scheduled for 7:00 AM and filtering for 7:15 AM');
  }

  // Manual trigger for testing
  async runArbeitnowScraping(): Promise<void> {
    try {
      console.log('🔄 Starting Arbeitnow scraping job...');
      
      const startTime = Date.now();
      
      // Scrape jobs from Arbeitnow API
      const result = await this.arbeitnowScraper.scrapeWithoutBrowser();
      
      console.log(`📊 Scraped ${result.jobs.length} jobs from Arbeitnow API`);
      
      if (result.jobs.length === 0) {
        console.log('ℹ️ No new jobs found to insert');
        return;
      }

      // Insert jobs into database
      const insertResult = await this.supabaseService.bulkInsertJobs(result.jobs);
      
      // Mark jobs as inactive if they weren't seen in this scrape
      if (result.jobs.length > 0) {
        const sourceId = await this.supabaseService.getOrCreateJobSource('arbeitnow');
        if (sourceId) {
          const seenJobUrls = result.jobs.map(jobData => jobData.job.job_url);
          const inactiveCount = await this.supabaseService.markInactiveJobs(sourceId, seenJobUrls);
          console.log(`   • ${inactiveCount} jobs marked as inactive`);
        }
      }
      
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      
      console.log(`✅ Arbeitnow scraping completed in ${duration}s:`);
      console.log(`   • ${insertResult.inserted} jobs inserted`);
      console.log(`   • ${insertResult.updated} jobs updated`);
      console.log(`   • ${insertResult.errors.length} errors`);
      
      if (insertResult.errors.length > 0) {
        console.log('❌ Errors during insertion:');
        insertResult.errors.forEach(error => console.log(`   - ${error}`));
      }

      // Log summary statistics
      await this.logJobStats();
      
    } catch (error) {
      console.error('❌ Error during Arbeitnow scraping job:', error);
    }
  }

  private async logJobStats(): Promise<void> {
    try {
      const stats = await this.supabaseService.getJobStats();
      console.log('📈 Current job statistics:');
      console.log(`   • Total jobs: ${stats.total}`);
      console.log(`   • Not applied: ${stats.notApplied}`);
      console.log(`   • Applied: ${stats.applied}`);
      console.log(`   • Interviews: ${stats.interviews}`);
      console.log(`   • Offers: ${stats.offers}`);
      console.log(`   • Rejected: ${stats.rejected}`);
    } catch (error) {
      console.error('❌ Error fetching job stats:', error);
    }
  }

  // Run IT job filtering
  async runITJobFiltering(): Promise<void> {
    try {
      console.log('🔍 Starting IT job filtering...');
      
      const startTime = Date.now();
      
      // First, use the comprehensive NonITJobRemovalService
      console.log('📋 Running comprehensive non-IT job removal...');
      const nonITResult = await this.nonITJobRemovalService.removeNonITJobs();
      
      console.log(`   • Removed ${nonITResult.removedJobs} jobs using comprehensive keyword list`);
      
      // Then run the regular filtering for any remaining categorization
      console.log('🏷️ Running category-based filtering...');
      const result = await this.jobFilterService.filterNonITJobs();
      
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      
      console.log(`✅ IT job filtering completed in ${duration}s:`);
      console.log(`   • Total jobs analyzed: ${result.totalJobs}`);
      console.log(`   • IT jobs kept: ${result.itJobs}`);
      console.log(`   • Non-IT jobs removed (total): ${nonITResult.removedJobs + result.removedJobs}`);
      
      if (nonITResult.removedJobsList.length > 0) {
        console.log('🗑️ Sample of removed jobs (comprehensive filter):');
        nonITResult.removedJobsList.slice(0, 5).forEach(job => {
          console.log(`   - ${job.title} at ${job.company} (${job.reason})`);
        });
      }
      
      if (result.removedJobsList.length > 0) {
        console.log('🗑️ Sample of removed jobs (category filter):');
        result.removedJobsList.slice(0, 5).forEach(job => {
          console.log(`   - ${job.title} at ${job.company} (${job.reason})`);
        });
      }
      
      // Log updated statistics
      await this.logJobStats();
      
    } catch (error) {
      console.error('❌ Error during IT job filtering:', error);
    }
  }

  // Run all scrapers
  async runAllScrapers(): Promise<void> {
    console.log('🚀 Starting all job scrapers...');
    
    // Run scrapers in parallel for efficiency
    const scraperPromises = [
      this.runArbeitnowScraping().catch(error => {
        console.error('❌ Arbeitnow scraping failed:', error);
        return null;
      }),
      this.runSwissDevJobsScraping().catch(error => {
        console.error('❌ SwissDevJobs scraping failed:', error);
        return null;
      })
    ];

    await Promise.all(scraperPromises);
    
    console.log('✅ All scrapers completed');
    
    // Log final statistics
    await this.logJobStats();
  }

  // Run SwissDevJobs scraping
  async runSwissDevJobsScraping(): Promise<void> {
    try {
      console.log('🔄 Starting SwissDevJobs scraping job...');
      
      const startTime = Date.now();
      
      // Scrape jobs from SwissDevJobs
      const result = await this.swissDevJobsScraper.scrapeJobs();
      
      if (!result.jobs || result.jobs.length === 0) {
        console.log('ℹ️ No new jobs found from SwissDevJobs');
        return;
      }
      
      console.log(`📊 Scraped ${result.jobs.length} jobs from SwissDevJobs`);

      // Convert to format expected by SupabaseService
      const jobsWithTechnologies = result.jobs.map(job => ({
        job: {
          job_title: job.title,
          company: job.company,
          location: job.location,
          job_url: job.url,
          salary: job.salary,
          description: job.description,
          requirements: job.requirements?.join("\n"),
          source_id: "",
          scraped_at: new Date(),
          application_status: "not_applied" as const,
          priority: "medium" as const,
          source: { 
            name: "swissdevjobs", 
            display_name: "Swiss Dev Jobs",
            base_url: "https://swissdevjobs.ch"
          },
        },
        technologies: job.technologies || [],
      }));

      // Insert jobs into database
      const insertResult = await this.supabaseService.bulkInsertJobs(jobsWithTechnologies);
      
      // Mark jobs as inactive if they weren't seen in this scrape
      if (result.jobs && result.jobs.length > 0) {
        const sourceId = await this.supabaseService.getOrCreateJobSource('swissdevjobs');
        if (sourceId) {
          const seenJobUrls = result.jobs.map(job => job.url);
          const inactiveCount = await this.supabaseService.markInactiveJobs(sourceId, seenJobUrls);
          console.log(`   • ${inactiveCount} jobs marked as inactive`);
        }
      }
      
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      
      console.log(`✅ SwissDevJobs scraping completed in ${duration}s:`);
      console.log(`   • ${insertResult.inserted} jobs inserted`);
      console.log(`   • ${insertResult.updated} jobs updated`);
      console.log(`   • ${insertResult.errors.length} errors`);
      
      if (insertResult.errors.length > 0) {
        console.log('❌ Errors during insertion:');
        insertResult.errors.forEach(error => console.log(`   - ${error}`));
      }
      
    } catch (error) {
      console.error('❌ Error during SwissDevJobs scraping job:', error);
    }
  }

  // Test method to run scraping every 5 minutes (for development)
  startTestScraping(): void {
    console.log('🧪 Starting test job scraping (every 5 minutes)...');
    
    cron.schedule('*/5 * * * *', async () => {
      console.log('🧪 Test scraping started at:', new Date().toISOString());
      await this.runArbeitnowScraping();
    }, {
      timezone: "Europe/Zurich"
    });

    console.log('✅ Test job scraping scheduled for every 5 minutes');
  }

  // Stop all scheduled jobs  
  stopAllJobs(): void {
    console.log(`🛑 Cron jobs will be stopped when server restarts`);
  }

  // Get status of all scheduled jobs
  getJobsStatus(): { status: string; details: string[] } {
    return {
      status: 'Daily job processing is active',
      details: [
        'Job scraping: Scheduled at 7:00 AM daily',
        '  - Arbeitnow (API)',
        '  - SwissDevJobs (Web scraping)',
        'IT job filtering: Scheduled at 7:15 AM daily (15 minutes after scraping)',
        '  - Comprehensive non-IT keyword removal',
        '  - Category-based filtering',
        'Timezone: Europe/Zurich'
      ]
    };
  }
}