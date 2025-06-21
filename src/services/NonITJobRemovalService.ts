import { SupabaseService } from "./SupabaseService";

export class NonITJobRemovalService {
  private supabaseService: SupabaseService;
  
  // Comprehensive list of non-IT job titles and keywords
  private readonly NON_IT_KEYWORDS: string[] = [
    // Construction & Trades
    "Bauleiter", "Construction Manager", "Bauingenieur", "Civil Engineer",
    "Baggerfahrer", "Excavator Operator", "Maurer", "Mason",
    "Bauhelfer", "Construction Helper", "Anlagenmechaniker", "Plant Mechanic",
    "Polier", "Foreman in Construction", "Fliesenleger", "Tiler",
    "Bauüberwacher", "Tiefbau", "Glasfaser", "Bauoberleitung",
    
    // Mechanical & Technical (non-IT)
    "Augenoptikermeister/in", "Optician Master", "Kfz-Mechaniker", "Automotive Mechanic",
    "Kfz-Mechatroniker", "Automotive Mechatronics Technician", "Elektriker", "Elektroniker",
    "Industriemechaniker", "Industrial Mechanic", "Tischler/Holzmechaniker", "Carpenter/Wood Mechanic",
    "Schlosser", "Locksmith/Metal Worker", "Servicetechniker SHK", "Service Technician for Heating, Sanitation, Air Conditioning",
    
    // Transportation
    "Lokführer", "Train Driver", "Triebfahrzeugführer", "Locomotive Driver",
    
    // Service & Hospitality
    "Servicekraft im Ausschank", "Service Staff in Beverage Service",
    
    // Sales & Customer Service
    "Verkaufsmitarbeiter", "Sales Employee", "Sales Manager", "Customer Service Representative",
    "Sales Representative", "Vertriebsmitarbeiter", "Kundenberater", "Customer Advisor",
    
    // Marketing & Media (non-technical)
    "Artist Manager", "Influencer Manager", "Marketing Manager", "Content Creator",
    "Social Media Manager", "Video Editor", "Graphic Designer", "Event Manager",
    "Eventmanager", "Fotograf", "Photographer",
    
    // Finance & Accounting
    "Accountant", "Buchhalter", "Tax Consultant", "Financial Advisory",
    "Finance Manager", "Finance", "Controller", "Controlling",
    "Finanzbuchhaltung", "Buchhaltung", "Finanz", "Rechnungswesen",
    "Accounting", "Treasury", "Wirtschaftsprüfer", "Steuerberater",
    
    // HR & Recruitment
    "HR Specialist", "Recruiter", "Talent Acquisition", "Personalreferent",
    
    // Business & Operations
    "Business Development Manager", "Project Manager", "Logistics Coordinator",
    "Quality Manager", "Operations Manager"
  ];

  constructor() {
    this.supabaseService = new SupabaseService();
  }

  /**
   * Remove all non-IT jobs from the database
   * This is called daily after scraping to clean up the database
   */
  async removeNonITJobs(): Promise<{
    totalJobs: number;
    removedJobs: number;
    removedJobsList: Array<{ title: string; company: string; reason: string }>;
  }> {
    try {
      console.log("🔍 Starting non-IT job removal...");
      
      // Fetch all jobs
      const allJobsResult = await this.supabaseService.getJobs({
        limit: 10000
      });
      
      const allJobs = allJobsResult.data;
      const totalJobs = allJobs.length;
      
      console.log(`📊 Total jobs to check: ${totalJobs}`);
      
      const jobsToRemove: Array<{
        job: any;
        reason: string;
      }> = [];
      
      // Check each job
      for (const job of allJobs) {
        const titleLower = job.job_title.toLowerCase();
        
        // Check if title contains any non-IT keywords
        for (const keyword of this.NON_IT_KEYWORDS) {
          if (titleLower.includes(keyword.toLowerCase())) {
            // Special cases: IT Project Manager or Software Controller might be IT
            if ((keyword.toLowerCase().includes('controller') || 
                 keyword.toLowerCase().includes('project manager')) && 
                (titleLower.includes('it ') || titleLower.includes('software'))) {
              continue; // Skip this one, it might be IT
            }
            
            jobsToRemove.push({
              job,
              reason: `Title contains non-IT keyword: "${keyword}"`
            });
            break;
          }
        }
      }
      
      console.log(`🗑️ Found ${jobsToRemove.length} non-IT jobs to remove`);
      
      const removedJobsList: Array<{ title: string; company: string; reason: string }> = [];
      let removedCount = 0;
      
      // Remove the jobs
      for (const { job, reason } of jobsToRemove) {
        if (job.id) {
          const success = await this.supabaseService.deleteJob(job.id);
          if (success) {
            removedCount++;
            removedJobsList.push({
              title: job.job_title,
              company: job.company,
              reason
            });
            console.log(`❌ Removed: ${job.job_title}`);
          }
        }
      }
      
      console.log(`✅ Removed ${removedCount} non-IT jobs`);
      
      return {
        totalJobs,
        removedJobs: removedCount,
        removedJobsList: removedJobsList.slice(0, 20) // Return first 20 for logging
      };
      
    } catch (error) {
      console.error("❌ Error removing non-IT jobs:", error);
      throw error;
    }
  }
}