import { SupabaseService } from './services/SupabaseService';

async function testStatistics() {
  const supabaseService = new SupabaseService();
  
  console.log('🧪 Testing statistics endpoints...\n');
  
  try {
    // Test 1: Job counts by role
    console.log('=== Test 1: Job Counts by Role ===');
    const roleCounts = await supabaseService.getActiveJobCountsByRole();
    const totalJobsByRole = Object.values(roleCounts).reduce((sum, count) => sum + count, 0);
    
    console.log(`Total active jobs: ${totalJobsByRole}\n`);
    
    Object.entries(roleCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .forEach(([role, count]) => {
        const percentage = ((count / totalJobsByRole) * 100).toFixed(1);
        console.log(`${role.padEnd(25)} ${count.toString().padStart(4)} (${percentage}%)`);
      });
    
    // Test 2: Job counts by technology
    console.log('\n\n=== Test 2: Job Counts by Technology (Top 20) ===');
    const techCounts = await supabaseService.getActiveJobCountsByTechnology();
    const totalTechOccurrences = Object.values(techCounts).reduce((sum, count) => sum + count, 0);
    
    console.log(`Total technology occurrences: ${totalTechOccurrences}`);
    console.log(`Unique technologies: ${Object.keys(techCounts).length}\n`);
    
    Object.entries(techCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .forEach(([tech, count], index) => {
        console.log(`${(index + 1).toString().padStart(2)}. ${tech.padEnd(25)} ${count.toString().padStart(4)} jobs`);
      });
    
    // Show endpoint URLs
    console.log('\n\n📊 API Endpoints:');
    console.log('- Role Statistics: http://localhost:3001/api/statistics/jobs/by-role');
    console.log('- Technology Statistics: http://localhost:3001/api/statistics/jobs/by-technology');
    console.log('- Technology Statistics (limit): http://localhost:3001/api/statistics/jobs/by-technology?limit=100');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  console.log('\n✅ Test completed!');
}

testStatistics().catch(console.error);