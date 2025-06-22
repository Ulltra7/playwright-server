import { SupabaseService } from './SupabaseService';
import { filterJobs } from '../utils/itJobFilter';
import { JobInput } from '../types/jobInput';

interface ProcessingResult {
  inserted: number;
  updated: number;
  filtered: number;
  markedInactive: number;
  errors: string[];
}

/**
 * Service responsible for processing scraped jobs:
 * - Filtering out non-IT jobs
 * - Inserting/updating jobs in database
 * - Marking inactive jobs
 */
export class JobProcessingService {
  private supabaseService: SupabaseService;

  constructor() {
    this.supabaseService = new SupabaseService();
  }

  /**
   * Process jobs from any source
   */
  async processJobs(jobs: JobInput[]): Promise<ProcessingResult> {
    if (jobs.length === 0) {
      return {
        inserted: 0,
        updated: 0,
        filtered: 0,
        markedInactive: 0,
        errors: []
      };
    }

    const sourceName = jobs[0].source.name;
    console.log(`📊 Processing ${jobs.length} jobs from ${sourceName}...`);

    // Filter out non-IT jobs
    const jobsToFilter = jobs.map(job => ({
      title: job.job_title,
      description: job.description,
      technologies: job.technologies
    }));
    
    const { itJobs, filteredOut } = filterJobs(jobsToFilter);
    
    console.log(`🔍 Filtered ${filteredOut.length} non-IT jobs`);
    if (filteredOut.length > 0) {
      console.log('📋 Sample of filtered jobs:');
      filteredOut.slice(0, 5).forEach(({ reason }) => {
        console.log(`   - ${reason}`);
      });
    }
    
    if (itJobs.length === 0) {
      console.log('ℹ️ No IT jobs found after filtering');
      return {
        inserted: 0,
        updated: 0,
        filtered: filteredOut.length,
        markedInactive: 0,
        errors: []
      };
    }

    // Get only the IT jobs from original array
    const itJobsData = jobs.filter((_, index) => 
      itJobs.some(itJob => jobsToFilter[index] === itJob)
    );

    // Insert/update jobs in database
    const insertResult = await this.supabaseService.bulkInsertJobs(itJobsData);
    
    // Mark inactive jobs
    const markedInactive = await this.markInactiveJobs(
      sourceName,
      itJobsData.map(job => job.job_url)
    );

    return {
      inserted: insertResult.inserted,
      updated: insertResult.updated,
      filtered: filteredOut.length,
      markedInactive,
      errors: insertResult.errors
    };
  }


  /**
   * Mark jobs as inactive if they weren't seen in the latest scrape
   */
  private async markInactiveJobs(sourceName: string, activeJobUrls: string[]): Promise<number> {
    if (activeJobUrls.length === 0) {
      return 0;
    }

    const sourceId = await this.supabaseService.getOrCreateJobSource(sourceName);
    if (!sourceId) {
      console.error(`❌ Failed to get source ID for ${sourceName}`);
      return 0;
    }

    const inactiveCount = await this.supabaseService.markInactiveJobs(sourceId, activeJobUrls);
    if (inactiveCount > 0) {
      console.log(`   • ${inactiveCount} jobs marked as inactive`);
    }
    
    return inactiveCount;
  }

  /**
   * Log processing results
   */
  logResults(source: string, results: ProcessingResult, duration: number): void {
    console.log(`✅ ${source} processing completed in ${duration}s:`);
    console.log(`   • ${results.inserted} jobs inserted`);
    console.log(`   • ${results.updated} jobs updated`);
    console.log(`   • ${results.filtered} non-IT jobs filtered out`);
    if (results.markedInactive > 0) {
      console.log(`   • ${results.markedInactive} jobs marked as inactive`);
    }
    console.log(`   • ${results.errors.length} errors`);
    
    if (results.errors.length > 0) {
      console.log('❌ Errors during processing:');
      results.errors.forEach(error => console.log(`   - ${error}`));
    }
  }
}