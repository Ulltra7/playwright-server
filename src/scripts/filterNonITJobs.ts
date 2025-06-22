import { JobFilterService } from "../services/JobFilterService";

async function main() {
  console.log("🚀 Starting job filtering script...");
  
  const filterService = new JobFilterService();
  
  try {
    // First analyze current distribution
    console.log("\n📊 Analyzing current job distribution...");
    const analysis = await filterService.analyzeJobDistribution();
    
    console.log(`\n📈 Current statistics:`);
    console.log(`   Total jobs: ${analysis.totalJobs}`);
    console.log(`   IT jobs: ${analysis.likelyITJobs}`);
    console.log(`   Non-IT jobs: ${analysis.likelyNonITJobs}`);
    
    if (analysis.examples.nonITJobs.length > 0) {
      console.log(`\n🚫 Examples of non-IT jobs to be removed:`);
      analysis.examples.nonITJobs.forEach(job => {
        console.log(`   • ${job.title} at ${job.company}`);
      });
    }
    
    // Ask for confirmation
    console.log(`\n⚠️  This will remove ${analysis.likelyNonITJobs} non-IT jobs from the database.`);
    console.log(`   Press Ctrl+C to cancel, or wait 5 seconds to continue...`);
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Perform the filtering
    console.log("\n🔧 Starting job filtering...");
    const results = await filterService.filterNonITJobs();
    
    console.log("\n✅ Filtering complete!");
    console.log(`   • Total jobs processed: ${results.totalJobs}`);
    console.log(`   • IT jobs kept: ${results.itJobs}`);
    console.log(`   • Non-IT jobs removed: ${results.removedJobs}`);
    
    if (results.removedJobsList.length > 0) {
      console.log(`\n📋 Removed jobs (showing first ${results.removedJobsList.length}):`);
      results.removedJobsList.forEach((job, index) => {
        console.log(`   ${index + 1}. ${job.title} at ${job.company}`);
        console.log(`      Reason: ${job.reason}`);
      });
    }
    
  } catch (error) {
    console.error("\n❌ Error during filtering:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the script
main();