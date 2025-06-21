import { SupabaseService, JobApplication } from "./SupabaseService";
import { JobCategorizer, JobCategory } from "./JobCategorizer";

export class JobFilterService {
  private supabaseService: SupabaseService;
  private jobCategorizer: JobCategorizer;

  // Keywords that indicate IT/Tech jobs (inclusive)
  private readonly IT_KEYWORDS = [
    // Programming languages
    'javascript', 'typescript', 'python', 'java', 'c#', 'c++', 'php', 'ruby', 'go', 'golang',
    'rust', 'kotlin', 'swift', 'scala', 'r programming', 'matlab', 'perl', 'bash', 'powershell',
    
    // Web technologies
    'react', 'angular', 'vue', 'node.js', 'nodejs', 'express', 'django', 'flask', 'rails',
    'laravel', 'spring', 'asp.net', '.net', 'jquery', 'bootstrap', 'tailwind', 'webpack',
    'nextjs', 'next.js', 'nuxt', 'gatsby', 'svelte', 'ember',
    
    // Mobile
    'android', 'ios', 'react native', 'flutter', 'xamarin', 'ionic', 'cordova',
    
    // Databases
    'sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch', 'cassandra', 'oracle',
    'sqlite', 'dynamodb', 'mariadb', 'neo4j', 'graphql', 'prisma',
    
    // Cloud & DevOps
    'aws', 'azure', 'google cloud', 'gcp', 'docker', 'kubernetes', 'jenkins', 'gitlab',
    'github', 'terraform', 'ansible', 'puppet', 'chef', 'circleci', 'travis',
    'devops', 'devsecops', 'ci/cd', 'continuous integration', 'continuous deployment',
    
    // IT roles
    'developer', 'entwickler', 'programmer', 'programmierer', 'software engineer',
    'software-engineer', 'web developer', 'frontend', 'backend', 'full stack', 'fullstack',
    'data scientist', 'data engineer', 'machine learning', 'ml engineer', 'ai engineer',
    'devops engineer', 'cloud engineer', 'sre', 'site reliability', 'qa engineer',
    'test engineer', 'automation engineer', 'security engineer', 'architect',
    'tech lead', 'engineering manager', 'cto', 'it support', 'it administrator',
    'system administrator', 'sysadmin', 'network engineer', 'database administrator',
    'dba', 'scrum master', 'product owner', 'agile coach', 'ux designer', 'ui designer',
    'ux/ui', 'web designer', 'mobile developer', 'game developer', 'blockchain developer',
    'embedded developer', 'firmware engineer', 'data analyst', 'business analyst',
    'it consultant', 'solution architect', 'enterprise architect', 'it manager',
    
    // Technologies & concepts
    'api', 'rest api', 'restful', 'microservices', 'blockchain', 'cryptocurrency',
    'machine learning', 'deep learning', 'artificial intelligence', 'data science',
    'big data', 'analytics', 'visualization', 'git', 'version control', 'agile',
    'scrum', 'kanban', 'jira', 'confluence', 'linux', 'unix', 'windows server',
    'virtualization', 'vmware', 'hyper-v', 'networking', 'tcp/ip', 'http',
    'cybersecurity', 'information security', 'penetration testing', 'ethical hacking',
    'wordpress', 'drupal', 'magento', 'shopify', 'cms', 'erp', 'sap', 'salesforce',
    'hadoop', 'spark', 'kafka', 'rabbitmq', 'nginx', 'apache', 'iis',
    'responsive design', 'cross-platform', 'saas', 'paas', 'iaas', 'serverless',
    'lambda', 'firebase', 'supabase', 'graphql', 'grpc', 'websocket',
    'computer science', 'informatik', 'software development', 'softwareentwicklung',
    'coding', 'programming', 'scripting', 'debugging', 'testing', 'deployment'
  ];

