import { SupabaseService } from "../services/SupabaseService";

async function updateSwissDevJobsCompanyLocation() {
  console.log("🔄 Updating company and location for SwissDevJobs entries...\n");
  
  const supabaseService = new SupabaseService();
  
  try {
    // Fetch all jobs from SwissDevJobs
    const result = await supabaseService.getJobs({
      source: 'swissdevjobs',
      limit: 1000
    });
    
    const jobs = result.data;
    console.log(`📊 Found ${jobs.length} SwissDevJobs entries to update`);
    
    let updated = 0;
    let failed = 0;
    
    for (const job of jobs) {
      // Skip if already has proper company name (not "Unknown Company" and doesn't contain address)
      if (job.company && 
          job.company !== "Unknown Company" && 
          !job.company.includes("strasse") && 
          !job.company.includes("allee") &&
          !job.company.includes("platz") &&
          !job.company.includes("weg")) {
        continue;
      }
      
      // Parse company and location from the current company field
      let company = job.company;
      let location = job.location || "Location not specified";
      
      // If company contains address patterns, parse it
      const streetPattern = /(strasse|gasse|weg|platz|ring|allee)\s*\d+/i;
      const streetMatch = company.match(streetPattern);
      
      if (streetMatch) {
        // Find where the street name starts
        const streetStartIndex = company.search(/[A-Z][a-zÀ-ÿ]*(strasse|gasse|weg|platz|ring|allee)/);
        if (streetStartIndex > 0) {
          const newCompany = company.substring(0, streetStartIndex).trim();
          const newLocation = company.substring(streetStartIndex).trim();
          
          // Extract city from location if it contains comma
          let city = newLocation;
          if (newLocation.includes(',')) {
            const parts = newLocation.split(',');
            city = parts[parts.length - 1].trim();
          }
          
          company = newCompany;
          location = city;
        }
      }
      
      // Update the job if we made changes
      if (company !== job.company || location !== job.location) {
        console.log(`\n📝 Updating job: ${job.job_title}`);
        console.log(`   Old company: "${job.company}"`);
        console.log(`   New company: "${company}"`);
        console.log(`   Old location: "${job.location}"`);
        console.log(`   New location: "${location}"`);
        
        const updateData = {
          company: company,
          location: location
        };
        
        const success = await supabaseService.updateJob(job.id!, updateData);
        
        if (success) {
          updated++;
          console.log(`   ✅ Updated successfully`);
        } else {
          failed++;
          console.log(`   ❌ Update failed`);
        }
      }
    }
    
    console.log(`\n✅ Update complete!`);
    console.log(`   • Jobs updated: ${updated}`);
    console.log(`   • Failed updates: ${failed}`);
    console.log(`   • Jobs already correct: ${jobs.length - updated - failed}`);
    
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

// Run the update
updateSwissDevJobsCompanyLocation();