import { JobOrchestrationService } from './services/JobOrchestrationService';
import { SupabaseService } from './services/SupabaseService';

async function testArbeitnow() {
  const orchestrator = new JobOrchestrationService();
  const supabaseService = new SupabaseService();
  
  console.log('🧪 Testing Arbeitnow scraper with complete flow...\n');
  
  // Get initial stats
  console.log('📊 Initial database stats:');
  const initialStats = await supabaseService.getJobStats();
  console.log(`   • Total jobs: ${initialStats.total}`);
  console.log(`   • Active jobs: ${initialStats.active}`);
  console.log(`   • Inactive jobs: ${initialStats.inactive}`);
  
  // Run scraper
  console.log('\n=== Running Arbeitnow Scraper ===');
  await orchestrator.runScraper('arbeitnow');
  
  // Check results
  console.log('\n=== Database Results ===');
  const jobs = await supabaseService.getJobsBySource('arbeitnow', 10);
  console.log(`✅ Found ${jobs.length} active Arbeitnow jobs in database\n`);
  
  console.log('Sample jobs:');
  jobs.forEach((job, i) => {
    console.log(`\n${i + 1}. ${job.job_title}`);
    console.log(`   Company: ${job.company}`);
    console.log(`   Location: ${job.location}`);
    console.log(`   Technologies: ${job.technologies?.map(t => t.name).join(', ') || 'None'}`);
    console.log(`   URL: ${job.job_url}`);
  });
  
  // Final stats
  console.log('\n📊 Final database stats:');
  const finalStats = await supabaseService.getJobStats();
  console.log(`   • Total jobs: ${finalStats.total} (${finalStats.total - initialStats.total >= 0 ? '+' : ''}${finalStats.total - initialStats.total})`);
  console.log(`   • Active jobs: ${finalStats.active} (${finalStats.active - initialStats.active >= 0 ? '+' : ''}${finalStats.active - initialStats.active})`);
  console.log(`   • Inactive jobs: ${finalStats.inactive} (${finalStats.inactive - initialStats.inactive >= 0 ? '+' : ''}${finalStats.inactive - initialStats.inactive})`);
  
  console.log('\n✅ Test completed successfully!');
}

testArbeitnow().catch(console.error);