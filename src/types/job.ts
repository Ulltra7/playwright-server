export interface JobListing {
  id?: string;
  title: string;
  company: string;
  location: string;
  description?: string;
  requirements?: string[];
  salary?: string;
  url: string;
  postedDate?: Date;
  scraped_at: Date;
}

export interface ScraperResponse<T = any> {
  status: "success" | "error";
  message: string;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface ScraperResult {
  url: string;
  title: string;
  jobs?: JobListing[];
  totalJobs?: number;
  note?: string;
}
