import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

// Load environment variables
dotenv.config();

async function getAllJobTitles() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables");
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("📊 Fetching all job titles from database...\n");

  try {
    // Get all unique job titles with count
    const { data, error } = await supabase
      .from("job_applications")
      .select("job_title")
      .order("job_title", { ascending: true });

    if (error) {
      console.error("Error fetching job titles:", error);
      return;
    }

    // Count occurrences of each title
    const titleCounts = new Map<string, number>();
    data.forEach((job: any) => {
      const title = job.job_title;
      titleCounts.set(title, (titleCounts.get(title) || 0) + 1);
    });

    // Sort by title
    const sortedTitles = Array.from(titleCounts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]));

    // Create output
    let output = "ALL JOB TITLES IN DATABASE\n";
    output += "==========================\n\n";
    output += `Total unique job titles: ${sortedTitles.length}\n\n`;
    output += "Job Title | Count\n";
    output += "---------|-------\n";

    const justTitles: string[] = [];

    sortedTitles.forEach(([title, count]) => {
      output += `${title} | ${count}\n`;
      justTitles.push(title);
    });

    // Save to file
    const outputDir = path.join(process.cwd(), "output");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `job-titles-${timestamp}.txt`;
    const filepath = path.join(outputDir, filename);

    fs.writeFileSync(filepath, output);
    console.log(`✅ Saved full report to: ${filepath}\n`);

    // Also save just the titles (easier to share with AI)
    const titlesOnlyFile = `job-titles-only-${timestamp}.txt`;
    const titlesOnlyPath = path.join(outputDir, titlesOnlyFile);
    fs.writeFileSync(titlesOnlyPath, justTitles.join("\n"));
    console.log(`✅ Saved titles only to: ${titlesOnlyPath}\n`);

    // Print first 20 titles as preview
    console.log("📋 Preview of job titles (first 20):");
    console.log("=====================================");
    sortedTitles.slice(0, 20).forEach(([title, count]) => {
      console.log(`${title} (${count}x)`);
    });
    console.log("\n... and more in the output files");

    // Print some statistics
    console.log("\n📊 Statistics:");
    console.log(`Total jobs: ${data.length}`);
    console.log(`Unique titles: ${sortedTitles.length}`);
    
    // Find potential non-IT jobs based on simple keywords
    const suspiciousKeywords = [
      'sales', 'verkauf', 'vertrieb', 'account', 'business development',
      'marketing', 'content', 'social media', 'brand',
      'finance', 'accounting', 'buchhalter', 'controller',
      'hr', 'human resources', 'recruiting', 'talent',
      'office', 'assistant', 'secretary', 'admin',
      'legal', 'lawyer', 'jurist', 'compliance',
      'customer', 'support', 'service', 'help desk',
      'operations', 'supply chain', 'logistics',
      'real estate', 'property', 'facility'
    ];

    console.log("\n⚠️  Potentially non-IT job titles found:");
    let suspiciousCount = 0;
    sortedTitles.forEach(([title, count]) => {
      const titleLower = title.toLowerCase();
      for (const keyword of suspiciousKeywords) {
        if (titleLower.includes(keyword) && !titleLower.includes('software') && !titleLower.includes('engineer') && !titleLower.includes('developer')) {
          console.log(`   • ${title} (${count}x)`);
          suspiciousCount++;
          break;
        }
      }
    });
    console.log(`\nTotal suspicious titles: ${suspiciousCount}`);

  } catch (error) {
    console.error("Error:", error);
  }
}

// Run the script
getAllJobTitles();