import { BaseScraper } from "./BaseScraper";

export abstract class JobScraper extends BaseScraper {
  // Job-specific selectors for page analysis
  protected getJobSelectors(): string[] {
    return [
      ".job",
      ".job-item",
      ".job-listing",
      ".job-card",
      '[class*="job"]',
      '[data-testid*="job"]',
      ".position",
      ".vacancy",
      ".opening",
      'a[href*="job"]',
      'a[href*="position"]',
    ];
  }

  // Job-specific data attributes to look for
  protected getJobDataAttributes(): string[] {
    return [
      "data-company",
      "data-organization",
      "data-employer",
      "data-hiring-organization",
      "data-job-id",
      "data-position",
      "data-location",
      "data-salary",
    ];
  }

  // Analyze page structure with job-specific selectors
  protected async analyzeJobPageStructure(): Promise<any> {
    const jobSelectors = this.getJobSelectors();
    const analysis = await this.analyzePageStructure(jobSelectors);

    // Add job-specific link analysis
    const jobRelatedLinks = analysis.allLinks.filter(
      (link: any) =>
        link.href.includes("job") ||
        link.text?.toLowerCase().includes("job") ||
        link.text?.toLowerCase().includes("position") ||
        link.text?.toLowerCase().includes("career")
    );

    return {
      ...analysis,
      jobRelatedLinks,
      jobSpecificSelectors: jobSelectors,
    };
  }

  // Analyze semantic structure with job-specific attributes
  protected async analyzeJobSemanticStructure(): Promise<any> {
    const jobDataAttributes = this.getJobDataAttributes();
    return await this.analyzeSemanticStructure(jobDataAttributes);
  }

  // Helper method to extract company information using semantic attributes
  protected async extractCompanyBySemantic(element: any): Promise<string> {
    // Try semantic attributes first (most reliable)
    const companyByLabel = await element.$(
      '[label*="hiring"], [label*="organization"], [label*="company"], [label*="employer"]'
    );
    if (companyByLabel) {
      const company = (await companyByLabel.textContent())?.trim() || "";
      if (company) {
        console.log(`🏷️ Found company by label: "${company}"`);
        return company;
      }
    }

    // Try data attributes
    const companyByData = await element.$(
      "[data-company], [data-organization], [data-employer], [data-hiring-organization]"
    );
    if (companyByData) {
      const company = (await companyByData.textContent())?.trim() || "";
      if (company) {
        console.log(`📊 Found company by data attribute: "${company}"`);
        return company;
      }
    }

    // Try microdata/schema.org attributes
    const companyByMicrodata = await element.$(
      '[itemprop="hiringOrganization"], [itemprop="company"], [itemprop="organization"]'
    );
    if (companyByMicrodata) {
      const company = (await companyByMicrodata.textContent())?.trim() || "";
      if (company) {
        console.log(`🔗 Found company by microdata: "${company}"`);
        return company;
      }
    }

    return "";
  }

  // Helper method to extract location using semantic attributes
  protected async extractLocationBySemantic(element: any): Promise<string> {
    const locationByData = await element.$("[data-location], [data-address]");
    if (locationByData) {
      const location = (await locationByData.textContent())?.trim() || "";
      if (location) {
        console.log(`📍 Found location by data attribute: "${location}"`);
        return location;
      }
    }

    const locationByMicrodata = await element.$(
      '[itemprop="jobLocation"], [itemprop="location"], [itemprop="address"]'
    );
    if (locationByMicrodata) {
      const location = (await locationByMicrodata.textContent())?.trim() || "";
      if (location) {
        console.log(`🔗 Found location by microdata: "${location}"`);
        return location;
      }
    }

    return "";
  }

  // Abstract method for job scraping - subclasses implement specific job site logic
  abstract scrapeJobs(): Promise<any>;

  // Implement the base scraper's abstract method
  async scrape(): Promise<any> {
    return await this.scrapeJobs();
  }
}
