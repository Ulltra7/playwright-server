import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

async function createJobRolesViews() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('📊 Creating job roles weekly views...\n');

    // Read the SQL file
    const sqlPath = path.join(__dirname, '../../database/job_roles_weekly_view_fixed.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Split SQL statements (simple split by semicolon - may need refinement for complex SQL)
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'; // Re-add semicolon
      
      // Skip if it's just a comment or empty
      if (statement.trim().startsWith('--') || statement.trim().length <= 1) {
        continue;
      }

      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      
      // For view creation, we need to use raw SQL through Supabase RPC
      // Since Supabase JS client doesn't support direct DDL, we'll need to create an RPC function
      // For now, let's log what we would execute
      console.log(`Statement preview: ${statement.substring(0, 50)}...`);
      
      // Note: To execute these, you'll need to run them directly in Supabase SQL Editor
    }

    console.log('\n⚠️  Note: Please copy the contents of database/job_roles_weekly_view_fixed.sql');
    console.log('and run it directly in your Supabase SQL Editor at:');
    console.log(`${supabaseUrl}/project/default/sql`);
    
    // Let's at least test the data to see what we have
    console.log('\n📊 Testing current job data...');
    
    const { data: jobCount, error: jobError } = await supabase
      .from('job_applications')
      .select('id', { count: 'exact', head: true });
      
    if (jobError) {
      console.error('Error counting jobs:', jobError);
    } else {
      console.log(`Total jobs in database: ${jobCount}`);
    }

    // Check if job_roles table exists
    const { data: roles, error: rolesError } = await supabase
      .from('job_roles')
      .select('*');
      
    if (rolesError) {
      console.error('Error fetching job roles:', rolesError);
      console.log('\n⚠️  job_roles table might not exist. Please run job_roles_normalized_schema.sql first.');
    } else {
      console.log(`Found ${roles?.length || 0} job roles defined`);
    }

    // Check technology_job_roles relationships
    const { data: techRoles, error: techRolesError } = await supabase
      .from('technology_job_roles')
      .select('*')
      .limit(5);
      
    if (techRolesError) {
      console.error('Error fetching technology-role relationships:', techRolesError);
    } else {
      console.log(`Found ${techRoles?.length || 0} technology-role relationships (showing first 5)`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createJobRolesViews();