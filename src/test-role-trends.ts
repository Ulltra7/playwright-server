import { SupabaseService } from './services/SupabaseService';

async function testRoleTrends() {
  const supabaseService = new SupabaseService();
  
  console.log('🧪 Testing job role trends by week...\n');
  
  try {
    // Test with default 12 weeks
    const trends = await supabaseService.getJobRoleTrendsByWeek(12);
    
    console.log(`📊 Job Role Trends Analysis`);
    console.log(`Period: ${trends.period.start} to ${trends.period.end}`);
    console.log(`Weeks analyzed: ${trends.period.weeksIncluded}\n`);
    
    // Show weekly totals
    console.log('📈 Weekly Job Additions:');
    trends.data.forEach((week: any) => {
      const bar = '█'.repeat(Math.round(week.total / 10));
      console.log(`${week.weekDisplay.padEnd(20)} ${week.total.toString().padStart(4)} ${bar}`);
    });
    
    // Show role summary
    console.log('\n🎯 Role Summary (Top 10):');
    console.log('Role'.padEnd(25) + 'Total'.padStart(8) + 'Last Week'.padStart(12) + 'Change'.padStart(10));
    console.log('-'.repeat(55));
    
    trends.summary.slice(0, 10).forEach((role: any) => {
      const changeSymbol = role.change > 0 ? '📈' : role.change < 0 ? '📉' : '➡️';
      const changeText = role.change > 0 ? `+${role.change}%` : `${role.change}%`;
      console.log(
        `${role.role.padEnd(25)}` +
        `${role.total.toString().padStart(8)}` +
        `${role.lastWeek.toString().padStart(12)}` +
        `${changeText.padStart(9)} ${changeSymbol}`
      );
    });
    
    // Show a specific role trend
    const devRole = trends.summary.find((r: any) => r.role === 'Software Developer');
    if (devRole) {
      console.log('\n📊 Software Developer Trend:');
      console.log('Week by week: ' + devRole.trend.join(' → '));
    }
    
    // Test endpoint URLs
    console.log('\n📡 API Endpoints:');
    console.log('- Default (12 weeks): http://localhost:3001/api/statistics/jobs/role-trends');
    console.log('- Custom period: http://localhost:3001/api/statistics/jobs/role-trends?weeks=8');
    console.log('- Max period (52 weeks): http://localhost:3001/api/statistics/jobs/role-trends?weeks=52');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  console.log('\n✅ Test completed!');
}

testRoleTrends().catch(console.error);