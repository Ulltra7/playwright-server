import { BaseScraper } from "./BaseScraper";
import { JOB_SITES } from "../constants/urls";
import { JobInput } from "../types/jobInput";

interface ArbeitnowJobData {
  slug: string;
  company_name: string;
  title: string;
  description: string;
  remote: boolean;
  url: string;
  tags: string[];
  job_types: string[];
  location: string;
  created_at: number;
}

interface ArbeitnowApiResponse {
  data: ArbeitnowJobData[];
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    from: number;
    last_page: number;
    path: string;
    per_page: number;
    to: number;
    total: number;
  };
}

export class ArbeitnowScraper extends BaseScraper {
  private apiUrl: string;

  constructor() {
    super();
    this.apiUrl = JOB_SITES.ARBEITNOW.API_URL;
  }

  async scrape(): Promise<{
    jobs: JobInput[];
    totalFetched: number;
  }> {
    try {
      console.log(`🔍 Starting Arbeitnow API scraping...`);

      const allJobs: JobInput[] = [];

      let currentPage = 1;
      let hasMorePages = true;
      let totalFetched = 0;

      while (hasMorePages) {
        console.log(`📄 Fetching page ${currentPage}...`);

        const response = await this.fetchJobsFromApi(currentPage);

        if (!response || !response.data || response.data.length === 0) {
          console.log(`ℹ️ No more jobs found on page ${currentPage}`);
          break;
        }

        const processedJobs = this.processJobs(response.data);
        allJobs.push(...processedJobs);
        totalFetched += response.data.length;

        console.log(
          `✅ Processed ${processedJobs.length} jobs from page ${currentPage}`
        );

        // Check if there are more pages
        hasMorePages = currentPage < response.meta.last_page;
        currentPage++;

        // Add delay between requests to be respectful to the API
        if (hasMorePages) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      console.log(
        `🎉 Arbeitnow scraping completed! Found ${allJobs.length} jobs across ${
          currentPage - 1
        } pages`
      );

      return {
        jobs: allJobs,
        totalFetched,
      };
    } catch (error) {
      console.error("❌ Error during Arbeitnow scraping:", error);
      throw error;
    }
  }

  private async fetchJobsFromApi(
    page: number = 1
  ): Promise<ArbeitnowApiResponse | null> {
    try {
      const url = `${this.apiUrl}?page=${page}`;
      console.log(`🌐 Fetching: ${url}`);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0 (compatible; JobScraper/1.0)",
        },
      });

      if (!response.ok) {
        console.error(`❌ API request failed with status: ${response.status}`);
        return null;
      }

      const data: ArbeitnowApiResponse = await response.json();
      console.log(
        `📊 API returned ${data.data.length} jobs (page ${data.meta.current_page} of ${data.meta.last_page})`
      );

      return data;
    } catch (error) {
      console.error("❌ Error fetching from Arbeitnow API:", error);
      return null;
    }
  }

  private processJobs(jobsData: ArbeitnowJobData[]): JobInput[] {
    return jobsData.map((jobData) => {
      // Extract technologies from tags
      const technologies = this.extractTechnologies(
        jobData.tags,
        jobData.description
      );

      // Process location
      const location = this.processLocation(jobData.location, jobData.remote);

      // Create job object
      return {
        job_title: jobData.title,
        company: jobData.company_name,
        location,
        job_url: jobData.url,
        salary: undefined, // Arbeitnow doesn't provide salary info
        description: jobData.description,
        requirements: this.extractRequirements(jobData.description),
        technologies,
        source: {
          name: "arbeitnow",
          display_name: JOB_SITES.ARBEITNOW.NAME,
          base_url: JOB_SITES.ARBEITNOW.BASE_URL,
        },
      };
    });
  }

  private extractTechnologies(tags: string[], description: string): string[] {
    const technologies = new Set<string>();

    // Add tags as technologies (they often contain tech stack info)
    tags.forEach((tag) => {
      if (tag && tag.trim().length > 0) {
        technologies.add(tag.trim());
      }
    });

    // Extract additional technologies from description
    const techKeywords = [
      "JavaScript",
      "TypeScript",
      "React",
      "Vue.js",
      "Angular",
      "Node.js",
      "Python",
      "Java",
      "C#",
      "PHP",
      "Go",
      "Rust",
      "Kotlin",
      "Swift",
      "PostgreSQL",
      "MySQL",
      "MongoDB",
      "Redis",
      "AWS",
      "Azure",
      "Docker",
      "Kubernetes",
      "Git",
      "GraphQL",
      "REST API",
      "Microservices",
      "Express.js",
      "Django",
      "Laravel",
      "Spring Boot",
      ".NET",
    ];

    const descriptionLower = description.toLowerCase();
    techKeywords.forEach((keyword) => {
      if (descriptionLower.includes(keyword.toLowerCase())) {
        technologies.add(keyword);
      }
    });

    return Array.from(technologies);
  }

  private processLocation(location: string, isRemote: boolean): string {
    if (isRemote) {
      return location ? `${location} (Remote)` : "Remote";
    }
    return location || "Not specified";
  }

  private extractRequirements(description: string): string {
    // Try to extract requirements section from description
    const requirementsSections = [
      "requirements:",
      "required:",
      "qualifications:",
      "skills:",
      "you should have:",
      "what we need:",
      "must have:",
    ];

    const descriptionLower = description.toLowerCase();

    for (const section of requirementsSections) {
      const index = descriptionLower.indexOf(section);
      if (index !== -1) {
        // Extract text after the requirements section header
        const afterRequirements = description.substring(index);
        // Try to get the next 500 characters or until next major section
        const nextSectionIndex = afterRequirements.search(
          /\n\n|\r\n\r\n|responsibilities:|benefits:|about/i
        );

        if (nextSectionIndex > 0) {
          return afterRequirements.substring(0, nextSectionIndex).trim();
        } else {
          return afterRequirements.substring(0, 500).trim();
        }
      }
    }

    // If no specific requirements section found, return first 300 chars of description
    return (
      description.substring(0, 300).trim() +
      (description.length > 300 ? "..." : "")
    );
  }

  // Override the scrape method to not require browser initialization since we're using fetch API
  async scrapeWithoutBrowser(): Promise<{
    jobs: JobInput[];
    totalFetched: number;
  }> {
    // Call scrape directly since we don't need browser for API calls
    return this.scrape();
  }
}
