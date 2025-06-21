import { SupabaseService } from "../services/SupabaseService";

async function removeBadSwissDevJobs() {
  console.log("🗑️ Removing SwissDevJobs entries with street names in company field...\n");
  
  const supabaseService = new SupabaseService();
  
  try {
    // Fetch all jobs from SwissDevJobs
    const result = await supabaseService.getJobs({
      source: 'swissdevjobs',
      limit: 1000
    });
    
    const jobs = result.data;
    
    // Filter jobs where company contains street patterns
    const badJobs = jobs.filter(job => {
      const company = job.company || "";
      
      // Check if company contains street names or patterns
      return company.includes("strasse") ||
             company.includes("gasse") ||
             company.includes("weg ") ||
             company.includes("platz") ||
             company.includes("allee") ||
             company.includes("Chemin") ||
             company.includes("Route") ||
             company.includes("Avenue") ||
             company.includes("Rue") ||
             company.match(/\d+,/) || // Contains number followed by comma (address pattern)
             company.match(/[a-z][A-Z][a-z]/) // Concatenated words like "SwissquoteChemin"
    });
    
    console.log(`📊 Found ${badJobs.length} jobs with street names in company field out of ${jobs.length} total SwissDevJobs entries`);
    
    if (badJobs.length === 0) {
      console.log("✅ No jobs with bad company names found!");
      return;
    }
    
    // Show what will be removed
    console.log("\n📋 Jobs to be removed:");
    badJobs.slice(0, 10).forEach((job, index) => {
      console.log(`${index + 1}. ${job.job_title}`);
      console.log(`   Company: "${job.company}"`);
      console.log(`   URL: ${job.job_url}`);
    });
    
    if (badJobs.length > 10) {
      console.log(`\n... and ${badJobs.length - 10} more`);
    }
    
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
          if (removed % 10 === 0) {
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
    
    console.log(`\n🔄 Now you can run 'yarn scrape-swissdevjobs' to re-scrape these jobs with proper company/location parsing`);
    
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

removeBadSwissDevJobs();