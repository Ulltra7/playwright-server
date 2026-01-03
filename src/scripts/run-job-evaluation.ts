import { JobEvaluationService } from '../services/JobEvaluationService';
import * as dotenv from 'dotenv';

dotenv.config();

async function runJobEvaluation() {
  const forceRewrite = process.argv.includes('--force-rewrite');

  console.log('🔍 Manually triggering job evaluation...');
  console.log('📅 Current time:', new Date().toLocaleString('de-CH', { timeZone: 'Europe/Zurich' }));
  if (forceRewrite) {
    console.log('⚠️  Force rewrite enabled - will re-evaluate all jobs');
  }

  const evaluationService = new JobEvaluationService();

  try {
    await evaluationService.evaluateSwissDevJobs({ forceRewrite });
    console.log('\n✅ Job evaluation completed successfully!');
  } catch (error) {
    console.error('❌ Error during job evaluation:', error);
    process.exit(1);
  }
}

runJobEvaluation().catch(console.error);
