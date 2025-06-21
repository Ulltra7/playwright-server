import { SupabaseService } from "../services/SupabaseService";

async function removeAllSwissDevJobs() {
  console.log("🗑️ Removing all SwissDevJobs entries to re-scrape with salary data...\n");
  
  const supabaseService = new SupabaseService();
  
  try {
    // Fetch all jobs from SwissDevJobs
    const result = await supabaseService.getJobs({
      source: 'swissdevjobs',
      limit: 1000
    });
    
    const jobs = result.data;
    console.log(`📊 Found ${jobs.length} SwissDevJobs entries to remove`);
    
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
    
    console.log(`\n🔄 Now run 'yarn scrape-swissdevjobs' to re-scrape all jobs with salary information`);
    
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

removeAllSwissDevJobs();