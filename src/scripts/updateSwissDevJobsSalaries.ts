import { SupabaseService } from "../services/SupabaseService";
import { chromium } from 'playwright';

async function updateSwissDevJobsSalaries() {
  console.log("💰 Updating salary information for SwissDevJobs entries...\n");
  
  const supabaseService = new SupabaseService();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Fetch all jobs from SwissDevJobs without salary
    const result = await supabaseService.getJobs({
      source: 'swissdevjobs',
      limit: 1000
    });
    
    const jobsWithoutSalary = result.data.filter(job => !job.salary);
    console.log(`📊 Found ${jobsWithoutSalary.length} SwissDevJobs entries without salary information`);
    
    if (jobsWithoutSalary.length === 0) {
      console.log("✅ All jobs already have salary information!");
      return;
    }
    
    let updated = 0;
    let notFound = 0;
    let failed = 0;
    
    // Process jobs in batches to avoid overwhelming the site
    const batchSize = 10;
    for (let i = 0; i < jobsWithoutSalary.length; i += batchSize) {
      const batch = jobsWithoutSalary.slice(i, Math.min(i + batchSize, jobsWithoutSalary.length));
      
      console.log(`\n📦 Processing batch ${Math.floor(i/batchSize) + 1} (jobs ${i + 1}-${Math.min(i + batchSize, jobsWithoutSalary.length)})...`);
      
      for (const job of batch) {
        try {
          // Navigate to the job page
          await page.goto(job.job_url, { waitUntil: 'networkidle' });
          
          // Look for salary information on the job detail page
          let salary = "";
          
          // Try to find salary in various possible locations
          const salarySelectors = [
            'div[aria-label="annual salary range"]',
            'span[aria-label="annual salary range"]',
            '[class*="salary"]',
            'text=/CHF\\s*[\\d\']/',
            'text=/€\\s*[\\d\']/',
            ':has-text("CHF")',
            ':has-text("Salary")'
          ];
          
          for (const selector of salarySelectors) {
            try {
              const salaryElement = await page.$(selector);
              if (salaryElement) {
                const text = await salaryElement.textContent();
                if (text && text.match(/\d/)) { // Contains numbers
                  salary = text.trim();
                  break;
                }
              }
            } catch (e) {
              // Continue to next selector
            }
          }
          
          if (salary) {
            // Clean up salary text
            salary = salary.replace(/\s+/g, ' ').trim();
            
            // Update the job with salary
            const success = await supabaseService.updateJob(job.id!, { salary });
            
            if (success) {
              updated++;
              console.log(`✅ Updated: ${job.job_title}`);
              console.log(`   Salary: ${salary}`);
            } else {
              failed++;
              console.log(`❌ Failed to update: ${job.job_title}`);
            }
          } else {
            notFound++;
            if (notFound <= 5) { // Show first 5 not found
              console.log(`⚠️ No salary found for: ${job.job_title}`);
            }
          }
          
          // Small delay between requests
          await page.waitForTimeout(500);
          
        } catch (error) {
          failed++;
          console.log(`❌ Error processing ${job.job_title}: ${error}`);
        }
      }
    }
    
    console.log(`\n✅ Update complete!`);
    console.log(`   • Jobs updated with salary: ${updated}`);
    console.log(`   • Jobs without salary info: ${notFound}`);
    console.log(`   • Failed updates: ${failed}`);
    
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await browser.close();
  }
}

// Run the update
updateSwissDevJobsSalaries();