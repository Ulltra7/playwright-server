import { createClient, SupabaseClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { JOB_ROLE_KEYWORDS, JobRole } from "../constants/jobRoleKeywords";

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
  job_roles?: string[];
  description?: string;
  created_at?: Date;
}

// New Job interface for the jobs table
export interface Job {
  id?: string;
  job_title: string;
  company: string;
  location: string;
  job_url: string;
  salary?: string;
  description?: string;
  requirements?: string;
  source_id: string;
  is_active?: boolean;
  created_at?: Date;
  updated_at?: Date;

  // Populated fields (not in database)
  technologies?: Technology[];
  source?: JobSource;
}

// New Application interface for the applications table
export interface Application {
  id?: string;
  job_id: string;
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
  created_at?: Date;
  updated_at?: Date;
}

// Keep JobApplication interface for backward compatibility
export interface JobApplication extends Job {
  // Application tracking fields
  application_status?: Application["application_status"];
  priority?: Application["priority"];
  applied_at?: Date;
  interview_date?: Date;
  notes?: string;
}

export class SupabaseService {
  public readonly supabase: SupabaseClient;

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
          display_name: this.formatSourceDisplayName(sourceName),
        })
        .select()
        .single();

      if (createError || !newSource) {
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
      const normalizedName = this.normalizeTechnologyName(technologyName);

      if (!normalizedName) {
        return null;
      }

      // First try exact match
      const { data: exactMatch, error: exactError } = await this.supabase
        .from("technologies")
        .select("id, name")
        .eq("name", normalizedName)
        .single();

      if (exactMatch) {
        return exactMatch.id;
      }

      // If no exact match and not a "no rows" error, log it
      if (exactError && exactError.code !== "PGRST116") {
        console.error("Error checking existing technology:", exactError);
      }

      // Try fuzzy matching for common variations
      const fuzzyMatch = await this.findTechnologyByFuzzyMatch(normalizedName);
      if (fuzzyMatch) {
        return fuzzyMatch.id;
      }

      // Create new technology
      const detectedCategory = this.categorizeTechnology(normalizedName);
      const { data: newTech, error: createError } = await this.supabase
        .from("technologies")
        .insert({
          name: normalizedName,
          category: detectedCategory || category,
        })
        .select()
        .single();

      if (createError || !newTech) {
        console.error("Error creating technology:", createError);
        return null;
      }

      // Link technology to job roles
      await this.linkTechnologyToJobRoles(newTech.id, normalizedName);

      return newTech.id;
    } catch (error) {
      console.error("Error in getOrCreateTechnology:", error);
      return null;
    }
  }

  // Normalize technology names
  private normalizeTechnologyName(name: string): string {
    // Trim and check for empty
    const trimmed = name.trim();
    if (!trimmed) return "";

    // Remove common suffixes/prefixes that don't add value
    const cleaned = trimmed
      .replace(/\s*\(.*?\)\s*/g, "") // Remove parenthetical content
      .replace(/[^\w\s\.\#\+\-]/g, " ") // Keep only alphanumeric, spaces, and common tech chars
      .replace(/\s+/g, " ") // Normalize multiple spaces
      .trim();

    // Common technology name normalizations
    const normalizations: { [key: string]: string } = {
      // JavaScript variations
      javascript: "JavaScript",
      js: "JavaScript",
      "java script": "JavaScript",

      // Node.js variations
      "node.js": "Node.js",
      nodejs: "Node.js",
      node: "Node.js",
      "node js": "Node.js",

      // React variations
      react: "React",
      "react.js": "React",
      reactjs: "React",
      "react js": "React",

      // Vue variations
      vue: "Vue.js",
      "vue.js": "Vue.js",
      vuejs: "Vue.js",
      "vue js": "Vue.js",

      // Angular variations
      angular: "Angular",
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

    const lowerKey = cleaned.toLowerCase();
    return normalizations[lowerKey] || this.capitalizeProperNoun(cleaned);
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
          if (this.isSimilarTechnology(normalizedName, tech.name)) {
            return tech;
          }
        }

        // Calculate similarity for close matches
        const similarity = this.calculateSimilarity(lowerTarget, lowerTech);
        if (similarity > 0.8) {
          // 80% similarity threshold
          return tech;
        }
      }

      return null;
    } catch (error) {
      console.error("Error in fuzzy matching:", error);
      return null;
    }
  }

  // Check if two technology names are similar
  private isSimilarTechnology(name1: string, name2: string): boolean {
    const lower1 = name1.toLowerCase();
    const lower2 = name2.toLowerCase();

    // Check for common variations
    const variations = [
      ["js", "javascript"],
      ["node", "node.js"],
      ["react", "react.js"],
      ["vue", "vue.js"],
      ["angular", "angularjs"],
    ];

    for (const [a, b] of variations) {
      if (
        (lower1.includes(a) && lower2.includes(b)) ||
        (lower1.includes(b) && lower2.includes(a))
      ) {
        return true;
      }
    }

    return false;
  }

  // Calculate similarity between two strings (0-1)
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) {
      return 1.0;
    }

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  // Calculate Levenshtein distance
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  // Link technology to appropriate job roles
  private async linkTechnologyToJobRoles(
    technologyId: string,
    technologyName: string
  ): Promise<void> {
    try {
      const jobRoles = this.determineJobRoles(technologyName);

      if (jobRoles.length === 0) {
        return;
      }

      // Update the technology with job roles
      const { error } = await this.supabase
        .from("technologies")
        .update({ job_roles: jobRoles.map((r) => r.role) })
        .eq("id", technologyId);

      if (error) {
        console.error("Error updating technology job roles:", error);
      }
    } catch (error) {
      console.error("Error linking technology to job roles:", error);
    }
  }

  // Determine which job roles a technology belongs to
  private determineJobRoles(
    name: string
  ): Array<{ role: string; relevance: number }> {
    const lowerName = name.toLowerCase();
    const roles: Array<{ role: string; relevance: number }> = [];

    // Backend role patterns
    const backendPatterns = [
      // Languages
      { pattern: /\b(java|kotlin|scala)\b/, relevance: 1.0 },
      { pattern: /\b(python|django|flask|fastapi)\b/, relevance: 1.0 },
      { pattern: /\b(c#|\.net|asp\.net|dotnet)\b/, relevance: 1.0 },
      { pattern: /\b(php|laravel|symfony)\b/, relevance: 1.0 },
      { pattern: /\b(ruby|rails)\b/, relevance: 1.0 },
      { pattern: /\b(go|golang)\b/, relevance: 1.0 },
      { pattern: /\b(rust)\b/, relevance: 1.0 },
      { pattern: /\b(node\.js|nodejs|express|nestjs)\b/, relevance: 0.9 },
      { pattern: /\b(elixir|phoenix)\b/, relevance: 1.0 },

      // Backend specific tools
      { pattern: /\b(spring|spring boot|hibernate)\b/, relevance: 1.0 },
      { pattern: /\b(microservices|api|rest|graphql|grpc)\b/, relevance: 0.9 },
      { pattern: /\b(rabbitmq|kafka|redis|memcached)\b/, relevance: 0.9 },
      { pattern: /\b(elasticsearch|solr)\b/, relevance: 0.8 },
    ];

    // Frontend role patterns
    const frontendPatterns = [
      // Core frontend
      { pattern: /\b(html|css|sass|scss|less)\b/, relevance: 1.0 },
      { pattern: /\b(javascript|typescript|js|ts)\b/, relevance: 0.9 },

      // Frameworks
      { pattern: /\b(react|reactjs|react\.js|redux)\b/, relevance: 1.0 },
      { pattern: /\b(angular|angularjs)\b/, relevance: 1.0 },
      { pattern: /\b(vue|vuejs|vue\.js|vuex)\b/, relevance: 1.0 },
      { pattern: /\b(svelte|sveltekit)\b/, relevance: 1.0 },
      { pattern: /\b(next\.js|nextjs|gatsby|nuxt)\b/, relevance: 1.0 },

      // Frontend tools
      { pattern: /\b(webpack|vite|rollup|parcel)\b/, relevance: 0.8 },
      {
        pattern: /\b(tailwind|bootstrap|material.ui|chakra)\b/,
        relevance: 0.9,
      },
      { pattern: /\b(styled.components|emotion)\b/, relevance: 0.8 },
    ];

    // Fullstack patterns (can be both)
    const fullstackPatterns = [
      { pattern: /\b(javascript|typescript|js|ts)\b/, relevance: 0.8 },
      { pattern: /\b(node\.js|nodejs)\b/, relevance: 0.8 },
      { pattern: /\b(next\.js|nextjs|nuxt|sveltekit)\b/, relevance: 0.9 },
      { pattern: /\b(fullstack|full.stack)\b/, relevance: 1.0 },
    ];

    // Mobile patterns
    const mobilePatterns = [
      { pattern: /\b(react.native|reactnative)\b/, relevance: 1.0 },
      { pattern: /\b(flutter|dart)\b/, relevance: 1.0 },
      { pattern: /\b(swift|ios|iphone|ipad)\b/, relevance: 1.0 },
      { pattern: /\b(kotlin|android)\b/, relevance: 1.0 },
      { pattern: /\b(xamarin)\b/, relevance: 1.0 },
      { pattern: /\b(ionic|cordova|phonegap)\b/, relevance: 0.9 },
    ];

    // DevOps patterns
    const devopsPatterns = [
      { pattern: /\b(docker|kubernetes|k8s)\b/, relevance: 1.0 },
      { pattern: /\b(aws|azure|gcp|google.cloud)\b/, relevance: 0.9 },
      { pattern: /\b(terraform|ansible|puppet|chef)\b/, relevance: 1.0 },
      {
        pattern: /\b(jenkins|gitlab.ci|github.actions|circleci)\b/,
        relevance: 1.0,
      },
      { pattern: /\b(prometheus|grafana|datadog|newrelic)\b/, relevance: 0.9 },
      { pattern: /\b(nginx|apache|load.balancer)\b/, relevance: 0.8 },
      { pattern: /\b(bash|shell|linux|unix)\b/, relevance: 0.7 },
    ];

    // Data patterns
    const dataPatterns = [
      // Databases
      { pattern: /\b(sql|mysql|postgresql|postgres|oracle)\b/, relevance: 0.8 },
      { pattern: /\b(mongodb|cassandra|couchdb|dynamodb)\b/, relevance: 0.8 },
      { pattern: /\b(bigquery|redshift|snowflake)\b/, relevance: 1.0 },

      // Data tools
      { pattern: /\b(pandas|numpy|scipy|jupyter)\b/, relevance: 1.0 },
      { pattern: /\b(spark|hadoop|hive|presto)\b/, relevance: 1.0 },
      { pattern: /\b(tableau|powerbi|looker|qlik)\b/, relevance: 1.0 },
      { pattern: /\b(etl|data.pipeline|airflow|luigi)\b/, relevance: 1.0 },
    ];

    // AI/ML patterns
    const aimlPatterns = [
      {
        pattern: /\b(tensorflow|pytorch|keras|scikit.learn)\b/,
        relevance: 1.0,
      },
      { pattern: /\b(machine.learning|ml|deep.learning|dl)\b/, relevance: 1.0 },
      { pattern: /\b(nlp|computer.vision|cv)\b/, relevance: 1.0 },
      { pattern: /\b(hugging.face|transformers|bert|gpt)\b/, relevance: 1.0 },
      { pattern: /\b(mlflow|kubeflow|sagemaker)\b/, relevance: 0.9 },
    ];

    // Security patterns
    const securityPatterns = [
      { pattern: /\b(security|cybersecurity|infosec)\b/, relevance: 1.0 },
      {
        pattern: /\b(penetration.testing|pen.test|ethical.hacking)\b/,
        relevance: 1.0,
      },
      { pattern: /\b(owasp|burp.suite|metasploit|nmap)\b/, relevance: 1.0 },
      { pattern: /\b(siem|splunk|elastic.security)\b/, relevance: 1.0 },
      { pattern: /\b(cryptography|encryption|ssl|tls)\b/, relevance: 0.9 },
    ];

    // QA patterns
    const qaPatterns = [
      {
        pattern: /\b(selenium|cypress|playwright|puppeteer)\b/,
        relevance: 1.0,
      },
      { pattern: /\b(jest|mocha|jasmine|karma)\b/, relevance: 0.9 },
      { pattern: /\b(pytest|unittest|testng|junit)\b/, relevance: 0.9 },
      { pattern: /\b(postman|insomnia|soapui)\b/, relevance: 0.8 },
      { pattern: /\b(jmeter|locust|gatling)\b/, relevance: 0.9 },
      {
        pattern: /\b(qa|quality.assurance|testing|test.automation)\b/,
        relevance: 1.0,
      },
    ];

    // Game dev patterns
    const gameDevPatterns = [
      { pattern: /\b(unity|unreal|godot)\b/, relevance: 1.0 },
      { pattern: /\b(c\+\+|csharp|c#)\b/, relevance: 0.7 },
      { pattern: /\b(opengl|directx|vulkan|webgl)\b/, relevance: 1.0 },
      { pattern: /\b(game.engine|game.development|gamedev)\b/, relevance: 1.0 },
      { pattern: /\b(blender|maya|3ds.max)\b/, relevance: 0.8 },
    ];

    // Blockchain patterns
    const blockchainPatterns = [
      { pattern: /\b(blockchain|ethereum|bitcoin|crypto)\b/, relevance: 1.0 },
      { pattern: /\b(solidity|web3|smart.contract)\b/, relevance: 1.0 },
      { pattern: /\b(defi|dapp|nft)\b/, relevance: 1.0 },
      { pattern: /\b(truffle|hardhat|ganache)\b/, relevance: 1.0 },
    ];

    // Check each pattern category
    const checkPatterns = (
      patterns: Array<{ pattern: RegExp; relevance: number }>,
      roleName: string
    ) => {
      let maxRelevance = 0;
      for (const { pattern, relevance } of patterns) {
        if (pattern.test(lowerName)) {
          maxRelevance = Math.max(maxRelevance, relevance);
        }
      }
      if (maxRelevance > 0) {
        roles.push({ role: roleName, relevance: maxRelevance });
      }
    };

    checkPatterns(backendPatterns, "backend");
    checkPatterns(frontendPatterns, "frontend");
    checkPatterns(fullstackPatterns, "fullstack");
    checkPatterns(mobilePatterns, "mobile");
    checkPatterns(devopsPatterns, "devops");
    checkPatterns(dataPatterns, "data");
    checkPatterns(aimlPatterns, "ai_ml");
    checkPatterns(securityPatterns, "security");
    checkPatterns(qaPatterns, "qa");
    checkPatterns(gameDevPatterns, "game_dev");
    checkPatterns(blockchainPatterns, "blockchain");

    // Sort by relevance
    return roles.sort((a, b) => b.relevance - a.relevance);
  }

  // Auto-categorize technology based on name
  private categorizeTechnology(name: string): string | null {
    const lowerName = name.toLowerCase();

    // Language patterns
    if (
      /\b(javascript|typescript|python|java|c\+\+|c#|ruby|go|rust|php|swift|kotlin|scala|elixir|haskell|clojure|r|matlab|julia|perl|lua|dart|objective.c)\b/.test(
        lowerName
      )
    ) {
      return "language";
    }

    // Framework patterns
    if (
      /\b(react|angular|vue|svelte|next|nuxt|gatsby|django|flask|fastapi|spring|express|nestjs|rails|laravel|symfony|asp\.net|gin|echo|phoenix)\b/.test(
        lowerName
      )
    ) {
      return "framework";
    }

    // Database patterns
    if (
      /\b(sql|mysql|postgresql|postgres|mongodb|redis|cassandra|elasticsearch|dynamodb|firebase|supabase|prisma|sequelize|typeorm)\b/.test(
        lowerName
      )
    ) {
      return "database";
    }

    // Cloud patterns
    if (
      /\b(aws|amazon|azure|google cloud|gcp|digitalocean|heroku|vercel|netlify|cloudflare)\b/.test(
        lowerName
      )
    ) {
      return "cloud";
    }

    // Tool patterns
    if (
      /\b(git|docker|kubernetes|jenkins|webpack|vite|npm|yarn|gradle|maven|jest|cypress|selenium|postman|figma|jira|slack)\b/.test(
        lowerName
      )
    ) {
      return "tool";
    }

    // Architecture patterns
    if (
      /\b(microservices|serverless|rest|graphql|grpc|soap|mvc|mvvm|clean architecture|hexagonal|event.driven|cqrs)\b/.test(
        lowerName
      )
    ) {
      return "architecture";
    }

    // Methodology patterns
    if (
      /\b(agile|scrum|kanban|waterfall|devops|ci\/cd|tdd|bdd|pair programming|xp)\b/.test(
        lowerName
      )
    ) {
      return "methodology";
    }

    // Default to tool
    return "tool";
  }

  // Format source display name
  private formatSourceDisplayName(sourceName: string): string {
    const mappings: { [key: string]: string } = {
      swissdevjobs: "Swiss Dev Jobs",
      linkedin: "LinkedIn",
      indeed: "Indeed",
      xing: "Xing",
      jobs_ch: "Jobs.ch",
      arbeitnow: "Arbeitnow",
    };

    return mappings[sourceName.toLowerCase()] || sourceName;
  }

  // Check if a job already exists
  async jobExists(jobUrl: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from("jobs")
        .select("id")
        .eq("job_url", jobUrl)
        .single();

      // If we get a row, job exists
      if (data) return true;

      // If error is "no rows", job doesn't exist
      if (error && error.code === "PGRST116") return false;

      // Any other error, log it and assume job doesn't exist
      if (error) {
        console.error("Error checking job existence:", error);
      }

      return false;
    } catch (error) {
      console.error("Error in jobExists:", error);
      return false;
    }
  }

  // Get jobs with optional filtering (uses view for backward compatibility)
  async getJobs(
    params: {
      search?: string;
      role?: string;
      page?: number;
      pageSize?: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    } = {}
  ): Promise<{
    data: JobApplication[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    try {
      const {
        search,
        role,
        page = 1,
        pageSize = 50,
        sortBy = "created_at",
        sortOrder = "desc",
      } = params;

      // Build the base query using the jobs table
      let query = this.supabase
        .from("jobs")
        .select(
          `
          *,
          source:job_sources(id, name, display_name)
        `,
          { count: "exact" }
        )
        .eq("is_active", true); // Only show active jobs by default

      // Apply search filter
      if (search) {
        query = query.or(
          `job_title.ilike.%${search}%,company.ilike.%${search}%,location.ilike.%${search}%,description.ilike.%${search}%`
        );
      }

      // Apply role filter using keyword matching
      if (role && role in JOB_ROLE_KEYWORDS) {
        const roleKeywords = JOB_ROLE_KEYWORDS[role as JobRole];

        // Build OR conditions for title keywords
        const titleConditions = roleKeywords.titleKeywords
          .map((keyword) => `job_title.ilike.%${keyword}%`)
          .join(",");

        // Apply title filter
        if (titleConditions) {
          query = query.or(titleConditions);
        }
      }

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === "asc" });

      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        console.error("Error fetching jobs:", error);
        throw error;
      }

      // Fetch technologies for the jobs
      if (data && data.length > 0) {
        const jobIds = data.map((job) => job.id);

        const { data: jobTechs } = await this.supabase
          .from("job_technologies")
          .select(
            `
            job_id,
            technologies (
              id,
              name,
              category
            )
          `
          )
          .in("job_id", jobIds);

        // Map technologies to jobs
        const techMap = new Map<string, Technology[]>();
        if (jobTechs) {
          jobTechs.forEach((jt: any) => {
            if (!techMap.has(jt.job_id)) {
              techMap.set(jt.job_id, []);
            }
            if (jt.technologies) {
              techMap.get(jt.job_id)!.push(jt.technologies);
            }
          });
        }

        // Add technologies to jobs
        data.forEach((job) => {
          job.technologies = techMap.get(job.id) || [];
        });

        // Additional filtering by role tech keywords if role is specified
        let filteredData = data;
        if (role && role in JOB_ROLE_KEYWORDS) {
          const roleKeywords = JOB_ROLE_KEYWORDS[role as JobRole];

          // Filter by matching any of the tech keywords
          filteredData = filteredData.filter((job) => {
            // Check if job title matches any title keyword
            const titleLower = job.job_title.toLowerCase();
            const titleMatch = roleKeywords.titleKeywords.some((keyword) =>
              titleLower.includes(keyword.toLowerCase())
            );

            // Check if technologies match any tech keyword
            const techMatch = job.technologies?.some((t: any) =>
              roleKeywords.techKeywords.some((keyword) =>
                t.name.toLowerCase().includes(keyword.toLowerCase())
              )
            );

            // Job matches if either title or tech matches
            return titleMatch || techMatch;
          });
        }

        return {
          data: filteredData,
          total: role ? filteredData.length : count || 0,
          page,
          pageSize,
          totalPages: Math.ceil(
            (role ? filteredData.length : count || 0) / pageSize
          ),
        };
      }

      return {
        data: data || [],
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    } catch (error) {
      console.error("Error in getJobs:", error);
      return {
        data: [],
        total: 0,
        page: 1,
        pageSize: params.pageSize || 50,
        totalPages: 0,
      };
    }
  }

  // Get jobs ready for application
  async getJobsForApplication(): Promise<JobApplication[]> {
    try {
      // For testing, prioritize SwissDevJobs
      const { data: swissDevJobs, error: swissError } = await this.supabase
        .from("jobs")
        .select(`
          *,
          source:job_sources(id, name, display_name)
        `)
        .eq("is_active", true)
        .like("job_url", "%swissdevjobs%")
        .limit(50);

      if (swissError) {
        console.error("Error fetching SwissDevJobs:", swissError);
      }

      // Get other recent jobs
      const result = await this.getJobs({
        pageSize: 150,
        sortBy: "created_at",
        sortOrder: "desc",
      });

      // Combine SwissDevJobs with other jobs (removing duplicates)
      const allJobs = [...(swissDevJobs || [])];
      const swissDevJobIds = new Set(allJobs.map(job => job.id));
      
      for (const job of result.data) {
        if (!swissDevJobIds.has(job.id)) {
          allJobs.push(job);
        }
      }

      // Filter for jobs that have enough information to apply
      return allJobs.filter(
        (job) => job.job_url && job.company && job.job_title && job.description
      );
    } catch (error) {
      console.error("Error getting jobs for application:", error);
      return [];
    }
  }

  // Get job statistics
  async getJobStats() {
    try {
      // Get total job count
      const { count: totalCount, error: totalError } = await this.supabase
        .from("jobs")
        .select("*", { count: "exact", head: true });

      if (totalError) {
        console.error("Error fetching total job count:", totalError);
      }

      // Get active job count
      const { count: activeCount, error: activeError } = await this.supabase
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      if (activeError) {
        console.error("Error fetching active job count:", activeError);
      }

      // Get inactive job count
      const { count: inactiveCount, error: inactiveError } = await this.supabase
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .eq("is_active", false);

      if (inactiveError) {
        console.error("Error fetching inactive job count:", inactiveError);
      }

      // Get jobs with applications count
      const { count: withApplicationsCount, error: appsError } =
        await this.supabase
          .from("applications")
          .select("job_id", { count: "exact", head: true });

      if (appsError) {
        console.error("Error fetching applications count:", appsError);
      }

      return {
        total: totalCount || 0,
        active: activeCount || 0,
        inactive: inactiveCount || 0,
        withApplications: withApplicationsCount || 0,
      };
    } catch (error) {
      console.error("Error in getJobStats:", error);
      return {
        total: 0,
        active: 0,
        inactive: 0,
        withApplications: 0,
      };
    }
  }

  // Bulk insert jobs with the new schema
  async bulkInsertJobs(
    jobs: Array<{
      job_title: string;
      company: string;
      location: string;
      job_url: string;
      salary?: string;
      description?: string;
      requirements?: string;
      technologies: string[];
      source: { name: string; display_name?: string; base_url?: string };
    }>
  ): Promise<{
    inserted: number;
    updated: number;
    skipped: number;
    errors: string[];
  }> {
    const results = {
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const job of jobs) {
      try {
        // Get or create source
        const sourceId = await this.getOrCreateJobSource(job.source.name);
        if (!sourceId) {
          results.errors.push(
            `Failed to get source for job ${job.job_title}: No source provided`
          );
          continue;
        }

        // Check if job already exists
        const { data: existingJob } = await this.supabase
          .from("jobs")
          .select("id")
          .eq("job_url", job.job_url)
          .single();

        if (existingJob) {
          // Update the existing job's updated_at timestamp and category if provided
          const updateData: any = {
            updated_at: new Date().toISOString(),
            is_active: true, // Mark as active since we just saw it
          };

          const { error: updateError } = await this.supabase
            .from("jobs")
            .update(updateData)
            .eq("id", existingJob.id);

          if (updateError) {
            results.errors.push(
              `Failed to update job ${job.job_title}: ${updateError.message}`
            );
          } else {
            results.updated++;
          }
          continue;
        }

        // Insert new job
        const result = await this.insertJob(
          {
            job_title: job.job_title,
            company: job.company,
            location: job.location,
            job_url: job.job_url,
            salary: job.salary,
            description: job.description,
            requirements: job.requirements,
            source_id: sourceId,
            is_active: true,
          },
          job.technologies
        );

        if (result.success) {
          results.inserted++;
        } else {
          results.errors.push(
            `Failed to insert ${job.job_title}: ${result.error}`
          );
        }
      } catch (error: any) {
        results.errors.push(
          `Error processing ${job.job_title}: ${error.message}`
        );
      }
    }

    return results;
  }

  // Insert a single job
  private async insertJob(
    job: Omit<Job, "id" | "created_at" | "updated_at">,
    technologies: string[]
  ): Promise<{ success: boolean; error?: string; jobId?: string }> {
    try {
      // Insert the job
      const { data: newJob, error: jobError } = await this.supabase
        .from("jobs")
        .insert(job)
        .select()
        .single();

      if (jobError || !newJob) {
        return {
          success: false,
          error: jobError?.message || "Failed to insert job",
        };
      }

      // Link technologies
      if (technologies.length > 0) {
        const techLinks = [];

        for (const techName of technologies) {
          const techId = await this.getOrCreateTechnology(techName);
          if (techId) {
            techLinks.push({
              job_id: newJob.id,
              technology_id: techId,
            });
          }
        }

        if (techLinks.length > 0) {
          const { error: linkError } = await this.supabase
            .from("job_technologies")
            .insert(techLinks);

          if (linkError) {
            console.error("Error linking technologies:", linkError);
          }
        }
      }

      return { success: true, jobId: newJob.id };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Delete a job
  async deleteJob(jobId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from("jobs")
        .delete()
        .eq("id", jobId);

      if (error) {
        console.error("Error deleting job:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error in deleteJob:", error);
      return false;
    }
  }

  // Update job (for backward compatibility)
  async updateJob(
    jobId: string,
    updates: Partial<JobApplication>
  ): Promise<boolean> {
    try {
      // Separate job fields from application fields
      const jobFields: any = {};
      const appFields: any = {};

      // Job fields
      if (updates.job_title) jobFields.job_title = updates.job_title;
      if (updates.company) jobFields.company = updates.company;
      if (updates.location) jobFields.location = updates.location;
      if (updates.salary) jobFields.salary = updates.salary;
      if (updates.description) jobFields.description = updates.description;
      if (updates.requirements) jobFields.requirements = updates.requirements;

      // Application fields
      if (updates.application_status)
        appFields.application_status = updates.application_status;
      if (updates.priority) appFields.priority = updates.priority;
      if (updates.applied_at) appFields.applied_at = updates.applied_at;
      if (updates.interview_date)
        appFields.interview_date = updates.interview_date;
      if (updates.notes) appFields.notes = updates.notes;

      // Update job if needed
      if (Object.keys(jobFields).length > 0) {
        const { error } = await this.supabase
          .from("jobs")
          .update(jobFields)
          .eq("id", jobId);

        if (error) {
          console.error("Error updating job:", error);
          return false;
        }
      }

      // Update or create application if needed
      if (Object.keys(appFields).length > 0) {
        return await this.updateApplicationStatus(
          jobId,
          appFields.application_status || "not_applied",
          appFields
        );
      }

      return true;
    } catch (error) {
      console.error("Error in updateJob:", error);
      return false;
    }
  }

  // Update application status
  async updateApplicationStatus(
    jobId: string,
    status: Application["application_status"],
    additionalData?: Partial<Application>
  ): Promise<boolean> {
    try {
      // Check if application exists
      const { data: existing } = await this.supabase
        .from("applications")
        .select("id")
        .eq("job_id", jobId)
        .single();

      if (existing) {
        // Update existing application
        const { error } = await this.supabase
          .from("applications")
          .update({
            application_status: status,
            ...additionalData,
            updated_at: new Date().toISOString(),
          })
          .eq("job_id", jobId);

        return !error;
      } else {
        // Create new application
        const { error } = await this.supabase.from("applications").insert({
          job_id: jobId,
          application_status: status,
          priority: additionalData?.priority || "medium",
          ...additionalData,
        });

        return !error;
      }
    } catch (error) {
      console.error("Error updating application status:", error);
      return false;
    }
  }

  // Mark jobs as inactive after scraping
  async markInactiveJobs(
    sourceId: string,
    activeJobUrls: string[]
  ): Promise<number> {
    try {
      if (activeJobUrls.length === 0) {
        console.log("No active job URLs provided, skipping inactive marking");
        return 0;
      }

      // Create a Set for faster lookup
      const activeUrlSet = new Set(activeJobUrls);

      // First, get all currently active jobs from this source
      const { data: currentActiveJobs, error: fetchError } = await this.supabase
        .from("jobs")
        .select("id, job_url")
        .eq("source_id", sourceId)
        .eq("is_active", true);

      if (fetchError) {
        console.error("Error fetching active jobs:", fetchError);
        return 0;
      }

      if (!currentActiveJobs || currentActiveJobs.length === 0) {
        return 0;
      }

      // Find jobs that should be marked as inactive
      const jobsToMarkInactive = currentActiveJobs.filter(
        job => !activeUrlSet.has(job.job_url)
      );

      if (jobsToMarkInactive.length === 0) {
        return 0;
      }

      // Batch update jobs in chunks to avoid any potential issues
      const chunkSize = 100;
      let totalMarked = 0;

      for (let i = 0; i < jobsToMarkInactive.length; i += chunkSize) {
        const chunk = jobsToMarkInactive.slice(i, i + chunkSize);
        const jobIds = chunk.map(job => job.id);

        const { error: updateError } = await this.supabase
          .from("jobs")
          .update({ is_active: false })
          .in("id", jobIds);

        if (updateError) {
          console.error("Error marking chunk as inactive:", updateError);
        } else {
          totalMarked += chunk.length;
        }
      }

      return totalMarked;
    } catch (error) {
      console.error("Error in markInactiveJobs:", error);
      return 0;
    }
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

      return data || [];
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
        .order("category")
        .order("name");

      if (error) {
        console.error("Error fetching technologies:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error in getTechnologies:", error);
      return [];
    }
  }

  // Get job by ID
  async getJob(jobId: string): Promise<JobApplication | null> {
    try {
      const { data, error } = await this.supabase
        .from("job_applications_view")
        .select("*")
        .eq("id", jobId)
        .single();

      if (error || !data) {
        return null;
      }

      // Fetch technologies
      const { data: jobTechs } = await this.supabase
        .from("job_technologies")
        .select(
          `
          technologies (
            id,
            name,
            category,
            job_roles
          )
        `
        )
        .eq("job_id", jobId);

      if (jobTechs) {
        data.technologies = jobTechs
          .map((jt: any) => jt.technologies)
          .filter(Boolean);
      }

      return data;
    } catch (error) {
      console.error("Error fetching job:", error);
      return null;
    }
  }

  // Job roles view methods
  async getJobRolesWeekly() {
    const { data, error } = await this.supabase
      .from("job_roles_weekly")
      .select("*")
      .order("week", { ascending: false })
      .order("job_count", { ascending: false });

    if (error) {
      console.error("Error fetching job roles weekly:", error);
      return [];
    }

    return data || [];
  }

  async getJobRolesCurrentWeek() {
    const { data, error } = await this.supabase
      .from("job_roles_current_week")
      .select("*")
      .order("job_count", { ascending: false });

    if (error) {
      console.error("Error fetching current week job roles:", error);
      return [];
    }

    return data || [];
  }

  async getJobRolesTrend() {
    const { data, error } = await this.supabase
      .from("job_roles_trend")
      .select("*")
      .order("technology", { ascending: true })
      .order("role", { ascending: true })
      .order("week", { ascending: false });

    if (error) {
      console.error("Error fetching job roles trend:", error);
      return [];
    }

    return data || [];
  }

  // Get jobs by source name
  async getJobsBySource(sourceName: string, limit: number = 10): Promise<Job[]> {
    try {
      // First get the source ID
      const sourceId = await this.getOrCreateJobSource(sourceName);
      if (!sourceId) {
        console.error(`Source not found: ${sourceName}`);
        return [];
      }

      // Get jobs from this source
      const { data: jobs, error } = await this.supabase
        .from("jobs")
        .select(`
          *,
          job_technologies (
            technologies (
              id,
              name,
              category
            )
          )
        `)
        .eq("source_id", sourceId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Error fetching jobs by source:", error);
        return [];
      }

      // Transform the data to include technologies
      return (jobs || []).map(job => ({
        ...job,
        technologies: job.job_technologies?.map((jt: any) => jt.technologies) || []
      }));
    } catch (error) {
      console.error("Error in getJobsBySource:", error);
      return [];
    }
  }

  // Helper method to determine job role from title and technologies
  private determineJobRole(title: string, technologies?: any[]): string {
    const titleLower = title.toLowerCase();
    
    // Check each role's keywords
    for (const [role, keywords] of Object.entries(JOB_ROLE_KEYWORDS)) {
      // Check title keywords
      if (keywords.titleKeywords.some(keyword => titleLower.includes(keyword))) {
        return this.formatRoleName(role);
      }
    }
    
    // If no match in title, check technologies
    if (technologies && technologies.length > 0) {
      const techNames = technologies.map(t => 
        (typeof t === 'string' ? t : t.name || '').toLowerCase()
      );
      
      for (const [role, keywords] of Object.entries(JOB_ROLE_KEYWORDS)) {
        const matchCount = keywords.techKeywords.filter(keyword => 
          techNames.some(tech => tech.includes(keyword.toLowerCase()))
        ).length;
        
        if (matchCount >= 2) { // At least 2 matching technologies
          return this.formatRoleName(role);
        }
      }
    }
    
    // Default categories based on common patterns
    if (titleLower.includes('developer') || titleLower.includes('engineer')) {
      return 'Software Developer';
    }
    if (titleLower.includes('architect')) {
      return 'Software Architect';
    }
    if (titleLower.includes('analyst')) {
      return 'Analyst';
    }
    if (titleLower.includes('consultant')) {
      return 'Consultant';
    }
    
    return 'Other';
  }
  
  // Format role name for display
  private formatRoleName(role: string): string {
    const roleNames: { [key: string]: string } = {
      'frontend_developer': 'Frontend Developer',
      'backend_developer': 'Backend Developer',
      'fullstack_developer': 'Full Stack Developer',
      'mobile_developer': 'Mobile Developer',
      'devops_engineer': 'DevOps Engineer',
      'data_scientist': 'Data Scientist/Engineer',
      'ai_engineer': 'AI/ML Engineer',
      'qa_engineer': 'QA Engineer',
      'designer': 'UI/UX Designer',
      'it_manager': 'IT Manager/Lead'
    };
    
    return roleNames[role] || role;
  }

  // Get active job counts by job role
  async getActiveJobCountsByRole(): Promise<{ [role: string]: number }> {
    try {
      // Get all active jobs with their titles and technologies
      const { data: activeJobs, error: jobsError } = await this.supabase
        .from("jobs")
        .select(`
          id,
          job_title,
          job_technologies (
            technologies (
              name
            )
          )
        `)
        .eq("is_active", true);

      if (jobsError) {
        console.error("Error fetching active jobs:", jobsError);
        return {};
      }

      // Count jobs by role
      const roleCounts: { [role: string]: number } = {};

      activeJobs?.forEach(job => {
        // Extract technologies array
        const technologies = job.job_technologies?.map((jt: any) => jt.technologies) || [];
        
        // Determine the job role
        const role = this.determineJobRole(job.job_title, technologies);
        
        // Increment count for this role
        roleCounts[role] = (roleCounts[role] || 0) + 1;
      });

      return roleCounts;
    } catch (error) {
      console.error("Error in getActiveJobCountsByRole:", error);
      return {};
    }
  }

  // Get active job counts by technology
  async getActiveJobCountsByTechnology(): Promise<{ [technology: string]: number }> {
    try {
      // Query to get technology usage counts for active jobs
      const { data, error } = await this.supabase
        .from("job_technologies")
        .select(`
          technologies!inner (
            name
          ),
          jobs!inner (
            is_active
          )
        `)
        .eq("jobs.is_active", true);

      if (error) {
        console.error("Error fetching technology counts:", error);
        return {};
      }

      // Count occurrences of each technology
      const techCounts: { [technology: string]: number } = {};

      data?.forEach((item: any) => {
        const techName = item.technologies?.name;
        if (techName) {
          techCounts[techName] = (techCounts[techName] || 0) + 1;
        }
      });

      return techCounts;
    } catch (error) {
      console.error("Error in getActiveJobCountsByTechnology:", error);
      return {};
    }
  }

  // Get job role trends by week
  async getJobRoleTrendsByWeek(weeksBack: number = 12): Promise<any> {
    try {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (weeksBack * 7));
      
      // Get all jobs created within the date range
      const { data: jobs, error } = await this.supabase
        .from("jobs")
        .select(`
          id,
          job_title,
          created_at,
          is_active,
          job_technologies (
            technologies (
              name
            )
          )
        `)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching jobs for trends:", error);
        return { weeks: [], roles: [] };
      }

      // Group jobs by week and role
      const weeklyData: { [weekKey: string]: { [role: string]: number } } = {};
      const allRoles = new Set<string>();

      jobs?.forEach(job => {
        // Get the week start date (Monday)
        const jobDate = new Date(job.created_at);
        const weekStart = new Date(jobDate);
        weekStart.setDate(jobDate.getDate() - jobDate.getDay() + 1); // Monday
        weekStart.setHours(0, 0, 0, 0);
        const weekKey = weekStart.toISOString().split('T')[0];

        // Determine job role
        const technologies = job.job_technologies?.map((jt: any) => jt.technologies) || [];
        const role = this.determineJobRole(job.job_title, technologies);
        allRoles.add(role);

        // Initialize week data if needed
        if (!weeklyData[weekKey]) {
          weeklyData[weekKey] = {};
        }

        // Count the job for this role in this week
        weeklyData[weekKey][role] = (weeklyData[weekKey][role] || 0) + 1;
      });

      // Convert to array format for easier consumption
      const weeks = Object.keys(weeklyData).sort();
      const rolesList = Array.from(allRoles).sort();
      
      // Build the trend data
      const trendsData = weeks.map(week => {
        const weekData: any = {
          week,
          weekDisplay: this.formatWeekDisplay(week),
          total: 0,
          roles: {}
        };

        rolesList.forEach(role => {
          const count = weeklyData[week][role] || 0;
          weekData.roles[role] = count;
          weekData.total += count;
        });

        return weekData;
      });

      // Calculate totals and changes for each role
      const roleSummary = rolesList.map(role => {
        const counts = weeks.map(week => weeklyData[week][role] || 0);
        const total = counts.reduce((sum, count) => sum + count, 0);
        const lastWeek = counts[counts.length - 1] || 0;
        const previousWeek = counts[counts.length - 2] || 0;
        const change = previousWeek > 0 ? ((lastWeek - previousWeek) / previousWeek * 100).toFixed(1) : 
                       lastWeek > 0 ? 100 : 0;

        return {
          role,
          total,
          lastWeek,
          change: parseFloat(change as string),
          trend: counts
        };
      }).sort((a, b) => b.total - a.total);

      return {
        weeks,
        roles: rolesList,
        data: trendsData,
        summary: roleSummary,
        period: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0],
          weeksIncluded: weeks.length
        }
      };
    } catch (error) {
      console.error("Error in getJobRoleTrendsByWeek:", error);
      return { weeks: [], roles: [], data: [], summary: [] };
    }
  }

  // Format week display
  private formatWeekDisplay(weekStart: string): string {
    const date = new Date(weekStart);
    const endDate = new Date(date);
    endDate.setDate(date.getDate() + 6);
    
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${date.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}`;
  }
}

export default SupabaseService;
