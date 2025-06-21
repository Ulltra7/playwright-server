import { SupabaseService } from "../services/SupabaseService";

async function removeFinanceJobs() {
  console.log("🚀 Starting finance job removal script...");
  
  const supabaseService = new SupabaseService();
  
  // Non-IT job titles to exclude
  const nonITJobTitles: string[] = [
    "Bauleiter",
    "Construction Manager",
    "Bauingenieur",
    "Civil Engineer",
    "Baggerfahrer",
    "Excavator Operator",
    "Maurer",
    "Mason",
    "Bauhelfer",
    "Construction Helper",
    "Anlagenmechaniker",
    "Plant Mechanic",
    "Augenoptikermeister/in",
    "Optician Master",
    "Kfz-Mechaniker",
    "Automotive Mechanic",
    "Kfz-Mechatroniker",
    "Automotive Mechatronics Technician",
    "Elektriker",
    "Electrician",
    "Industriemechaniker",
    "Industrial Mechanic",
    "Tischler/Holzmechaniker",
    "Carpenter/Wood Mechanic",
    "Servicekraft im Ausschank",
    "Service Staff in Beverage Service",
    "Verkaufsmitarbeiter",
    "Sales Employee",
    "Lokführer",
    "Train Driver",
    "Schlosser",
    "Locksmith/Metal Worker",
    "Polier",
    "Foreman in Construction",
    "Triebfahrzeugführer",
    "Locomotive Driver",
    "Servictechniker SHK",
    "Service Technician for Heating, Sanitation, Air Conditioning",
    "Fliesenleger",
    "Tiler",
    "Artist Manager",
    "Influencer Manager",
    "Marketing Manager",
    "HR Specialist",
    "Customer Service Representative",
    "Sales Manager",
    "Content Creator",
    "Social Media Manager",
    "Video Editor",
    "Graphic Designer",
    "Event Manager",
    "Accountant",
    "Buchhalter",
    "Tax Consultant",
    "Financial Advisory",
    "Finance Manager",
    "Finance",
    "Controller",
    "Business Development Manager",
    "Project Manager",
    "Recruiter",
    "Talent Acquisition",
    "Logistics Coordinator",
    "Quality Manager",
    "Operations Manager",
    "Fotograf",
    "Photographer",
    "Vertriebsmitarbeiter",
    "Sales Representative",
    "Kundenberater",
    "Customer Advisor",
    "Eventmanager",
    "Personalreferent",
    // Additional finance-related terms
    "Controlling",
    "Finanzbuchhaltung",
    "Buchhaltung",
    "Finanz",
    "Rechnungswesen",
    "Accounting",
    "Treasury",
    "Wirtschaftsprüfer",
    "Steuerberater",
    // Additional construction/non-IT terms
    "Bauüberwacher",
    "Tiefbau",
    "Glasfaser",
    "Bauoberleitung",
    "Elektroniker"
  ];
  
  try {
    // Fetch all jobs
    const allJobsResult = await supabaseService.getJobs({
      limit: 10000
    });
    
    const allJobs = allJobsResult.data;
    console.log(`📊 Total jobs to check: ${allJobs.length}`);
    
    const jobsToRemove = [];
    
    // Check each job
    for (const job of allJobs) {
      const titleLower = job.job_title.toLowerCase();
      
      // Check if title contains any non-IT job titles
      for (const nonITTitle of nonITJobTitles) {
        if (titleLower.includes(nonITTitle.toLowerCase())) {
          // Special case: IT Project Manager or Software Controller might be IT
          if ((nonITTitle.toLowerCase().includes('controller') || 
               nonITTitle.toLowerCase().includes('project manager')) && 
              (titleLower.includes('it ') || titleLower.includes('software'))) {
            continue; // Skip this one, it might be IT
          }
          
          jobsToRemove.push({
            job,
            reason: `Title contains: "${nonITTitle}"`
          });
          break;
        }
      }
    }
    
    console.log(`\n🗑️ Found ${jobsToRemove.length} finance/non-IT jobs to remove:\n`);
    
    // Show what will be removed
    jobsToRemove.forEach(({ job, reason }, index) => {
      if (index < 20) { // Show first 20
        console.log(`${index + 1}. ${job.job_title} at ${job.company}`);
        console.log(`   Reason: ${reason}`);
      }
    });
    
    if (jobsToRemove.length > 20) {
      console.log(`\n... and ${jobsToRemove.length - 20} more`);
    }
    
    if (jobsToRemove.length === 0) {
      console.log("✅ No finance/non-IT jobs found!");
      return;
    }
    
    // Confirm before deleting
    console.log(`\n⚠️  This will remove ${jobsToRemove.length} jobs from the database.`);
    console.log(`   Press Ctrl+C to cancel, or wait 5 seconds to continue...`);
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Delete the jobs
    console.log("\n🔧 Removing jobs...");
    let removed = 0;
    
    for (const { job } of jobsToRemove) {
      if (job.id) {
        const success = await supabaseService.deleteJob(job.id);
        if (success) {
          removed++;
          console.log(`❌ Removed: ${job.job_title}`);
        }
      }
    }
    
    console.log(`\n✅ Complete! Removed ${removed} finance/non-IT jobs.`);
    
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

// Run the script
removeFinanceJobs();