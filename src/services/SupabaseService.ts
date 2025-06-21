import { createClient, SupabaseClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

export interface JobSource {
  id?: string;
  name: string;
  display_name: string;
  base_url?: string;
  is_active?: boolean;
  created_at?: Date;
}

export interface Technology {
  id?: string;
  name: string;
  category?: string;
  description?: string;
  created_at?: Date;
}

export interface JobApplication {
  id?: string;
  job_title: string;
  company: string;
  location: string;
  job_url: string;
  salary?: string;
  description?: string;
  requirements?: string;
  source_id: string;
  scraped_at: Date;

  // Application tracking fields
  application_status:
    | "not_applied"
    | "applied"
    | "interview_scheduled"
    | "interview_completed"
    | "offer_received"
    | "rejected"
    | "withdrawn";
  applied_at?: Date;
  interview_date?: Date;
  notes?: string;
  priority: "low" | "medium" | "high";

  // Timestamps
  created_at?: Date;
  updated_at?: Date;

  // Populated fields (not in database)
  technologies?: Technology[];
  source?: JobSource;
}

export class SupabaseService {
  private supabase: SupabaseClient;
  private tableName = "job_applications";

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        "Missing Supabase environment variables. Please check your .env file."
      );
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // Get or create job source
  async getOrCreateJobSource(sourceName: string): Promise<string | null> {
    try {
      // First try to get existing source
      const { data: existingSource, error: getError } = await this.supabase
        .from("job_sources")
        .select("id")
        .eq("name", sourceName)
        .single();

      if (existingSource) {
        return existingSource.id;
      }

      if (getError && getError.code !== "PGRST116") {
        console.error("Error checking job source:", getError);
        return null;
      }

      // Create new source if it doesn't exist
      const { data: newSource, error: createError } = await this.supabase
        .from("job_sources")
        .insert({
          name: sourceName,
          display_name:
            sourceName.charAt(0).toUpperCase() + sourceName.slice(1),
          is_active: true,
        })
        .select("id")
        .single();

      if (createError) {
        console.error("Error creating job source:", createError);
        return null;
      }

      return newSource.id;
    } catch (error) {
      console.error("Error in getOrCreateJobSource:", error);
      return null;
    }
  }

  // Get or create technology with fuzzy matching
  async getOrCreateTechnology(
    technologyName: string,
    category = "tool"
  ): Promise<string | null> {
    try {
      // Normalize the technology name for better matching
      const normalizedName = this.normalizeTechnologyName(technologyName);

      // First try exact match with normalized name
      const { data: exactMatch, error: exactError } = await this.supabase
        .from("technologies")
        .select("id, name")
        .ilike("name", normalizedName)
        .single();

      if (exactMatch) {
        return exactMatch.id;
      }

      if (exactError && exactError.code !== "PGRST116") {
        console.error("Error checking technology:", exactError);
        return null;
      }

      // Try fuzzy matching for common variations
      const fuzzyMatch = await this.findTechnologyByFuzzyMatch(normalizedName);
      if (fuzzyMatch) {
        return fuzzyMatch.id;
      }

      // Create new technology if no match found
      const { data: newTech, error: createError } = await this.supabase
        .from("technologies")
        .insert({
          name: normalizedName,
          category: this.categorizeTechnology(normalizedName) || category,
        })
        .select("id")
        .single();

      if (createError) {
        console.error("Error creating technology:", createError);
        return null;
      }

      console.log(`✨ Created new technology: ${normalizedName}`);
      return newTech.id;
    } catch (error) {
      console.error("Error in getOrCreateTechnology:", error);
      return null;
    }
  }

  // Normalize technology names for consistent matching
  private normalizeTechnologyName(name: string): string {
    // Remove extra spaces and convert to a standard format
    let normalized = name.trim().replace(/\s+/g, " ");

    // Common technology name normalizations
    const normalizations: { [key: string]: string } = {
      // Node.js variations
      "node js": "Node.js",
      nodejs: "Node.js",
      "node.js": "Node.js",
      "NODE JS": "Node.js",
      NODEJS: "Node.js",

      // React variations
      "react js": "React",
      reactjs: "React",
      "react.js": "React",

      // Vue variations
      "vue js": "Vue.js",
      vuejs: "Vue.js",
      "vue.js": "Vue.js",

      // Angular variations
      "angular js": "Angular",
      angularjs: "AngularJS", // Different framework
      "angular.js": "AngularJS",

      // TypeScript variations
      "type script": "TypeScript",
      typescript: "TypeScript",

      // Database variations
      postgres: "PostgreSQL",
      postgresql: "PostgreSQL",
      "mongo db": "MongoDB",
      mongodb: "MongoDB",
      mysql: "MySQL",

      // Cloud variations
      "amazon web services": "AWS",
      aws: "AWS",
      "google cloud platform": "Google Cloud",
      gcp: "Google Cloud",
      "microsoft azure": "Azure",
      azure: "Azure",

      // Other common variations
      "c sharp": "C#",
      "c#": "C#",
      "dot net": ".NET",
      dotnet: ".NET",
      ".net": ".NET",
      "rest api": "REST API",
      restapi: "REST API",
      graphql: "GraphQL",
      "git hub": "GitHub",
      github: "GitHub",
    };

    const lowerKey = normalized.toLowerCase();
    return normalizations[lowerKey] || this.capitalizeProperNoun(normalized);
  }

  // Capitalize technology names properly
  private capitalizeProperNoun(name: string): string {
    // Special cases that should remain as-is
    const specialCases = [
      "iOS",
      "macOS",
      "MySQL",
      "PostgreSQL",
      "MongoDB",
      "GraphQL",
    ];

    for (const special of specialCases) {
      if (name.toLowerCase() === special.toLowerCase()) {
        return special;
      }
    }

    // Default capitalization: first letter uppercase, rest lowercase unless it's an acronym
    if (name.length <= 3 && name.toUpperCase() === name) {
      return name.toUpperCase(); // Likely an acronym like AWS, API, etc.
    }

    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  }

  // Find technology by fuzzy matching
  private async findTechnologyByFuzzyMatch(
    normalizedName: string
  ): Promise<{ id: string; name: string } | null> {
    try {
      // Get all technologies for fuzzy matching
      const { data: allTechs, error } = await this.supabase
        .from("technologies")
        .select("id, name");

      if (error || !allTechs) {
        return null;
      }

      // Simple fuzzy matching - you could use a library like 'fuse.js' for more advanced matching
      const lowerTarget = normalizedName.toLowerCase();

      for (const tech of allTechs) {
        const lowerTech = tech.name.toLowerCase();

        // Exact match (already checked above, but just in case)
        if (lowerTech === lowerTarget) {
          return tech;
        }

        // Contains match (e.g., "Node" matches "Node.js")
        if (
          lowerTech.includes(lowerTarget) ||
          lowerTarget.includes(lowerTech)
        ) {
          // Additional validation to avoid false positives
          if (this.isSimilarTechnology(lowerTarget, lowerTech)) {
            console.log(
              `🔄 Fuzzy matched "${normalizedName}" to existing "${tech.name}"`
            );
            return tech;
          }
        }
      }

      return null;
    } catch (error) {
      console.error("Error in findTechnologyByFuzzyMatch:", error);
      return null;
    }
  }

  // Check if two technology names are similar enough to be considered the same
  private isSimilarTechnology(name1: string, name2: string): boolean {
    // Remove common suffixes/prefixes for comparison
    const cleanName1 = name1
      .replace(/\.(js|ts)$/, "")
      .replace(/^(lib|framework)/, "");
    const cleanName2 = name2
      .replace(/\.(js|ts)$/, "")
      .replace(/^(lib|framework)/, "");

    // Check if the core names are similar
    const similarity = this.calculateSimilarity(cleanName1, cleanName2);
    return similarity > 0.8; // 80% similarity threshold
  }

  // Simple string similarity calculation (Levenshtein distance based)
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) {
      return 1.0;
    }

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  // Calculate Levenshtein distance between two strings
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  // Auto-categorize technology based on name
  private categorizeTechnology(name: string): string | null {
    const lowerName = name.toLowerCase();

    const categories = {
      language: [
        "javascript",
        "typescript",
        "python",
        "java",
        "c#",
        "php",
        "go",
        "rust",
        "kotlin",
        "swift",
        "c++",
        "ruby",
      ],
      framework: [
        "react",
        "vue.js",
        "angular",
        "node.js",
        "express.js",
        "django",
        "laravel",
        "spring boot",
        ".net",
        "next.js",
      ],
      database: [
        "postgresql",
        "mysql",
        "mongodb",
        "redis",
        "sqlite",
        "oracle",
        "cassandra",
        "dynamodb",
      ],
      cloud: [
        "aws",
        "azure",
        "google cloud",
        "heroku",
        "digitalocean",
        "vercel",
        "netlify",
      ],
      tool: [
        "docker",
        "kubernetes",
        "git",
        "jenkins",
        "webpack",
        "vite",
        "babel",
        "eslint",
      ],
      testing: ["jest", "cypress", "selenium", "mocha", "jasmine", "junit"],
      methodology: ["agile", "scrum", "kanban", "devops", "ci/cd"],
    };

    for (const [category, techs] of Object.entries(categories)) {
      if (
        techs.some(
          (tech) => lowerName.includes(tech) || tech.includes(lowerName)
        )
      ) {
        return category;
      }
    }

    return null;
  }

  // Check if a job already exists (by URL to avoid duplicates)
  async jobExists(jobUrl: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select("id")
        .eq("job_url", jobUrl)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows returned
        console.error("Error checking if job exists:", error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error("Error in jobExists:", error);
      return false;
    }
  }

  // Insert a new job application with technologies
  async insertJob(
    job: Omit<JobApplication, "id" | "created_at" | "updated_at">,
    technologies: string[] = []
  ): Promise<JobApplication | null> {
    try {
      // Get or create source ID
      const sourceId = await this.getOrCreateJobSource(
        job.source?.name || "unknown"
      );
      if (!sourceId) {
        console.error("Failed to get or create job source");
        return null;
      }

      // Insert the job application
      const { data: jobData, error: jobError } = await this.supabase
        .from(this.tableName)
        .insert({
          job_title: job.job_title,
          company: job.company,
          location: job.location,
          job_url: job.job_url,
          salary: job.salary,
          description: job.description,
          requirements: job.requirements,
          source_id: sourceId,
          scraped_at: job.scraped_at.toISOString(),
          application_status: job.application_status || "not_applied",
          applied_at: job.applied_at?.toISOString(),
          interview_date: job.interview_date?.toISOString(),
          notes: job.notes,
          priority: job.priority || "medium",
        })
        .select()
        .single();

      if (jobError) {
        console.error("Error inserting job:", jobError);
        return null;
      }

      // Insert technologies if provided
      if (technologies.length > 0) {
        const technologyRelations = [];

        for (const techName of technologies) {
          const techId = await this.getOrCreateTechnology(techName);
          if (techId) {
            technologyRelations.push({
              job_application_id: jobData.id,
              technology_id: techId,
            });
          }
        }

        if (technologyRelations.length > 0) {
          const { error: techError } = await this.supabase
            .from("job_application_technologies")
            .insert(technologyRelations);

          if (techError) {
            console.error("Error inserting job technologies:", techError);
            // Job was inserted but technologies failed - could be handled differently
          }
        }
      }

      return jobData as JobApplication;
    } catch (error) {
      console.error("Error in insertJob:", error);
      return null;
    }
  }

  // Update application status
  async updateApplicationStatus(
    jobId: string,
    status: JobApplication["application_status"],
    additionalData?: Partial<
      Pick<JobApplication, "applied_at" | "interview_date" | "notes">
    >
  ): Promise<boolean> {
    try {
      const updateData: any = {
        application_status: status,
        updated_at: new Date().toISOString(),
      };

      if (additionalData?.applied_at) {
        updateData.applied_at = additionalData.applied_at.toISOString();
      }
      if (additionalData?.interview_date) {
        updateData.interview_date = additionalData.interview_date.toISOString();
      }
      if (additionalData?.notes !== undefined) {
        updateData.notes = additionalData.notes;
      }

      const { error } = await this.supabase
        .from(this.tableName)
        .update(updateData)
        .eq("id", jobId);

      if (error) {
        console.error("Error updating application status:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error in updateApplicationStatus:", error);
      return false;
    }
  }

  // Get all jobs with optional filtering and pagination (uses view with technologies)
  async getJobs(filters?: {
    status?: JobApplication["application_status"];
    company?: string;
    source?: string;
    priority?: JobApplication["priority"];
    technology?: string;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    data: JobApplication[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const offset = (page - 1) * limit;
      const sortBy = filters?.sortBy || 'scraped_at';
      const sortOrder = filters?.sortOrder || 'desc';

      // First, get the total count
      let countQuery = this.supabase
        .from("jobs_with_technologies")
        .select("*", { count: 'exact', head: true });

      // Apply filters to count query
      if (filters?.status) {
        countQuery = countQuery.eq("application_status", filters.status);
      }
      if (filters?.company) {
        countQuery = countQuery.ilike("company", `%${filters.company}%`);
      }
      if (filters?.source) {
        countQuery = countQuery.eq("source_name", filters.source);
      }
      if (filters?.priority) {
        countQuery = countQuery.eq("priority", filters.priority);
      }
      if (filters?.technology) {
        countQuery = countQuery.contains("technologies", [filters.technology]);
      }
      if (filters?.search) {
        countQuery = countQuery.or(`job_title.ilike.%${filters.search}%,company.ilike.%${filters.search}%,location.ilike.%${filters.search}%`);
      }

      const { count } = await countQuery;

      // Now get the actual data
      let query = this.supabase
        .from("jobs_with_technologies")
        .select("*")
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(offset, offset + limit - 1);

      // Apply same filters to data query
      if (filters?.status) {
        query = query.eq("application_status", filters.status);
      }
      if (filters?.company) {
        query = query.ilike("company", `%${filters.company}%`);
      }
      if (filters?.source) {
        query = query.eq("source_name", filters.source);
      }
      if (filters?.priority) {
        query = query.eq("priority", filters.priority);
      }
      if (filters?.technology) {
        query = query.contains("technologies", [filters.technology]);
      }
      if (filters?.search) {
        query = query.or(`job_title.ilike.%${filters.search}%,company.ilike.%${filters.search}%,location.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching jobs:", error);
        return {
          data: [],
          total: 0,
          page,
          limit,
          totalPages: 0
        };
      }

      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        data: data as JobApplication[],
        total,
        page,
        limit,
        totalPages
      };
    } catch (error) {
      console.error("Error in getJobs:", error);
      return {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0
      };
    }
  }

  // Get jobs ready for application (not_applied status with specific technologies)
  async getJobsForApplication(): Promise<JobApplication[]> {
    try {
      // Define the technologies we want to apply for
      const targetTechnologies = [
        "Node.js",
        "React",
        "TypeScript",
        "JavaScript",
        "Python",
        "Angular",
        "Vue.js",
      ];

      let query = this.supabase
        .from("jobs_with_technologies")
        .select("*")
        .eq("application_status", "not_applied")
        .order("created_at", { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching jobs for application:", error);
        return [];
      }

      if (!data) {
        return [];
      }

      // Filter jobs that have at least one of our target technologies
      const filteredJobs = data.filter((job: any) => {
        if (
          !job.technologies ||
          !Array.isArray(job.technologies) ||
          job.technologies[0] === null
        ) {
          return false;
        }

        // Check if any of the job's technologies match our target technologies
        return job.technologies.some((tech: string) =>
          targetTechnologies.some(
            (targetTech) =>
              tech.toLowerCase().includes(targetTech.toLowerCase()) ||
              targetTech.toLowerCase().includes(tech.toLowerCase())
          )
        );
      });

      console.log(
        `📋 Found ${filteredJobs.length} jobs ready for application out of ${data.length} total not_applied jobs`
      );
      return filteredJobs as JobApplication[];
    } catch (error) {
      console.error("Error in getJobsForApplication:", error);
      return [];
    }
  }

  // Get job statistics
  async getJobStats(): Promise<{
    total: number;
    notApplied: number;
    applied: number;
    interviews: number;
    offers: number;
    rejected: number;
  }> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select("application_status");

      if (error) {
        console.error("Error fetching job stats:", error);
        return {
          total: 0,
          notApplied: 0,
          applied: 0,
          interviews: 0,
          offers: 0,
          rejected: 0,
        };
      }

      const stats = {
        total: data.length,
        notApplied: data.filter(
          (job) => job.application_status === "not_applied"
        ).length,
        applied: data.filter((job) => job.application_status === "applied")
          .length,
        interviews: data.filter((job) =>
          ["interview_scheduled", "interview_completed"].includes(
            job.application_status
          )
        ).length,
        offers: data.filter(
          (job) => job.application_status === "offer_received"
        ).length,
        rejected: data.filter((job) => job.application_status === "rejected")
          .length,
      };

      return stats;
    } catch (error) {
      console.error("Error in getJobStats:", error);
      return {
        total: 0,
        notApplied: 0,
        applied: 0,
        interviews: 0,
        offers: 0,
        rejected: 0,
      };
    }
  }

  // Bulk insert jobs (for scraping results)
  async bulkInsertJobs(
    jobs: Array<{
      job: Omit<JobApplication, "id" | "created_at" | "updated_at">;
      technologies: string[];
    }>
  ): Promise<{
    inserted: number;
    skipped: number;
    errors: string[];
  }> {
    const result = {
      inserted: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const { job, technologies } of jobs) {
      try {
        // Check if job already exists
        const exists = await this.jobExists(job.job_url);

        if (exists) {
          result.skipped++;
          console.log(
            `⏭️ Skipping existing job: ${job.job_title} at ${job.company}`
          );
          continue;
        }

        // Insert new job with technologies
        const inserted = await this.insertJob(job, technologies);

        if (inserted) {
          result.inserted++;
          console.log(
            `✅ Inserted new job: ${job.job_title} at ${job.company} with ${technologies.length} technologies`
          );
        } else {
          result.errors.push(
            `Failed to insert: ${job.job_title} at ${job.company}`
          );
        }
      } catch (error) {
        result.errors.push(`Error processing ${job.job_title}: ${error}`);
      }
    }

    return result;
  }

  // Get all job sources
  async getJobSources(): Promise<JobSource[]> {
    try {
      const { data, error } = await this.supabase
        .from("job_sources")
        .select("*")
        .order("display_name");

      if (error) {
        console.error("Error fetching job sources:", error);
        return [];
      }

      return data as JobSource[];
    } catch (error) {
      console.error("Error in getJobSources:", error);
      return [];
    }
  }

  // Get all technologies
  async getTechnologies(): Promise<Technology[]> {
    try {
      const { data, error } = await this.supabase
        .from("technologies")
        .select("*")
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      if (error) {
        console.error("Error fetching technologies:", error);
        return [];
      }

      return data as Technology[];
    } catch (error) {
      console.error("Error in getTechnologies:", error);
      return [];
    }
  }
}