  // Keywords that indicate NON-IT jobs (exclusive)
  private readonly EXCLUDE_KEYWORDS = [
    // Healthcare
    'nurse', 'doctor', 'physician', 'surgeon', 'medical', 'hospital', 'clinic',
    'patient', 'pharmacy', 'therapist', 'dentist', 'veterinary', 'healthcare',
    'krankenschwester', 'arzt', 'ärztin', 'pfleger', 'pflegerin',
    
    // Retail & Sales
    'cashier', 'retail', 'shop assistant', 'verkäufer', 'verkäuferin', 'kassierer',
    'store manager', 'filialleiter', 'einzelhandel', 'supermarket', 'boutique',
    
    // Hospitality
    'waiter', 'waitress', 'kellner', 'kellnerin', 'barista', 'bartender',
    'hotel', 'receptionist', 'housekeeping', 'room service', 'concierge',
    'cook', 'chef', 'koch', 'köchin', 'kitchen', 'restaurant',
    
    // Construction & Manual Labor
    'construction', 'builder', 'carpenter', 'plumber', 'electrician', 'painter',
    'handwerker', 'maurer', 'zimmermann', 'klempner', 'elektriker', 'maler',
    'warehouse', 'forklift', 'driver', 'delivery', 'courier', 'logistics',
    'lagerarbeiter', 'staplerfahrer', 'fahrer', 'lieferant', 'kurier',
    
    // Education (non-IT)
    'teacher', 'lehrer', 'lehrerin', 'kindergarten', 'daycare', 'erzieher',
    'erzieherin', 'tutor', 'nachhilfelehrer', 'professor' // but only if not computer science
  ];

  // Job titles that are definitely IT (override exclusions)
  private readonly IT_JOB_TITLES = [
    'software developer', 'web developer', 'full stack developer', 'frontend developer',
    'backend developer', 'mobile developer', 'data scientist', 'data engineer',
    'devops engineer', 'cloud engineer', 'ml engineer', 'ai engineer', 'qa engineer',
    'software engineer', 'it support', 'it administrator', 'system administrator',
    'network engineer', 'security engineer', 'database administrator', 'tech lead',
    'engineering manager', 'cto', 'software architect', 'solution architect',
    'scrum master', 'product owner', 'ux designer', 'ui designer', 'web designer'
  ];

  // Job titles that are definitely NOT IT
  private readonly NON_IT_JOB_TITLES = [
    // Construction & Trades
    'bauleiter', 'construction manager', 'bauingenieur', 'civil engineer',
    'baggerfahrer', 'excavator operator', 'maurer', 'mason',
    'bauhelfer', 'construction helper', 'anlagenmechaniker', 'plant mechanic',
    'polier', 'foreman in construction', 'fliesenleger', 'tiler',
    
    // Mechanical & Technical (non-IT)
    'augenoptikermeister/in', 'optician master', 'kfz-mechaniker', 'automotive mechanic',
    'kfz-mechatroniker', 'automotive mechatronics technician', 'elektriker', 'electrician',
    'industriemechaniker', 'industrial mechanic', 'tischler/holzmechaniker', 'carpenter/wood mechanic',
    'schlosser', 'locksmith/metal worker', 'servicetechniker shk', 'service technician for heating, sanitation, air conditioning',
    
    // Transportation
    'lokführer', 'train driver', 'triebfahrzeugführer', 'locomotive driver',
    
    // Service & Hospitality
    'servicekraft im ausschank', 'service staff in beverage service',
    
    // Sales & Customer Service
    'verkaufsmitarbeiter', 'sales employee', 'sales manager', 'customer service representative',
    'sales representative', 'vertriebsmitarbeiter', 'kundenberater', 'customer advisor',
    
    // Marketing & Media (non-technical)
    'artist manager', 'influencer manager', 'marketing manager', 'content creator',
    'social media manager', 'video editor', 'graphic designer', 'event manager',
    'eventmanager', 'fotograf', 'photographer',
    
    // Finance & Accounting
    'accountant', 'buchhalter', 'tax consultant', 'financial advisory',
    'finance manager', 'finance', 'controller',
    
    // HR & Recruitment
    'hr specialist', 'recruiter', 'talent acquisition', 'personalreferent',
    
    // Business & Operations
    'business development manager', 'project manager', 'logistics coordinator',
    'quality manager', 'operations manager'
  ];

  constructor() {
    this.supabaseService = new SupabaseService();
    this.jobCategorizer = new JobCategorizer();
  }

