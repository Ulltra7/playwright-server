import * as cron from 'node-cron';
import { ArbeitnowScraper } from './ArbeitnowScraper';
import { SupabaseService } from './SupabaseService';

export class CronJobService {
  private supabaseService: SupabaseService;
  private arbeitnowScraper: ArbeitnowScraper;

  constructor() {
    this.supabaseService = new SupabaseService();
    this.arbeitnowScraper = new ArbeitnowScraper();
  }

  // Schedule daily job scraping at 9:00 AM
  startDailyJobScraping(): void {
    console.log('🕘 Starting daily job scraping cron job...');
    
    // Cron expression: '0 9 * * *' = At 9:00 AM every day
    // For testing, you can use '*/5 * * * *' for every 5 minutes
    cron.schedule('0 9 * * *', async () => {
      console.log('🚀 Daily job scraping started at:', new Date().toISOString());
      await this.runArbeitnowScraping();
    }, {
      timezone: "Europe/Zurich" // Adjust timezone as needed
    });

    console.log('✅ Daily job scraping cron job scheduled for 9:00 AM daily');
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
      
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      
      console.log(`✅ Arbeitnow scraping completed in ${duration}s:`);
      console.log(`   • ${insertResult.inserted} jobs inserted`);
      console.log(`   • ${insertResult.skipped} jobs skipped (duplicates)`);
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
  getJobsStatus(): { status: string } {
    return {
      status: 'Daily job scraping is scheduled for 9:00 AM daily'
    };
  }
}