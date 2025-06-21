import { SupabaseService } from "../services/SupabaseService";
import { SwissDevJobsScraper } from "../scrapers/SwissDevJobsScraper";

async function removeAndRescrapeSwissDevJobs() {
  console.log("🗑️ Removing all SwissDevJobs entries to re-scrape with descriptions...\n");
  
  const supabaseService = new SupabaseService();
  
  try {
    // Step 1: Remove all existing SwissDevJobs entries
    const result = await supabaseService.getJobs({
      source: 'swissdevjobs',
      limit: 1000
    });
    
    const jobs = result.data;
    console.log(`📊 Found ${jobs.length} SwissDevJobs entries to remove`);
    
    if (jobs.length > 0) {
      console.log("\n⚠️  This will remove ALL SwissDevJobs entries from the database!");
      console.log("   Press Ctrl+C to cancel, or wait 3 seconds to continue...\n");
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      let removed = 0;
      let failed = 0;
      
      // Remove each job
      for (const job of jobs) {
        if (job.id) {
          const success = await supabaseService.deleteJob(job.id);
          if (success) {
            removed++;
            if (removed % 20 === 0) {
              console.log(`   Removed ${removed} jobs...`);
            }
          } else {
            failed++;
            console.log(`❌ Failed to remove: ${job.job_title}`);
          }
        }
      }
      
      console.log(`\n✅ Removal complete!`);
      console.log(`   • Jobs removed: ${removed}`);
      console.log(`   • Failed removals: ${failed}`);
    }
    
    // Step 2: Re-scrape with descriptions
    console.log("\n🔄 Starting re-scrape with descriptions...\n");
    
    const scraper = new SwissDevJobsScraper();
    const scrapingResult = await scraper.scrapeJobs();
    
    if (!scrapingResult.jobs) {
      console.log("❌ No jobs found from scraper");
      return;
    }
    
    console.log(`\n📊 Scraping complete!`);
    console.log(`   • Total jobs found: ${scrapingResult.jobs.length}`);
    console.log(`   • Jobs with descriptions: ${scrapingResult.jobs.filter(j => j.description && j.description !== "No description available" && j.description !== "Failed to fetch description").length}`);
    
    // Step 3: Save to database
    if (scrapingResult.jobs.length > 0) {
      console.log("\n💾 Saving jobs to database...");
      
      // Convert to format expected by SupabaseService
      const jobsWithTechnologies = scrapingResult.jobs.map(job => ({
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
      const insertResult = await supabaseService.bulkInsertJobs(jobsWithTechnologies);
      
      console.log(`\n✅ Database update complete!`);
      console.log(`   • Jobs saved: ${insertResult.inserted}`);
      console.log(`   • Jobs skipped (duplicates): ${insertResult.skipped}`);
      console.log(`   • Errors: ${insertResult.errors.length}`);
      
      if (insertResult.errors.length > 0) {
        console.log('❌ Errors during insertion:');
        insertResult.errors.forEach(error => console.log(`   - ${error}`));
      }
    }
    
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

removeAndRescrapeSwissDevJobs();