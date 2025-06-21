import { CronJobService } from "../services/CronJobService";

async function scrapeSwissDevJobs() {
  console.log("🚀 Starting SwissDevJobs scraping...\n");
  
  const cronJobService = new CronJobService();
  
  try {
    // Run the SwissDevJobs scraping
    await cronJobService.runSwissDevJobsScraping();
    
    console.log("\n✅ SwissDevJobs scraping completed!");
    
  } catch (error) {
    console.error("❌ Error during scraping:", error);
  } finally {
    // Exit the process when done
    process.exit(0);
  }
}

// Run the scraper
scrapeSwissDevJobs();