  /**
   * Check if a job is IT-related based on title, description, and technologies
   */
  private isITJob(job: JobApplication): boolean {
    const titleLower = job.job_title.toLowerCase();
    const descriptionLower = (job.description || '').toLowerCase();
    const combinedText = `${titleLower} ${descriptionLower}`;
    
    // First check if job title is in the non-IT list (definitive exclusion)
    for (const nonITTitle of this.NON_IT_JOB_TITLES) {
      if (titleLower.includes(nonITTitle.toLowerCase())) {
        // Exception: If it also contains IT keywords in the title, it might still be IT
        // e.g., "IT Project Manager" or "Software Quality Manager"
        const hasITQualifier = this.IT_JOB_TITLES.some(itTitle => 
          titleLower.includes(itTitle)) || 
          ['it ', 'software', 'technical', 'tech ', 'digital'].some(qualifier => 
          titleLower.includes(qualifier));
        
        if (!hasITQualifier) {
          return false; // Definitely not IT
        }
      }
    }
    
    // Check if job title is definitely IT
    for (const itTitle of this.IT_JOB_TITLES) {
      if (titleLower.includes(itTitle)) {
        return true;
      }
    }
    
    // Check for exclusion keywords (if found, likely not IT)
    let exclusionScore = 0;
    for (const excludeKeyword of this.EXCLUDE_KEYWORDS) {
      if (combinedText.includes(excludeKeyword)) {
        exclusionScore++;
      }
    }
    
    // Count IT keywords
    let itScore = 0;
    for (const itKeyword of this.IT_KEYWORDS) {
      if (combinedText.includes(itKeyword)) {
        itScore++;
      }
    }
    
    // Check technologies array (strong indicator of IT job)
    if (job.technologies && Array.isArray(job.technologies) && job.technologies.length > 0) {
      itScore += job.technologies.length * 2; // Technologies are strong indicators
    }
    
    // Decision logic:
    // - If strong IT indicators, include even with some exclusions
    // - If no IT indicators and has exclusions, exclude
    // - If more IT indicators than exclusions, include
    if (itScore >= 3) return true; // Strong IT indication
    if (itScore === 0 && exclusionScore > 0) return false; // No IT indication + exclusions
    if (itScore > exclusionScore) return true; // More IT than exclusion indicators
    
    return false;
  }

  /**
   * Filter out non-IT jobs from the database
   * Returns statistics about the filtering process
   */
  async filterNonITJobs(): Promise<{
    totalJobs: number;
    itJobs: number;
    removedJobs: number;
    removedJobsList: Array<{ title: string; company: string; reason: string; category: JobCategory }>;
    jobsByCategory: Record<JobCategory, number>;
  }> {
    try {
      console.log("🔍 Starting IT job filtering process...");
      
      // Fetch all jobs
      const allJobsResult = await this.supabaseService.getJobs({
        limit: 10000 // High limit to get all jobs
      });
      
      const allJobs = allJobsResult.data;
      const totalJobs = allJobs.length;
      
      console.log(`📊 Total jobs to analyze: ${totalJobs}`);
      
      const jobsToRemove: JobApplication[] = [];
      const removedJobsList: Array<{ title: string; company: string; reason: string; category: JobCategory }> = [];
      const jobsByCategory: Record<JobCategory, number> = {} as Record<JobCategory, number>;
      
      // Initialize category counts
      const categories: JobCategory[] = ['frontend_developer', 'backend_developer', 'fullstack_developer', 
        'ai_engineer', 'data_scientist', 'it_manager', 'designer', 'devops_engineer', 
        'mobile_developer', 'qa_engineer', 'other_it', 'non_it'];
      categories.forEach(cat => jobsByCategory[cat] = 0);
      
      // Analyze each job
      for (const job of allJobs) {
        // Categorize the job
        const technologies = (job.technologies || []).map((tech: any) => {
          if (typeof tech === 'string') return tech;
          if (tech && typeof tech === 'object' && tech.name) return tech.name;
          return null;
        }).filter((tech: string | null): tech is string => tech !== null);
        
        const categorization = this.jobCategorizer.categorizeJob(
          job.job_title,
          job.description || '',
          technologies
        );
        
        jobsByCategory[categorization.category]++;
        
        // If it's non-IT, add to removal list
        if (categorization.category === 'non_it') {
          jobsToRemove.push(job);
          
          // Determine specific reason
          let reason = "Categorized as non-IT job";
          const titleLower = job.job_title.toLowerCase();
          const descriptionLower = (job.description || '').toLowerCase();
          
          // Check if title matches non-IT job titles
          for (const nonITTitle of this.NON_IT_JOB_TITLES) {
            if (titleLower.includes(nonITTitle.toLowerCase())) {
              reason = `Non-IT job title: "${nonITTitle}"`;
              break;
            }
          }
          
          // If not found in titles, check for exclusion keywords
          if (reason === "Categorized as non-IT job") {
            for (const excludeKeyword of this.EXCLUDE_KEYWORDS) {
              if (titleLower.includes(excludeKeyword) || descriptionLower.includes(excludeKeyword)) {
                reason = `Non-IT job containing: "${excludeKeyword}"`;
                break;
              }
            }
          }
          
          removedJobsList.push({
            title: job.job_title,
            company: job.company,
            reason,
            category: categorization.category
          });
        }
      }
      
      console.log(`🗑️ Found ${jobsToRemove.length} non-IT jobs to remove`);
      
      // Remove non-IT jobs
      for (const job of jobsToRemove) {
        if (job.id) {
          await this.supabaseService.deleteJob(job.id);
          console.log(`❌ Removed: ${job.job_title} at ${job.company}`);
        }
      }
      
      const results = {
        totalJobs,
        itJobs: totalJobs - jobsToRemove.length,
        removedJobs: jobsToRemove.length,
        removedJobsList: removedJobsList.slice(0, 20), // Limit to first 20 for logging
        jobsByCategory
      };
      
      console.log(`✅ Filtering complete! Kept ${results.itJobs} IT jobs, removed ${results.removedJobs} non-IT jobs`);
      console.log(`📊 Jobs by category:`);
      Object.entries(jobsByCategory).forEach(([category, count]) => {
        if (count > 0) {
          console.log(`   • ${this.jobCategorizer.getCategoryDisplayName(category as JobCategory)}: ${count}`);
        }
      });
      
      return results;
    } catch (error) {
      console.error("❌ Error filtering non-IT jobs:", error);
      throw error;
    }
  }

