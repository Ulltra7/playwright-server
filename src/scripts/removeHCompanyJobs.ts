import { SupabaseService } from "../services/SupabaseService";

async function removeHCompanyJobs() {
  console.log("🗑️ Removing SwissDevJobs entries with company 'H'...\n");
  
  const supabaseService = new SupabaseService();
  
  try {
    // Fetch all jobs from SwissDevJobs with company "H"
    const result = await supabaseService.getJobs({
      source: 'swissdevjobs',
      limit: 1000
    });
    
    const jobs = result.data;
    
    // Filter jobs where company is exactly "H"
    const badJobs = jobs.filter(job => job.company === "H");
    
    console.log(`📊 Found ${badJobs.length} jobs with company 'H' out of ${jobs.length} total SwissDevJobs entries`);
    
    if (badJobs.length === 0) {
      console.log("✅ No jobs with company 'H' found!");
      return;
    }
    
    // Show what will be removed
    console.log("\n📋 Jobs to be removed:");
    badJobs.forEach((job, index) => {
      console.log(`${index + 1}. ${job.job_title}`);
      console.log(`   Company: "${job.company}"`);
      console.log(`   Location: "${job.location}"`);
      console.log(`   URL: ${job.job_url}`);
    });
    
    console.log("\n⚠️  This will remove these jobs from the database!");
    console.log("   Press Ctrl+C to cancel, or wait 3 seconds to continue...\n");
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    let removed = 0;
    let failed = 0;
    
    // Remove each job
    for (const job of badJobs) {
      if (job.id) {
        const success = await supabaseService.deleteJob(job.id);
        if (success) {
          removed++;
          console.log(`✅ Removed: ${job.job_title}`);
        } else {
          failed++;
          console.log(`❌ Failed to remove: ${job.job_title}`);
        }
      }
    }
    
    console.log(`\n✅ Removal complete!`);
    console.log(`   • Jobs removed: ${removed}`);
    console.log(`   • Failed removals: ${failed}`);
    
    console.log(`\n🔄 Now you can run 'yarn scrape-swissdevjobs' to re-scrape these jobs with proper company extraction`);
    
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

removeHCompanyJobs();