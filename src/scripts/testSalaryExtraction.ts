import { chromium } from 'playwright';

async function testSalaryExtraction() {
  console.log("🧪 Testing salary extraction from SwissDevJobs...\n");
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://swissdevjobs.ch/');
    await page.waitForSelector('.card', { timeout: 10000 });
    
    // Get first 5 job cards with salary info
    const jobs = await page.$$eval('.card', (cards) => {
      return cards.slice(0, 5).map((card, index) => {
        // Get job title
        const titleLink = card.querySelector('a[href*="/job"]');
        const title = titleLink?.textContent?.trim() || "";
        
        // Get company
        const companySpan = card.querySelector('span[aria-label="hiring organization"]');
        const company = companySpan?.textContent?.trim() || "Not found";
        
        // Get salary
        const salaryDiv = card.querySelector('div[aria-label="annual salary range"]');
        const salary = salaryDiv?.textContent?.trim() || "Not found";
        
        return {
          index: index + 1,
          title,
          company,
          salary,
          hasSalary: !!salaryDiv
        };
      });
    });
    
    // Print results
    console.log("📋 Jobs with salary information:");
    for (const job of jobs) {
      console.log(`\n${job.index}. ${job.title}`);
      console.log(`   Company: ${job.company}`);
      console.log(`   Salary: ${job.salary} (found: ${job.hasSalary})`);
    }
    
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await browser.close();
  }
}

testSalaryExtraction();