import { SupabaseService } from "../services/SupabaseService";

async function checkSwissDevJobs() {
  console.log("🔍 Checking SwissDevJobs entries in database...\n");
  
  const supabaseService = new SupabaseService();
  
  try {
    // Fetch all jobs from SwissDevJobs
    const result = await supabaseService.getJobs({
      source: 'swissdevjobs',
      limit: 20
    });
    
    const jobs = result.data;
    console.log(`📊 Sample of ${jobs.length} SwissDevJobs entries:\n`);
    
    let problemCount = 0;
    
    jobs.forEach((job, index) => {
      const hasIssue = job.company === "Unknown Company" || 
                      job.company.includes("strasse") || 
                      job.company.includes("allee") ||
                      job.company.includes("platz") ||
                      job.company.includes("weg") ||
                      job.location === "Location not specified" ||
                      job.location === "Not specified";
      
      if (hasIssue) {
        problemCount++;
        console.log(`❌ Job ${index + 1}: ${job.job_title}`);
        console.log(`   Company: "${job.company}"`);
        console.log(`   Location: "${job.location}"`);
        console.log(`   URL: ${job.job_url}\n`);
      } else {
        console.log(`✅ Job ${index + 1}: ${job.job_title}`);
        console.log(`   Company: "${job.company}"`);
        console.log(`   Location: "${job.location}"\n`);
      }
    });
    
    console.log(`\n📊 Summary: ${problemCount} jobs with issues out of ${jobs.length} checked`);
    
    // Get total count
    const totalResult = await supabaseService.getJobs({
      source: 'swissdevjobs',
      limit: 1000
    });
    
    console.log(`📊 Total SwissDevJobs entries in database: ${totalResult.data.length}`);
    
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

checkSwissDevJobs();