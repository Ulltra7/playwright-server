import { ArbeitnowScraper } from '../scrapers/ArbeitnowScraper';
import { SwissDevJobsScraper } from '../scrapers/SwissDevJobsScraper';
import { JobProcessingService } from './JobProcessingService';
import { SupabaseService } from './SupabaseService';
import { JobInput } from '../types/jobInput';

interface ScraperResult {
  source: string;
  status: 'success' | 'error';
  jobsProcessed?: number;
  error?: string;
}

/**
 * Orchestrates the entire job scraping pipeline
 * Coordinates scrapers, processing, and reporting
 */
export class JobOrchestrationService {
  private arbeitnowScraper: ArbeitnowScraper;
  private swissDevJobsScraper: SwissDevJobsScraper;
  private jobProcessingService: JobProcessingService;
  private supabaseService: SupabaseService;

  constructor() {
    this.arbeitnowScraper = new ArbeitnowScraper();
    this.swissDevJobsScraper = new SwissDevJobsScraper();
    this.jobProcessingService = new JobProcessingService();
    this.supabaseService = new SupabaseService();
  }

  /**
   * Run all scrapers and process results
   */
  async runAllScrapers(): Promise<void> {
    console.log('🚀 Starting all job scrapers...');
    const startTime = Date.now();

    const results = await Promise.allSettled([
      this.processSource('arbeitnow', () => this.arbeitnowScraper.scrapeWithoutBrowser()),
      this.processSource('swissdevjobs', () => this.swissDevJobsScraper.scrapeJobs())
    ]);

    const duration = (Date.now() - startTime) / 1000;
    
    // Log results
    this.logResults(results, duration);
    
    // Log final statistics
    await this.logJobStats();
  }

  /**
   * Run a specific scraper
   */
  async runScraper(scraperName: 'arbeitnow' | 'swissdevjobs'): Promise<void> {
    console.log(`🔄 Starting ${scraperName} scraper...`);
    const startTime = Date.now();

    let result: PromiseSettledResult<ScraperResult>;
    
    if (scraperName === 'arbeitnow') {
      result = await this.processSource('arbeitnow', () => this.arbeitnowScraper.scrapeWithoutBrowser())
        .then(r => ({ status: 'fulfilled' as const, value: r }))
        .catch(e => ({ status: 'rejected' as const, reason: e }));
    } else {
      result = await this.processSource('swissdevjobs', () => this.swissDevJobsScraper.scrapeJobs())
        .then(r => ({ status: 'fulfilled' as const, value: r }))
        .catch(e => ({ status: 'rejected' as const, reason: e }));
    }

    const duration = (Date.now() - startTime) / 1000;
    this.logResults([result], duration);
    await this.logJobStats();
  }

  /**
   * Process jobs from a single source
   */
  private async processSource(
    sourceName: string,
    scrapeFunction: () => Promise<{ jobs: JobInput[]; totalFetched: number }>
  ): Promise<ScraperResult> {
    try {
      console.log(`\n🔄 Processing ${sourceName}...`);
      
      // Scrape jobs
      const { jobs, totalFetched } = await scrapeFunction();
      console.log(`📊 Scraped ${totalFetched} jobs from ${sourceName}`);

      if (jobs.length === 0) {
        console.log(`ℹ️ No jobs found from ${sourceName}`);
        return {
          source: sourceName,
          status: 'success',
          jobsProcessed: 0
        };
      }

      // Process jobs (filter, insert, mark inactive)
      const processingResult = await this.jobProcessingService.processJobs(jobs);
      
      // Log processing results
      const processingDuration = 0; // We don't track individual processing time anymore
      this.jobProcessingService.logResults(sourceName, processingResult, processingDuration);

      return {
        source: sourceName,
        status: 'success',
        jobsProcessed: processingResult.inserted + processingResult.updated
      };
    } catch (error) {
      console.error(`❌ Error processing ${sourceName}:`, error);
      
      // Check if it's a Playwright browser installation error
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Executable doesn\'t exist') || errorMessage.includes('playwright install')) {
        console.error(`⚠️ ${sourceName}: Playwright browsers not installed. Run 'npx playwright install' or add to deployment config.`);
      }
      
      return {
        source: sourceName,
        status: 'error',
        error: errorMessage
      };
    }
  }

  /**
   * Log results of all scrapers
   */
  private logResults(results: PromiseSettledResult<ScraperResult>[], duration: number): void {
    console.log(`\n✅ All scrapers completed in ${duration.toFixed(1)}s`);
    
    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value.status === 'success') {
        console.log(`✅ ${result.value.source}: ${result.value.jobsProcessed || 0} jobs processed`);
      } else if (result.status === 'fulfilled' && result.value.status === 'error') {
        console.log(`❌ ${result.value.source}: ${result.value.error}`);
      } else if (result.status === 'rejected') {
        console.log(`❌ Unknown source: ${result.reason}`);
      }
    });
  }

  /**
   * Log job statistics
   */
  private async logJobStats(): Promise<void> {
    try {
      const stats = await this.supabaseService.getJobStats();
      console.log('\n📈 Current job statistics:');
      console.log(`   • Total jobs: ${stats.total}`);
      console.log(`   • Active jobs: ${stats.active}`);
      console.log(`   • Inactive jobs: ${stats.inactive}`);
      console.log(`   • Jobs with applications: ${stats.withApplications}`);
    } catch (error) {
      console.error('❌ Error fetching job stats:', error);
    }
  }
}