import { CronJobService } from '../services/CronJobService';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function runCronJob() {
  console.log('🚀 Manually triggering cron job...');
  console.log('📅 Current time:', new Date().toLocaleString('de-CH', { timeZone: 'Europe/Zurich' }));
  
  const cronService = new CronJobService();
  
  try {
    console.log('\n=== Running all scrapers (as cron job would) ===\n');
    await cronService.runAllScrapers();
    
    console.log('\n✅ Cron job execution completed successfully!');
  } catch (error) {
    console.error('❌ Error during cron job execution:', error);
    process.exit(1);
  }
}

// Run the cron job
runCronJob().catch(console.error);