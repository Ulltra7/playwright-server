import { SupabaseService } from "../services/SupabaseService";

async function testJobRolesViews() {
  console.log("🧪 Testing job roles views...\n");
  
  const supabaseService = new SupabaseService();
  
  try {
    // Test 1: Get weekly job roles data
    console.log("📊 Testing job_roles_weekly view...");
    const weeklyData = await supabaseService.getJobRolesWeekly();
    console.log(`Found ${weeklyData.length} weekly role entries`);
    
    if (weeklyData.length > 0) {
      console.log("\nSample weekly data:");
      weeklyData.slice(0, 5).forEach(entry => {
        console.log(`  Week ${entry.week_label}: ${entry.main_role} - ${entry.job_count} jobs`);
        if (entry.week_change !== null) {
          console.log(`    Change: ${entry.week_change > 0 ? '+' : ''}${entry.week_change} (${entry.percentage_change}%)`);
        }
      });
    }
    
    // Test 2: Get current week data
    console.log("\n📈 Testing job_roles_current_week view...");
    const currentWeekData = await supabaseService.getJobRolesCurrentWeek();
    console.log(`Found ${currentWeekData.length} roles for current week`);
    
    if (currentWeekData.length > 0) {
      console.log("\nTop 5 roles this week:");
      currentWeekData.slice(0, 5).forEach(entry => {
        console.log(`  #${entry.popularity_rank} ${entry.main_role}: ${entry.job_count} jobs`);
        if (entry.week_change !== null) {
          console.log(`      Week change: ${entry.week_change > 0 ? '+' : ''}${entry.week_change}`);
        }
      });
    }
    
    // Test 3: Get trend data
    console.log("\n📉 Testing job_roles_trend view...");
    const trendData = await supabaseService.getJobRolesTrend();
    console.log(`Found ${trendData.length} trend entries`);
    
    if (trendData.length > 0) {
      // Group by role to show trends
      const roleGroups = trendData.reduce((acc, entry) => {
        if (!acc[entry.main_role]) {
          acc[entry.main_role] = [];
        }
        acc[entry.main_role].push(entry);
        return acc;
      }, {} as Record<string, any[]>);
      
      console.log("\nTrend for top roles (last 4 weeks):");
      Object.entries(roleGroups).slice(0, 3).forEach(([role, entries]) => {
        console.log(`\n  ${role}:`);
        (entries as any[]).forEach((entry: any) => {
          console.log(`    ${entry.week_label}: ${entry.job_count} jobs`);
        });
      });
    }
    
    // Test 4: Test the distribution view if it exists
    console.log("\n🥧 Testing job_roles_distribution view...");
    try {
      const { data: distributionData, error } = await supabaseService['supabase']
        .from('job_roles_distribution')
        .select('*')
        .limit(10);
        
      if (error) {
        console.log("Distribution view not available:", error.message);
      } else if (distributionData && distributionData.length > 0) {
        console.log(`\nRole distribution (top ${distributionData.length}):`);
        distributionData.forEach(entry => {
          console.log(`  ${entry.main_role}: ${entry.job_count} jobs (${entry.percentage}%)`);
        });
      }
    } catch (e) {
      console.log("Could not test distribution view");
    }
    
  } catch (error) {
    console.error("❌ Error testing views:", error);
  }
}

testJobRolesViews();