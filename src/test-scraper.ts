import { JobOrchestrationService } from './services/JobOrchestrationService';
import { SupabaseService } from './services/SupabaseService';

async function testScrapers() {
  const orchestrator = new JobOrchestrationService();
  const supabaseService = new SupabaseService();
  
  console.log('🧪 Testing JobOrchestrationService with full processing flow...\n');
  
  // Get initial stats
  console.log('📊 Initial database stats:');
  const initialStats = await supabaseService.getJobStats();
  console.log(`   • Total jobs: ${initialStats.total}`);
  console.log(`   • Active jobs: ${initialStats.active}`);
  console.log(`   • Inactive jobs: ${initialStats.inactive}`);
  console.log('\n');
  
  // Test individual scrapers
  try {
    console.log('=== Testing Arbeitnow Scraper (API-based) ===');
    await orchestrator.runScraper('arbeitnow');
    
    console.log('\n=== Checking Arbeitnow Results ===');
    const arbeitnowJobs = await supabaseService.getJobsBySource('arbeitnow', 5);
    console.log(`✅ Sample of Arbeitnow jobs in database:`);
    arbeitnowJobs.forEach((job, i) => {
      console.log(`   ${i + 1}. ${job.job_title} at ${job.company}`);
      console.log(`      Location: ${job.location}`);
      console.log(`      Technologies: ${job.technologies?.map(t => t.name).join(', ') || 'None'}`);
    });
    
    console.log('\n=== Testing SwissDevJobs Scraper (Browser-based) ===');
    console.log('Note: This scraper uses browser automation and may take longer...');
    await orchestrator.runScraper('swissdevjobs');
    
    console.log('\n=== Checking SwissDevJobs Results ===');
    const swissdevJobs = await supabaseService.getJobsBySource('swissdevjobs', 5);
    console.log(`✅ Sample of SwissDevJobs in database:`);
    swissdevJobs.forEach((job, i) => {
      console.log(`   ${i + 1}. ${job.job_title} at ${job.company}`);
      console.log(`      Location: ${job.location}`);
      console.log(`      Salary: ${job.salary || 'Not specified'}`);
      console.log(`      Technologies: ${job.technologies?.map(t => t.name).join(', ') || 'None'}`);
    });
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
  }
  
  // Final stats
  console.log('\n📊 Final database stats:');
  const finalStats = await supabaseService.getJobStats();
  console.log(`   • Total jobs: ${finalStats.total} (${finalStats.total - initialStats.total >= 0 ? '+' : ''}${finalStats.total - initialStats.total})`);
  console.log(`   • Active jobs: ${finalStats.active} (${finalStats.active - initialStats.active >= 0 ? '+' : ''}${finalStats.active - initialStats.active})`);
  console.log(`   • Inactive jobs: ${finalStats.inactive} (${finalStats.inactive - initialStats.inactive >= 0 ? '+' : ''}${finalStats.inactive - initialStats.inactive})`);
  
  console.log('\n✅ Testing completed!');
}

// Run tests
testScrapers().catch(console.error);