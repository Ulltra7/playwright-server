import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { JobRole, TechnologyJobRole, JobRoleScore, JobWithRole } from "../types/database";
import * as dotenv from "dotenv";

dotenv.config();

export class JobRoleService {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase environment variables");
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Get all job roles
   */
  async getAllJobRoles(): Promise<JobRole[]> {
    try {
      const { data, error } = await this.supabase
        .from("job_roles")
        .select("*")
        .order("display_name");

      if (error) {
        console.error("Error fetching job roles:", error);
        return [];
      }

      return data as JobRole[];
    } catch (error) {
      console.error("Error in getAllJobRoles:", error);
      return [];
    }
  }

  /**
   * Get job role by name
   */
  async getJobRoleByName(name: string): Promise<JobRole | null> {
    try {
      const { data, error } = await this.supabase
        .from("job_roles")
        .select("*")
        .eq("name", name)
        .single();

      if (error) {
        console.error("Error fetching job role:", error);
        return null;
      }

      return data as JobRole;
    } catch (error) {
      console.error("Error in getJobRoleByName:", error);
      return null;
    }
  }

  /**
   * Link technology to job roles
   */
  async linkTechnologyToRoles(
    technologyId: string,
    roleAssignments: Array<{ roleId: string; relevanceScore?: number }>
  ): Promise<boolean> {
    try {
      const inserts = roleAssignments.map(({ roleId, relevanceScore = 100 }) => ({
        technology_id: technologyId,
        job_role_id: roleId,
        relevance_score: relevanceScore,
      }));

      const { error } = await this.supabase
        .from("technology_job_roles")
        .upsert(inserts, { onConflict: "technology_id,job_role_id" });

      if (error) {
        console.error("Error linking technology to roles:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error in linkTechnologyToRoles:", error);
      return false;
    }
  }

  /**
   * Calculate job role scores for a specific job
   */
  async calculateJobRoleScores(jobId: string): Promise<JobRoleScore[]> {
    try {
      const { data, error } = await this.supabase
        .rpc("calculate_job_role_scores", { job_id: jobId });

      if (error) {
        console.error("Error calculating job role scores:", error);
        return [];
      }

      return data as JobRoleScore[];
    } catch (error) {
      console.error("Error in calculateJobRoleScores:", error);
      return [];
    }
  }

  /**
   * Get jobs by role with minimum score threshold
   */
  async getJobsByRole(roleName: string, minScore: number = 50): Promise<JobWithRole[]> {
    try {
      const { data, error } = await this.supabase
        .rpc("get_jobs_by_role", { 
          role_name: roleName,
          min_score: minScore 
        });

      if (error) {
        console.error("Error fetching jobs by role:", error);
        return [];
      }

      return data as JobWithRole[];
    } catch (error) {
      console.error("Error in getJobsByRole:", error);
      return [];
    }
  }

  /**
   * Get primary role for a job
   */
  async getJobPrimaryRole(jobId: string): Promise<JobRoleScore | null> {
    try {
      const scores = await this.calculateJobRoleScores(jobId);
      return scores.length > 0 ? scores[0] : null;
    } catch (error) {
      console.error("Error in getJobPrimaryRole:", error);
      return null;
    }
  }

  /**
   * Determine job roles for a technology name
   */
  determineRolesForTechnology(technologyName: string): Array<{ roleName: string; relevanceScore: number }> {
    const lowerName = technologyName.toLowerCase();
    const roles: Array<{ roleName: string; relevanceScore: number }> = [];

    const roleMapping = {
      frontend_developer: {
        keywords: ['react', 'angular', 'vue', 'svelte', 'css', 'sass', 'html', 'bootstrap', 'tailwind', 'jquery', 'webpack', 'next.js'],
        score: 100
      },
      backend_developer: {
        keywords: ['node.js', 'express', 'django', 'flask', 'laravel', 'spring', '.net', 'rails', 'php', 'java', 'c#', 'python', 'ruby'],
        score: 100
      },
      fullstack_developer: {
        keywords: ['javascript', 'typescript'], // These are used in both frontend and backend
        score: 90
      },
      mobile_developer: {
        keywords: ['react native', 'flutter', 'swift', 'kotlin', 'ios', 'android', 'xamarin'],
        score: 100
      },
      devops_engineer: {
        keywords: ['docker', 'kubernetes', 'jenkins', 'terraform', 'ansible', 'helm', 'gitlab', 'circleci'],
        score: 100
      },
      cloud_architect: {
        keywords: ['aws', 'azure', 'google cloud', 'gcp', 'cloudformation', 'serverless'],
        score: 100
      },
      data_scientist: {
        keywords: ['tensorflow', 'pytorch', 'scikit-learn', 'pandas', 'numpy', 'jupyter', 'matplotlib'],
        score: 100
      },
      data_engineer: {
        keywords: ['spark', 'airflow', 'kafka', 'hadoop', 'databricks', 'snowflake'],
        score: 100
      },
      ai_ml_engineer: {
        keywords: ['machine learning', 'deep learning', 'neural network', 'nlp', 'computer vision'],
        score: 100
      },
      qa_engineer: {
        keywords: ['jest', 'cypress', 'selenium', 'playwright', 'junit', 'testng', 'postman'],
        score: 100
      },
      security_engineer: {
        keywords: ['owasp', 'burp suite', 'metasploit', 'nessus', 'security', 'penetration'],
        score: 100
      },
      ux_ui_designer: {
        keywords: ['figma', 'sketch', 'adobe xd', 'photoshop', 'invision', 'zeplin'],
        score: 100
      },
      database_administrator: {
        keywords: ['postgresql', 'mysql', 'oracle', 'sql server', 'mongodb', 'redis'],
        score: 90
      }
    };

    // Check each role's keywords
    for (const [roleName, config] of Object.entries(roleMapping)) {
      const matches = config.keywords.some(keyword => 
        lowerName.includes(keyword) || keyword.includes(lowerName)
      );
      
      if (matches) {
        roles.push({ roleName, relevanceScore: config.score });
      }
    }

    // Special handling for languages that are used across multiple roles
    if (['python', 'javascript', 'typescript'].some(lang => lowerName.includes(lang))) {
      // Python is used in backend, data science, and AI
      if (lowerName.includes('python')) {
        if (!roles.find(r => r.roleName === 'backend_developer')) {
          roles.push({ roleName: 'backend_developer', relevanceScore: 90 });
        }
        if (!roles.find(r => r.roleName === 'data_scientist')) {
          roles.push({ roleName: 'data_scientist', relevanceScore: 80 });
        }
      }
      
      // JavaScript/TypeScript are used in frontend, backend, and mobile
      if (lowerName.includes('javascript') || lowerName.includes('typescript')) {
        if (!roles.find(r => r.roleName === 'frontend_developer')) {
          roles.push({ roleName: 'frontend_developer', relevanceScore: 90 });
        }
        if (!roles.find(r => r.roleName === 'backend_developer')) {
          roles.push({ roleName: 'backend_developer', relevanceScore: 80 });
        }
        if (!roles.find(r => r.roleName === 'fullstack_developer')) {
          roles.push({ roleName: 'fullstack_developer', relevanceScore: 100 });
        }
      }
    }

    // Generic tools get lower scores
    if (['git', 'github', 'gitlab', 'agile', 'scrum'].some(tool => lowerName.includes(tool))) {
      const genericRoles = ['frontend_developer', 'backend_developer', 'mobile_developer', 'devops_engineer'];
      for (const roleName of genericRoles) {
        if (!roles.find(r => r.roleName === roleName)) {
          roles.push({ roleName, relevanceScore: 60 });
        }
      }
    }

    return roles;
  }
}