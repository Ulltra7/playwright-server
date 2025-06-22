import { JobOrchestrationService } from './services/JobOrchestrationService';
import { SupabaseService } from './services/SupabaseService';

async function testDatabaseImpact() {
  const orchestrator = new JobOrchestrationService();
  const supabaseService = new SupabaseService();
  
  console.log('🧪 Testing database impact of fixes...\n');
  
  // Get initial stats
  console.log('📊 Initial database stats:');
  const initialStats = await supabaseService.getJobStats();
  console.log(`   • Total jobs: ${initialStats.total}`);
  console.log(`   • Active jobs: ${initialStats.active}`);
  console.log(`   • Inactive jobs: ${initialStats.inactive}`);
  
  // Run Arbeitnow scraper with fixes
  console.log('\n=== Running Arbeitnow Scraper with fixes ===');
  console.log('Expected changes:');
  console.log('   • Should fetch ~1,268 jobs (all pages)');
  console.log('   • Should filter out ~52 Bauleiter jobs');
  console.log('   • Should mark fewer jobs as inactive\n');
  
  await orchestrator.runScraper('arbeitnow');
  
  // Final stats
  console.log('\n📊 Final database stats:');
  const finalStats = await supabaseService.getJobStats();
  console.log(`   • Total jobs: ${finalStats.total} (${finalStats.total - initialStats.total >= 0 ? '+' : ''}${finalStats.total - initialStats.total})`);
  console.log(`   • Active jobs: ${finalStats.active} (${finalStats.active - initialStats.active >= 0 ? '+' : ''}${finalStats.active - initialStats.active})`);
  console.log(`   • Inactive jobs: ${finalStats.inactive} (${finalStats.inactive - initialStats.inactive >= 0 ? '+' : ''}${finalStats.inactive - initialStats.inactive})`);
  
  // Check Bauleiter jobs
  console.log('\n🔍 Checking for Bauleiter jobs in database:');
  const { data: bauleiterJobs } = await supabaseService.supabase
    .from('jobs')
    .select('job_title, company')
    .ilike('job_title', '%bauleiter%')
    .eq('is_active', true)
    .limit(5);
    
  if (bauleiterJobs && bauleiterJobs.length > 0) {
    console.log(`❌ Found ${bauleiterJobs.length} active Bauleiter jobs (should be 0):`);
    bauleiterJobs.forEach(job => {
      console.log(`   - ${job.job_title} at ${job.company}`);
    });
  } else {
    console.log('✅ No active Bauleiter jobs found (correct!)');
  }
  
  console.log('\n✅ Test completed!');
}

testDatabaseImpact().catch(console.error);