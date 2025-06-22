/**
 * Type for job data that comes from scrapers
 * This is what scrapers should return
 */
export interface JobInput {
  job_title: string;
  company: string;
  location: string;
  job_url: string;
  salary?: string;
  description?: string;
  requirements?: string;
  technologies: string[];
  source: {
    name: string;
    display_name?: string;
    base_url?: string;
  };
}