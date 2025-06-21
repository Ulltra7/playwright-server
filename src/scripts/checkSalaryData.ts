import { SupabaseService } from "../services/SupabaseService";

async function checkSalaryData() {
  console.log("🔍 Checking salary data in SwissDevJobs entries...\n");
  
  const supabaseService = new SupabaseService();
  
  try {
    // Fetch all jobs from SwissDevJobs
    const result = await supabaseService.getJobs({
      source: 'swissdevjobs',
      limit: 20
    });
    
    const jobs = result.data;
    console.log(`📊 Checking ${jobs.length} SwissDevJobs entries:\n`);
    
    let withSalary = 0;
    let withoutSalary = 0;
    
    jobs.forEach((job, index) => {
      if (job.salary) {
        withSalary++;
        console.log(`✅ Job ${index + 1}: ${job.job_title}`);
        console.log(`   Company: ${job.company}`);
        console.log(`   Salary: ${job.salary}\n`);
      } else {
        withoutSalary++;
        if (withoutSalary <= 5) { // Show first 5 without salary
          console.log(`❌ Job ${index + 1}: ${job.job_title}`);
          console.log(`   Company: ${job.company}`);
          console.log(`   Salary: No salary data\n`);
        }
      }
    });
    
    console.log(`\n📊 Summary:`);
    console.log(`   • Jobs with salary: ${withSalary}`);
    console.log(`   • Jobs without salary: ${withoutSalary}`);
    
    // Get total count
    const totalResult = await supabaseService.getJobs({
      source: 'swissdevjobs',
      limit: 1000
    });
    
    const totalWithSalary = totalResult.data.filter(job => job.salary).length;
    const totalWithoutSalary = totalResult.data.filter(job => !job.salary).length;
    
    console.log(`\n📊 Total in database:`);
    console.log(`   • Total SwissDevJobs: ${totalResult.data.length}`);
    console.log(`   • With salary: ${totalWithSalary}`);
    console.log(`   • Without salary: ${totalWithoutSalary}`);
    
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

checkSalaryData();