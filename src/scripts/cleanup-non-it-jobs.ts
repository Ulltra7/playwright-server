import { SupabaseService } from '../services/SupabaseService';
import { isITJob } from '../utils/itJobFilter';

async function cleanupNonITJobs() {
  const supabaseService = new SupabaseService();
  
  console.log('🧹 Cleaning up non-IT jobs from database...\n');
  
  // Get all active jobs
  const { data: allJobs, error } = await supabaseService.supabase
    .from('jobs')
    .select('id, job_title, description')
    .eq('is_active', true);
    
  if (error || !allJobs) {
    console.error('Error fetching jobs:', error);
    return;
  }
  
  console.log(`📊 Checking ${allJobs.length} active jobs...\n`);
  
  const nonITJobs = [];
  
  // Check each job with our updated filter
  for (const job of allJobs) {
    if (!isITJob(job.job_title, job.description)) {
      nonITJobs.push(job);
    }
  }
  
  console.log(`🔍 Found ${nonITJobs.length} non-IT jobs to clean up:\n`);
  
  // Group by job title pattern
  const jobGroups: { [key: string]: number } = {};
  nonITJobs.forEach(job => {
    const titleStart = job.job_title.split(' ')[0];
    jobGroups[titleStart] = (jobGroups[titleStart] || 0) + 1;
  });
  
  Object.entries(jobGroups).forEach(([title, count]) => {
    console.log(`   • ${title}*: ${count} jobs`);
  });
  
  if (nonITJobs.length > 0) {
    console.log('\n⚠️  Marking these jobs as inactive...');
    
    const jobIds = nonITJobs.map(job => job.id);
    
    // Update in batches
    const batchSize = 100;
    let totalUpdated = 0;
    
    for (let i = 0; i < jobIds.length; i += batchSize) {
      const batch = jobIds.slice(i, i + batchSize);
      
      const { error: updateError } = await supabaseService.supabase
        .from('jobs')
        .update({ is_active: false })
        .in('id', batch);
        
      if (updateError) {
        console.error('Error updating batch:', updateError);
      } else {
        totalUpdated += batch.length;
        console.log(`   ✅ Updated batch ${Math.floor(i / batchSize) + 1}: ${batch.length} jobs`);
      }
    }
    
    console.log(`\n✅ Cleanup completed! Marked ${totalUpdated} non-IT jobs as inactive.`);
  } else {
    console.log('✅ No non-IT jobs found. Database is clean!');
  }
  
  // Show final stats
  const stats = await supabaseService.getJobStats();
  console.log('\n📊 Final database stats:');
  console.log(`   • Total jobs: ${stats.total}`);
  console.log(`   • Active jobs: ${stats.active}`);
  console.log(`   • Inactive jobs: ${stats.inactive}`);
}

cleanupNonITJobs().catch(console.error);