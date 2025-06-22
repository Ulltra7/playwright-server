import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

interface Technology {
  id: string;
  name: string;
  category?: string;
}

interface JobRole {
  id: string;
  name: string;
  display_name: string;
}

interface TechnologyRoleMapping {
  technology_id: string;
  job_role_id: string;
  relevance_score: number;
}

// Technology to job role mappings with relevance scores (0-100)
const TECHNOLOGY_ROLE_MAPPINGS: Record<string, { roles: { roleName: string; score: number }[] }> = {
  // Frontend Technologies
  "React": {
    roles: [
      { roleName: "frontend_developer", score: 100 },
      { roleName: "fullstack_developer", score: 90 },
      { roleName: "mobile_developer", score: 60 }, // React Native
    ]
  },
  "Angular": {
    roles: [
      { roleName: "frontend_developer", score: 100 },
      { roleName: "fullstack_developer", score: 90 },
    ]
  },
  "Vue.js": {
    roles: [
      { roleName: "frontend_developer", score: 100 },
      { roleName: "fullstack_developer", score: 90 },
    ]
  },
  "Svelte": {
    roles: [
      { roleName: "frontend_developer", score: 100 },
      { roleName: "fullstack_developer", score: 80 },
    ]
  },
  "Next.js": {
    roles: [
      { roleName: "frontend_developer", score: 100 },
      { roleName: "fullstack_developer", score: 100 },
    ]
  },
  "Nuxt.js": {
    roles: [
      { roleName: "frontend_developer", score: 100 },
      { roleName: "fullstack_developer", score: 100 },
    ]
  },

  // Programming Languages
  "JavaScript": {
    roles: [
      { roleName: "frontend_developer", score: 100 },
      { roleName: "backend_developer", score: 80 },
      { roleName: "fullstack_developer", score: 100 },
      { roleName: "mobile_developer", score: 70 },
      { roleName: "qa_engineer", score: 60 },
    ]
  },
  "TypeScript": {
    roles: [
      { roleName: "frontend_developer", score: 90 },
      { roleName: "backend_developer", score: 90 },
      { roleName: "fullstack_developer", score: 100 },
      { roleName: "mobile_developer", score: 70 },
    ]
  },
  "Python": {
    roles: [
      { roleName: "backend_developer", score: 100 },
      { roleName: "data_scientist", score: 100 },
      { roleName: "ai_ml_engineer", score: 100 },
      { roleName: "data_engineer", score: 90 },
      { roleName: "fullstack_developer", score: 70 },
      { roleName: "qa_engineer", score: 60 },
      { roleName: "devops_engineer", score: 70 },
    ]
  },
  "Java": {
    roles: [
      { roleName: "backend_developer", score: 100 },
      { roleName: "fullstack_developer", score: 60 },
      { roleName: "mobile_developer", score: 80 }, // Android
      { roleName: "data_engineer", score: 70 },
    ]
  },
  "C#": {
    roles: [
      { roleName: "backend_developer", score: 100 },
      { roleName: "fullstack_developer", score: 70 },
      { roleName: "mobile_developer", score: 60 }, // Xamarin
    ]
  },
  "PHP": {
    roles: [
      { roleName: "backend_developer", score: 100 },
      { roleName: "fullstack_developer", score: 80 },
    ]
  },
  "Go": {
    roles: [
      { roleName: "backend_developer", score: 100 },
      { roleName: "devops_engineer", score: 80 },
      { roleName: "site_reliability_engineer", score: 80 },
    ]
  },
  "Rust": {
    roles: [
      { roleName: "backend_developer", score: 100 },
      { roleName: "site_reliability_engineer", score: 70 },
    ]
  },
  "Kotlin": {
    roles: [
      { roleName: "mobile_developer", score: 100 },
      { roleName: "backend_developer", score: 70 },
    ]
  },
  "Swift": {
    roles: [
      { roleName: "mobile_developer", score: 100 },
    ]
  },

  // Backend Frameworks
  "Node.js": {
    roles: [
      { roleName: "backend_developer", score: 100 },
      { roleName: "fullstack_developer", score: 90 },
      { roleName: "devops_engineer", score: 60 },
    ]
  },
  "Express.js": {
    roles: [
      { roleName: "backend_developer", score: 100 },
      { roleName: "fullstack_developer", score: 90 },
    ]
  },
  "Django": {
    roles: [
      { roleName: "backend_developer", score: 100 },
      { roleName: "fullstack_developer", score: 80 },
      { roleName: "data_engineer", score: 60 },
    ]
  },
  "FastAPI": {
    roles: [
      { roleName: "backend_developer", score: 100 },
      { roleName: "data_engineer", score: 70 },
      { roleName: "ai_ml_engineer", score: 70 },
    ]
  },
  "Spring Boot": {
    roles: [
      { roleName: "backend_developer", score: 100 },
      { roleName: "fullstack_developer", score: 60 },
    ]
  },
  "Laravel": {
    roles: [
      { roleName: "backend_developer", score: 100 },
      { roleName: "fullstack_developer", score: 80 },
    ]
  },
  ".NET": {
    roles: [
      { roleName: "backend_developer", score: 100 },
      { roleName: "fullstack_developer", score: 70 },
    ]
  },

  // Databases
  "PostgreSQL": {
    roles: [
      { roleName: "backend_developer", score: 90 },
      { roleName: "database_administrator", score: 100 },
      { roleName: "data_engineer", score: 80 },
      { roleName: "fullstack_developer", score: 70 },
    ]
  },
  "MySQL": {
    roles: [
      { roleName: "backend_developer", score: 90 },
      { roleName: "database_administrator", score: 100 },
      { roleName: "data_engineer", score: 70 },
      { roleName: "fullstack_developer", score: 70 },
    ]
  },
  "MongoDB": {
    roles: [
      { roleName: "backend_developer", score: 90 },
      { roleName: "fullstack_developer", score: 70 },
      { roleName: "data_engineer", score: 60 },
    ]
  },
  "Redis": {
    roles: [
      { roleName: "backend_developer", score: 80 },
      { roleName: "devops_engineer", score: 70 },
      { roleName: "site_reliability_engineer", score: 70 },
    ]
  },
  "SQLite": {
    roles: [
      { roleName: "backend_developer", score: 60 },
      { roleName: "mobile_developer", score: 70 },
    ]
  },
  "Oracle": {
    roles: [
      { roleName: "database_administrator", score: 100 },
      { roleName: "backend_developer", score: 70 },
      { roleName: "data_engineer", score: 80 },
    ]
  },

  // Cloud & DevOps
  "AWS": {
    roles: [
      { roleName: "cloud_architect", score: 100 },
      { roleName: "devops_engineer", score: 90 },
      { roleName: "site_reliability_engineer", score: 80 },
      { roleName: "backend_developer", score: 70 },
      { roleName: "data_engineer", score: 70 },
    ]
  },
  "Azure": {
    roles: [
      { roleName: "cloud_architect", score: 100 },
      { roleName: "devops_engineer", score: 90 },
      { roleName: "site_reliability_engineer", score: 80 },
      { roleName: "backend_developer", score: 70 },
    ]
  },
  "Google Cloud": {
    roles: [
      { roleName: "cloud_architect", score: 100 },
      { roleName: "devops_engineer", score: 90 },
      { roleName: "site_reliability_engineer", score: 80 },
      { roleName: "data_engineer", score: 80 },
    ]
  },
  "Docker": {
    roles: [
      { roleName: "devops_engineer", score: 100 },
      { roleName: "site_reliability_engineer", score: 90 },
      { roleName: "backend_developer", score: 70 },
      { roleName: "cloud_architect", score: 80 },
    ]
  },
  "Kubernetes": {
    roles: [
      { roleName: "devops_engineer", score: 100 },
      { roleName: "site_reliability_engineer", score: 100 },
      { roleName: "cloud_architect", score: 90 },
    ]
  },
  "Jenkins": {
    roles: [
      { roleName: "devops_engineer", score: 100 },
      { roleName: "site_reliability_engineer", score: 70 },
    ]
  },
  "GitLab CI": {
    roles: [
      { roleName: "devops_engineer", score: 100 },
      { roleName: "site_reliability_engineer", score: 70 },
    ]
  },
  "GitHub Actions": {
    roles: [
      { roleName: "devops_engineer", score: 100 },
      { roleName: "site_reliability_engineer", score: 70 },
      { roleName: "backend_developer", score: 60 },
    ]
  },

  // Tools & Others
  "Git": {
    roles: [
      { roleName: "frontend_developer", score: 90 },
      { roleName: "backend_developer", score: 90 },
      { roleName: "fullstack_developer", score: 90 },
      { roleName: "mobile_developer", score: 90 },
      { roleName: "devops_engineer", score: 80 },
      { roleName: "data_scientist", score: 70 },
      { roleName: "qa_engineer", score: 80 },
    ]
  },
  "Webpack": {
    roles: [
      { roleName: "frontend_developer", score: 90 },
      { roleName: "fullstack_developer", score: 70 },
    ]
  },
  "Vite": {
    roles: [
      { roleName: "frontend_developer", score: 90 },
      { roleName: "fullstack_developer", score: 70 },
    ]
  },
  "GraphQL": {
    roles: [
      { roleName: "backend_developer", score: 80 },
      { roleName: "frontend_developer", score: 70 },
      { roleName: "fullstack_developer", score: 90 },
    ]
  },
  "REST API": {
    roles: [
      { roleName: "backend_developer", score: 90 },
      { roleName: "frontend_developer", score: 70 },
      { roleName: "fullstack_developer", score: 90 },
      { roleName: "mobile_developer", score: 80 },
    ]
  },
  "Microservices": {
    roles: [
      { roleName: "backend_developer", score: 90 },
      { roleName: "cloud_architect", score: 90 },
      { roleName: "devops_engineer", score: 80 },
    ]
  },
  "Agile": {
    roles: [
      { roleName: "scrum_master", score: 100 },
      { roleName: "project_manager", score: 90 },
      { roleName: "product_manager", score: 80 },
    ]
  },
  "Scrum": {
    roles: [
      { roleName: "scrum_master", score: 100 },
      { roleName: "project_manager", score: 80 },
      { roleName: "product_manager", score: 70 },
    ]
  },
};

