import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

interface TechnologyRoleMapping {
  technology_name: string;
  technology_category: string;
  job_role_name: string;
  job_role_display_name: string;
  relevance_score: number;
}

async function checkTechnologyRoleMappings() {
  // Initialize Supabase client
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase environment variables");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log("🔍 Checking technology-job role mappings...\n");

    // Get all mappings using the view
    const { data: mappings, error } = await supabase
      .from("technology_roles_view")
      .select("*")
      .order("technology_name")
      .order("relevance_score", { ascending: false });

    if (error) {
      console.error("Error fetching mappings:", error);
      process.exit(1);
    }

    if (!mappings || mappings.length === 0) {
      console.log("❌ No technology-role mappings found in the database!");
      console.log("Run 'npm run populate-tech-roles' to populate the mappings.");
      return;
    }

    // Group mappings by technology
    const mappingsByTech = new Map<string, TechnologyRoleMapping[]>();
    mappings.forEach(mapping => {
      const techName = mapping.technology_name;
      if (!mappingsByTech.has(techName)) {
        mappingsByTech.set(techName, []);
      }
      mappingsByTech.get(techName)!.push(mapping);
    });

    console.log(`📊 Found ${mappings.length} total mappings for ${mappingsByTech.size} technologies\n`);

    // Display mappings by technology category
    const categories = new Map<string, string[]>();
    mappingsByTech.forEach((_, techName) => {
      const category = mappings.find(m => m.technology_name === techName)?.technology_category || "uncategorized";
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(techName);
    });

    // Display by category
    Array.from(categories.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([category, techs]) => {
        console.log(`\n📁 ${category.toUpperCase()} (${techs.length} technologies)`);
        console.log("=" .repeat(50));
        
        techs.sort().forEach(techName => {
          const techMappings = mappingsByTech.get(techName)!;
          console.log(`\n  🔧 ${techName}:`);
          techMappings.forEach(mapping => {
            const scoreBar = "█".repeat(Math.floor(mapping.relevance_score / 10)) + 
                           "░".repeat(10 - Math.floor(mapping.relevance_score / 10));
            console.log(`     ${scoreBar} ${mapping.job_role_display_name} (${mapping.relevance_score}%)`);
          });
        });
      });

    // Summary statistics
    console.log("\n\n📈 Summary Statistics:");
    console.log("=" .repeat(50));
    
    // Count mappings per role
    const roleCounts = new Map<string, number>();
    mappings.forEach(mapping => {
      const roleName = mapping.job_role_display_name;
      roleCounts.set(roleName, (roleCounts.get(roleName) || 0) + 1);
    });

    console.log("\n👥 Technologies per Role:");
    Array.from(roleCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .forEach(([role, count]) => {
        console.log(`  • ${role}: ${count} technologies`);
      });

    // Technologies with most role mappings
    const techRoleCounts = new Map<string, number>();
    mappingsByTech.forEach((mappings, tech) => {
      techRoleCounts.set(tech, mappings.length);
    });

    console.log("\n🏆 Most Versatile Technologies (mapped to multiple roles):");
    Array.from(techRoleCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .forEach(([tech, count]) => {
        console.log(`  • ${tech}: ${count} roles`);
      });

    // Check for technologies without mappings
    const { data: unmappedTechs } = await supabase
      .from("technologies")
      .select("name, category")
      .not("id", "in", `(SELECT DISTINCT technology_id FROM technology_job_roles)`)
      .order("name");

    if (unmappedTechs && unmappedTechs.length > 0) {
      console.log(`\n⚠️  Technologies without role mappings (${unmappedTechs.length}):`);
      unmappedTechs.forEach(tech => {
        console.log(`  • ${tech.name} (${tech.category || "uncategorized"})`);
      });
    }

  } catch (error) {
    console.error("Unexpected error:", error);
    process.exit(1);
  }
}

// Run the script
checkTechnologyRoleMappings();