  /**
   * Get statistics about current job distribution
   */
  async analyzeJobDistribution(): Promise<{
    totalJobs: number;
    likelyITJobs: number;
    likelyNonITJobs: number;
    jobsByCategory: Record<JobCategory, number>;
    examples: {
      itJobs: Array<{ title: string; company: string; category: JobCategory }>;
      nonITJobs: Array<{ title: string; company: string; category: JobCategory }>;
    };
  }> {
    try {
      const allJobsResult = await this.supabaseService.getJobs({
        limit: 10000
      });
      
      const allJobs = allJobsResult.data;
      const itJobs: Array<JobApplication & { category: JobCategory }> = [];
      const nonITJobs: Array<JobApplication & { category: JobCategory }> = [];
      const jobsByCategory: Record<JobCategory, number> = {} as Record<JobCategory, number>;
      
      // Initialize category counts
      const categories: JobCategory[] = ['frontend_developer', 'backend_developer', 'fullstack_developer', 
        'ai_engineer', 'data_scientist', 'it_manager', 'designer', 'devops_engineer', 
        'mobile_developer', 'qa_engineer', 'other_it', 'non_it'];
      categories.forEach(cat => jobsByCategory[cat] = 0);
      
      for (const job of allJobs) {
        const technologies = (job.technologies || []).map((tech: any) => {
          if (typeof tech === 'string') return tech;
          if (tech && typeof tech === 'object' && tech.name) return tech.name;
          return null;
        }).filter((tech: string | null): tech is string => tech !== null);
        
        const categorization = this.jobCategorizer.categorizeJob(
          job.job_title,
          job.description || '',
          technologies
        );
        
        jobsByCategory[categorization.category]++;
        
        const jobWithCategory = { ...job, category: categorization.category };
        
        if (categorization.category === 'non_it') {
          nonITJobs.push(jobWithCategory);
        } else {
          itJobs.push(jobWithCategory);
        }
      }
      
      return {
        totalJobs: allJobs.length,
        likelyITJobs: itJobs.length,
        likelyNonITJobs: nonITJobs.length,
        jobsByCategory,
        examples: {
          itJobs: itJobs.slice(0, 5).map(j => ({ 
            title: j.job_title, 
            company: j.company,
            category: j.category
          })),
          nonITJobs: nonITJobs.slice(0, 5).map(j => ({ 
            title: j.job_title, 
            company: j.company,
            category: j.category
          }))
        }
      };
    } catch (error) {
      console.error("❌ Error analyzing job distribution:", error);
      throw error;
    }
  }
}