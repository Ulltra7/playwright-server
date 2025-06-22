import { SupabaseService } from '../services/SupabaseService';
import * as dotenv from 'dotenv';

dotenv.config();

async function viewKeywordStats() {
  const supabaseService = new SupabaseService();
  
  console.log('📊 Keyword Learning Statistics\n');
  
  // Get keyword counts by category
  const { data: categoryCounts, error: countError } = await supabaseService.supabase
    .from('job_category_keywords')
    .select('category')
    .order('category');
    
  if (categoryCounts) {
    const counts: Record<string, number> = {};
    categoryCounts.forEach(row => {
      counts[row.category] = (counts[row.category] || 0) + 1;
    });
    
    console.log('Keywords per category:');
    Object.entries(counts).forEach(([category, count]) => {
      console.log(`  ${category}: ${count} keywords`);
    });
  }
  
  // Get top learned keywords
  console.log('\n🏆 Top AI-learned keywords:');
  const { data: topKeywords } = await supabaseService.supabase
    .from('job_category_keywords')
    .select('keyword, category, hit_count, weight')
    .eq('source', 'ai_learned')
    .order('hit_count', { ascending: false })
    .limit(20);
    
  if (topKeywords) {
    topKeywords.forEach(kw => {
      console.log(`  "${kw.keyword}" → ${kw.category} (hits: ${kw.hit_count}, weight: ${kw.weight})`);
    });
  }
  
  // Get recent AI categorizations
  console.log('\n🤖 Recent AI categorizations:');
  const { data: recentAI } = await supabaseService.supabase
    .from('job_categorization_history')
    .select('job_title, ai_category, created_at')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (recentAI) {
    recentAI.forEach(job => {
      console.log(`  "${job.job_title}" → ${job.ai_category}`);
    });
  }
}

async function addKeyword(category: string, keyword: string, type: 'title' | 'technology', weight: number = 1.5) {
  const supabaseService = new SupabaseService();
  
  const { error } = await supabaseService.supabase
    .from('job_category_keywords')
    .insert({
      category,
      keyword: keyword.toLowerCase(),
      keyword_type: type,
      weight,
      source: 'manual'
    });
    
  if (error) {
    console.error('❌ Failed to add keyword:', error.message);
  } else {
    console.log(`✅ Added keyword "${keyword}" to ${category}`);
  }
}

async function clearAILearnedKeywords() {
  const supabaseService = new SupabaseService();
  
  console.log('⚠️  This will delete all AI-learned keywords. Are you sure? (yes/no)');
  
  // In a real CLI, you'd wait for user input here
  // For now, we'll just show what would happen
  
  const { count } = await supabaseService.supabase
    .from('job_category_keywords')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'ai_learned');
    
  console.log(`Would delete ${count} AI-learned keywords`);
}

// Main CLI
async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'stats':
      await viewKeywordStats();
      break;
      
    case 'add':
      const [, , , category, keyword, type, weight] = process.argv;
      if (!category || !keyword || !type) {
        console.log('Usage: npm run manage-keywords add <category> <keyword> <title|technology> [weight]');
        break;
      }
      await addKeyword(category, keyword, type as 'title' | 'technology', parseFloat(weight) || 1.5);
      break;
      
    case 'clear-ai':
      await clearAILearnedKeywords();
      break;
      
    default:
      console.log(`
📚 Keyword Management Tool

Commands:
  stats              - View keyword statistics and AI learning progress
  add                - Add a new keyword
  clear-ai           - Clear all AI-learned keywords

Examples:
  npm run manage-keywords stats
  npm run manage-keywords add frontend_developer "react developer" title 1.5
  npm run manage-keywords add backend_developer "django" technology 1.5
  npm run manage-keywords clear-ai
      `);
  }
}

main().catch(console.error);