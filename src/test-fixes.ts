import { ArbeitnowScraper } from './scrapers/ArbeitnowScraper';
import { isITJob } from './utils/itJobFilter';

async function testFixes() {
  console.log('🧪 Testing bug fixes...\n');
  
  // Test 1: IT Filter for Bauleiter jobs
  console.log('=== Test 1: IT Job Filter ===');
  const testJobs = [
    {
      title: "Bauleiter für den Leitungsbau Stromtrasse (w/m/d)",
      description: "Construction manager position with Git knowledge",
      technologies: ["Git", "Construction engineering"]
    },
    {
      title: "Senior Software Engineer",
      description: "Build scalable applications with React and Node.js",
      technologies: ["React", "Node.js", "TypeScript"]
    },
    {
      title: "Marketing Manager", 
      description: "Lead marketing campaigns",
      technologies: []
    }
  ];
  
  testJobs.forEach(job => {
    const isIT = isITJob(job.title, job.description, job.technologies);
    console.log(`\n"${job.title}"`);
    console.log(`  Technologies: ${job.technologies.join(', ') || 'None'}`);
    console.log(`  Is IT Job: ${isIT ? '✅ YES' : '❌ NO'}`);
  });
  
  // Test 2: Arbeitnow pagination
  console.log('\n\n=== Test 2: Arbeitnow Pagination ===');
  console.log('Testing if scraper fetches multiple pages...\n');
  
  const scraper = new ArbeitnowScraper();
  
  try {
    const result = await scraper.scrapeWithoutBrowser();
    
    console.log(`\n📊 Scraping Results:`);
    console.log(`   • Total jobs fetched: ${result.totalFetched}`);
    console.log(`   • Total jobs processed: ${result.jobs.length}`);
    console.log(`   • Expected multiple pages: ${result.totalFetched > 100 ? '✅ YES' : '❌ NO'}`);
    
    if (result.totalFetched > 100) {
      console.log(`   • Pages fetched: ~${Math.ceil(result.totalFetched / 100)}`);
    }
    
    // Check if Bauleiter jobs are in the results
    const bauleiterJobs = result.jobs.filter(job => 
      job.job_title.toLowerCase().includes('bauleiter')
    );
    
    console.log(`\n🔍 Bauleiter jobs found: ${bauleiterJobs.length}`);
    if (bauleiterJobs.length > 0) {
      console.log('   These should be filtered out during processing');
      bauleiterJobs.slice(0, 3).forEach(job => {
        console.log(`   - ${job.job_title} at ${job.company}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error during scraping:', error);
  }
  
  console.log('\n✅ Test completed!');
}

testFixes().catch(console.error);