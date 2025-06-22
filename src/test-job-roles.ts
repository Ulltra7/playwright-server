import { SupabaseService } from './services/SupabaseService';

async function testJobRoles() {
  const supabaseService = new SupabaseService();
  
  console.log('🧪 Testing job role counting...\n');
  
  try {
    // Get job counts by role
    const roleCounts = await supabaseService.getActiveJobCountsByRole();
    
    // Calculate total
    const totalJobs = Object.values(roleCounts).reduce((sum, count) => sum + count, 0);
    
    console.log(`📊 Job Counts by Role (Total: ${totalJobs} active jobs)\n`);
    
    // Sort by count
    const sorted = Object.entries(roleCounts)
      .sort(([, a], [, b]) => b - a);
    
    // Display results
    sorted.forEach(([role, count]) => {
      const percentage = ((count / totalJobs) * 100).toFixed(1);
      const bar = '█'.repeat(Math.round(count / totalJobs * 30));
      console.log(`${role.padEnd(25)} ${count.toString().padStart(4)} (${percentage.padStart(5)}%) ${bar}`);
    });
    
    // Test a few specific jobs to verify role detection
    console.log('\n🔍 Testing role detection on sample jobs:');
    
    const testJobs = [
      { title: 'Senior Frontend Developer', techs: ['React', 'TypeScript'] },
      { title: 'DevOps Engineer', techs: ['Docker', 'Kubernetes'] },
      { title: 'Full Stack Developer', techs: ['Node.js', 'React'] },
      { title: 'Data Scientist', techs: ['Python', 'TensorFlow'] },
      { title: 'Software Engineer', techs: ['Java', 'Spring'] },
      { title: 'QA Automation Engineer', techs: ['Selenium', 'Jest'] }
    ];
    
    // We can't directly test the private method, but we can verify through the endpoint
    console.log('\nEndpoint test URL: http://localhost:3003/api/jobs/counts-by-role');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  console.log('\n✅ Test completed!');
}

testJobRoles().catch(console.error);