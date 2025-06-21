import { NonITJobRemovalService } from "../services/NonITJobRemovalService";

async function testNonITRemoval() {
  console.log("🧪 Testing NonITJobRemovalService...\n");
  
  const service = new NonITJobRemovalService();
  
  try {
    const result = await service.removeNonITJobs();
    
    console.log("\n📊 Test Results:");
    console.log(`Total jobs checked: ${result.totalJobs}`);
    console.log(`Non-IT jobs removed: ${result.removedJobs}`);
    console.log(`Remaining jobs: ${result.totalJobs - result.removedJobs}`);
    
    if (result.removedJobsList.length > 0) {
      console.log("\n🗑️ Sample of removed jobs:");
      result.removedJobsList.forEach((job, index) => {
        console.log(`${index + 1}. ${job.title} at ${job.company}`);
        console.log(`   Reason: ${job.reason}`);
      });
    } else {
      console.log("\n✅ No non-IT jobs found!");
    }
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test
testNonITRemoval();