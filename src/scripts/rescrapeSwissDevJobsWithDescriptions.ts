import { CronJobService } from "../services/CronJobService";

async function rescrapeSwissDevJobsWithDescriptions() {
  console.log("🚀 Starting SwissDevJobs scraping with descriptions...\n");
  
  const cronJobService = new CronJobService();
  
  try {
    // Use the CronJobService to run the scraping with descriptions
    await cronJobService.runSwissDevJobsScraping();
    
    // Step 2: Process jobs in batches to fetch descriptions
    const batchSize = 10;
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    console.log(`\n📄 Fetching descriptions in batches of ${batchSize}...`);
    
    for (let i = 0; i < allJobs.length; i += batchSize) {
      const batch = allJobs.slice(i, Math.min(i + batchSize, allJobs.length));
      console.log(`\n📦 Processing batch ${Math.floor(i/batchSize) + 1} (jobs ${i + 1}-${Math.min(i + batchSize, allJobs.length)})...`);
      
      // Fetch descriptions for this batch
      for (const job of batch) {
        try {
          console.log(`   Fetching: ${job.title} at ${job.company}`);
          
          await page.goto(job.url, { 
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
          
          await page.waitForTimeout(500); // Small delay between requests
          
        } catch (error) {
          console.log(`   ⚠️ Failed to fetch description: ${error}`);
          job.description = "Failed to fetch description";
        }
      }
      
      // Save this batch to database
      console.log(`\n💾 Saving batch ${Math.floor(i/batchSize) + 1} to database...`);
      
      const jobsWithTechnologies = batch.map(job => ({
        job: {
          job_title: job.title,
          company: job.company,
          location: job.location,
          job_url: job.url,
          salary: job.salary,
          description: job.description,
          requirements: job.requirements?.join("\n"),
          source_id: "",
          scraped_at: new Date(),
          application_status: "not_applied" as const,
          priority: "medium" as const,
          source: { 
            name: "swissdevjobs", 
            display_name: "Swiss Dev Jobs",
            base_url: "https://swissdevjobs.ch"
          },
        },
        technologies: job.technologies || [],
      }));

      const insertResult = await supabaseService.bulkInsertJobs(jobsWithTechnologies);
      console.log(`   • Saved: ${insertResult.inserted}, Skipped: ${insertResult.skipped}, Errors: ${insertResult.errors.length}`);
    }
    
    await browser.close();
    
    // Final statistics
    const jobsWithDescriptions = allJobs.filter(j => 
      j.description && 
      j.description !== "No description available" && 
      j.description !== "Failed to fetch description"
    ).length;
    
    console.log(`\n✅ Scraping complete!`);
    console.log(`   • Total jobs processed: ${allJobs.length}`);
    console.log(`   • Jobs with descriptions: ${jobsWithDescriptions}`);
    console.log(`   • Success rate: ${Math.round(jobsWithDescriptions / allJobs.length * 100)}%`);
    
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

rescrapeSwissDevJobsWithDescriptions();