// Database types for the normalized job roles structure

export interface JobRole {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  created_at: Date;
}

export interface TechnologyJobRole {
  id: string;
  technology_id: string;
  job_role_id: string;
  relevance_score: number;
  created_at: Date;
}

export interface JobRoleScore {
  job_role_id: string;
  job_role_name: string;
  job_role_display_name: string;
  total_score: number;
  technology_count: number;
}

export interface JobWithRole {
  id: string;
  job_title: string;
  company: string;
  location: string;
  job_url: string;
  scraped_at: Date;
  job_role_id?: string;
  job_role_name?: string;
  job_role_display_name?: string;
  role_score?: number;
  matching_technologies?: string[];
}