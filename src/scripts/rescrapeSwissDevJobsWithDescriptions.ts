import { SwissDevJobsScraper } from '../scrapers/SwissDevJobsScraper';
import { SupabaseService } from '../services/SupabaseService';
import { chromium } from 'playwright';
import * as dotenv from 'dotenv';

dotenv.config();

async function rescrapeWithDescriptions() {
  console.log('🔄 Starting SwissDevJobs rescrape with descriptions...\n');
  
  const scraper = new SwissDevJobsScraper();
  const supabaseService = new SupabaseService();
  
  try {
    // Scrape all jobs first
    console.log('📊 Fetching all jobs from SwissDevJobs...');
    const result = await scraper.scrapeJobs();
    
    if (!result.jobs || result.jobs.length === 0) {
      console.log('❌ No jobs found to process');
      return;
    }
    
    console.log(`✅ Found ${result.jobs.length} jobs\n`);
    
    // Now fetch descriptions using a separate browser instance
    console.log('📄 Fetching detailed descriptions for all jobs...');
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    const allJobs = result.jobs;
    const batchSize = 10;
    
    for (let i = 0; i < allJobs.length; i += batchSize) {
      const batch = allJobs.slice(i, i + batchSize);
      console.log(`\n📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(allJobs.length/batchSize)}...`);
      
      for (const job of batch) {
        try {
          console.log(`   Fetching: ${job.job_title} at ${job.company}`);
          
          await page.goto(job.job_url, { 
            waitUntil: 'networkidle',
            timeout: 15000 
          });

          // Wait for job details to load
          await page.waitForSelector('.job-details-section-box', { timeout: 5000 });

          // Extract description
          const description = await page.evaluate(() => {
            const sectionBoxes = Array.from(document.querySelectorAll('.job-details-section-box'));
            
            const descriptionBox = sectionBoxes.find(box => {
              const titleElement = box.querySelector('h2, h3, h4, .section-title');
              return titleElement && titleElement.textContent?.toLowerCase().includes('description');
            });

            if (descriptionBox) {
              const title = descriptionBox.querySelector('h2, h3, h4, .section-title');
              if (title) {
                title.remove();
              }
              return descriptionBox.textContent?.trim() || "";
            }

            const fallbackBox = sectionBoxes.find(box => {
              const text = box.textContent?.toLowerCase() || "";
              return text.includes('responsibilities') || text.includes('what you') || text.includes('role');
            });

            return fallbackBox ? fallbackBox.textContent?.trim() || "" : "";
          });

          job.description = description || "No description available";
          console.log(`   ✅ Got description (${job.description.length} chars)`);
          
        } catch (error) {
          console.log(`   ⚠️ Failed to fetch description: ${error}`);
          job.description = "Failed to fetch description";
        }
      }
      
      // Save this batch to database
      console.log(`\n💾 Saving batch ${Math.floor(i/batchSize) + 1} to database...`);
      
      // Jobs are already in JobInput format, just add descriptions
      const insertResult = await supabaseService.bulkInsertJobs(batch);
      console.log(`   • Saved: ${insertResult.inserted}, Skipped: ${insertResult.skipped}, Errors: ${insertResult.errors.length}`);
    }
    
    await browser.close();
    
    // Final statistics
    const jobsWithDescriptions = allJobs.filter(j => 
      j.description && j.description !== "Failed to fetch description"
    ).length;
    
    console.log(`\n🎉 Rescrape completed!`);
    console.log(`   • Total jobs: ${allJobs.length}`);
    console.log(`   • With descriptions: ${jobsWithDescriptions}`);
    console.log(`   • Failed: ${allJobs.length - jobsWithDescriptions}`);
    console.log(`\n🔍 Sample of jobs:`);
    allJobs.slice(0, 5).forEach(job => {
      console.log(`   • ${job.job_title} at ${job.company}`);
      console.log(`     Description: ${job.description?.substring(0, 100)}...`);
    });
    
  } catch (error) {
    console.error('❌ Error during rescrape:', error);
  }
}

// Run the rescrape
rescrapeWithDescriptions().catch(console.error);