async function populateTechnologyRoles() {
  // Initialize Supabase client
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase environment variables");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log("🚀 Starting technology-job role population script...\n");

    // Step 1: Check existing mappings
    const { data: existingMappings, error: existingError } = await supabase
      .from("technology_job_roles")
      .select("*");

    if (existingError) {
      console.error("Error fetching existing mappings:", existingError);
      process.exit(1);
    }

    console.log(`📊 Found ${existingMappings?.length || 0} existing technology-role mappings\n`);

    // Step 2: Fetch all technologies
    const { data: technologies, error: techError } = await supabase
      .from("technologies")
      .select("id, name, category");

    if (techError || !technologies) {
      console.error("Error fetching technologies:", techError);
      process.exit(1);
    }

    console.log(`📱 Found ${technologies.length} technologies in database\n`);

    // Step 3: Fetch all job roles
    const { data: jobRoles, error: roleError } = await supabase
      .from("job_roles")
      .select("id, name, display_name");

    if (roleError || !jobRoles) {
      console.error("Error fetching job roles:", roleError);
      process.exit(1);
    }

    console.log(`👔 Found ${jobRoles.length} job roles in database\n`);

    // Create lookup maps for faster access
    const techMap = new Map<string, Technology>();
    technologies.forEach(tech => {
      techMap.set(tech.name.toLowerCase(), tech);
    });

    const roleMap = new Map<string, JobRole>();
    jobRoles.forEach(role => {
      roleMap.set(role.name, role);
    });

    // Create a set of existing mappings to avoid duplicates
    const existingMappingSet = new Set<string>();
    existingMappings?.forEach(mapping => {
      existingMappingSet.add(`${mapping.technology_id}-${mapping.job_role_id}`);
    });

    // Step 4: Prepare new mappings
    const newMappings: TechnologyRoleMapping[] = [];
    const skippedTechnologies: string[] = [];
    const unmatchedTechnologies: string[] = [];

    for (const [techName, mapping] of Object.entries(TECHNOLOGY_ROLE_MAPPINGS)) {
      const tech = techMap.get(techName.toLowerCase());
      
      if (!tech) {
        unmatchedTechnologies.push(techName);
        continue;
      }

      for (const { roleName, score } of mapping.roles) {
        const role = roleMap.get(roleName);
        
        if (!role) {
          console.warn(`⚠️  Role not found: ${roleName}`);
          continue;
        }

        const mappingKey = `${tech.id}-${role.id}`;
        
        if (existingMappingSet.has(mappingKey)) {
          skippedTechnologies.push(`${tech.name} -> ${role.display_name}`);
          continue;
        }

        newMappings.push({
          technology_id: tech.id,
          job_role_id: role.id,
          relevance_score: score,
        });
      }
    }

    // Step 5: Insert new mappings
    if (newMappings.length > 0) {
      console.log(`\n💾 Inserting ${newMappings.length} new technology-role mappings...\n`);

      // Insert in batches of 100 to avoid potential limits
      const batchSize = 100;
      for (let i = 0; i < newMappings.length; i += batchSize) {
        const batch = newMappings.slice(i, i + batchSize);
        
        const { error: insertError } = await supabase
          .from("technology_job_roles")
          .insert(batch);

        if (insertError) {
          console.error(`Error inserting batch ${i / batchSize + 1}:`, insertError);
        } else {
          console.log(`✅ Inserted batch ${i / batchSize + 1} (${batch.length} mappings)`);
        }
      }
    } else {
      console.log("✨ No new mappings to insert - all technologies are already mapped!");
    }

    // Step 6: Report summary
    console.log("\n📈 Summary Report:");
    console.log("================");
    console.log(`✅ Successfully processed ${Object.keys(TECHNOLOGY_ROLE_MAPPINGS).length} technology definitions`);
    console.log(`✅ Created ${newMappings.length} new mappings`);
    console.log(`⏭️  Skipped ${skippedTechnologies.length} existing mappings`);
    
    if (unmatchedTechnologies.length > 0) {
      console.log(`\n⚠️  Technologies not found in database (${unmatchedTechnologies.length}):`);
      unmatchedTechnologies.forEach(tech => console.log(`   - ${tech}`));
    }

    // Step 7: Check for technologies without any mappings
    const { data: unmappedTechs } = await supabase
      .from("technologies")
      .select("name")
      .not("id", "in", `(SELECT DISTINCT technology_id FROM technology_job_roles)`);

    if (unmappedTechs && unmappedTechs.length > 0) {
      console.log(`\n📋 Technologies without role mappings (${unmappedTechs.length}):`);
      unmappedTechs.forEach(tech => console.log(`   - ${tech.name}`));
    }

    console.log("\n✅ Technology-role population completed successfully!");

  } catch (error) {
    console.error("Unexpected error:", error);
    process.exit(1);
  }
}

// Run the script
populateTechnologyRoles();