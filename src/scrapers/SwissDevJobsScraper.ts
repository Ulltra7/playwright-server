import { JobScraper } from "../services/JobScraper";
import { JOB_SITES } from "../constants/urls";
import { JobListing, ScraperResult } from "../types/job";

export class SwissDevJobsScraper extends JobScraper {
  async scrapeJobs(): Promise<ScraperResult> {
    try {
      console.log("🔍 Starting Swiss Dev Jobs scraper...");

      await this.initBrowser();
      await this.navigateToUrl(JOB_SITES.SWISS_DEV_JOBS.ALL_JOBS);

      console.log("📋 Page loaded successfully. Waiting for initial content...");
      
      // Wait for job cards to load initially
      if (this.page) {
        await this.page.waitForSelector(".card", { timeout: 10000 });
        console.log("✅ Initial job cards loaded");
      }

      // Analyze page structure with job-specific selectors
      const pageAnalysis = await this.analyzeJobPageStructure();
      console.log("🔍 Page analysis:", JSON.stringify(pageAnalysis, null, 2));

      // Analyze semantic structure for better data extraction
      const semanticAnalysis = await this.analyzeJobSemanticStructure();
      console.log(
        "🏷️ Semantic analysis:",
        JSON.stringify(semanticAnalysis, null, 2)
      );

      // Get page info
      const { title, url } = await this.getPageInfo();

      // Try to extract job listings
      const jobs: JobListing[] = await this.extractJobListings();

      await this.closeBrowser();

      return {
        url,
        title,
        jobs,
        totalJobs: jobs.length,
        pageAnalysis,
        note: "Job scraping and application logic will be implemented here",
      };
    } catch (error) {
      await this.closeBrowser();
      throw error;
    }
  }

  private async extractJobListings(): Promise<JobListing[]> {
    if (!this.page) {
      throw new Error("Browser not initialized. Call initBrowser() first.");
    }

    try {
      // First, scroll down to load all jobs with infinite scroll
      console.log("📜 Starting infinite scroll to load all jobs...");
      await this.scrollToLoadAllJobs();

      // Now get all job cards after scrolling
      const jobElements = await this.page.$$(".card");
      const jobs: JobListing[] = [];

      console.log(`📋 Found ${jobElements.length} job cards to extract after scrolling`);

      for (let i = 0; i < jobElements.length; i++) {
        try {
          const element = jobElements[i];

          // Debug the first 3 job cards to understand structure
          if (i < 3) {
            await this.debugJobCard(element, i);
          }

          // Extract job title (usually the first link or heading)
          const titleElement = await element.$(
            'a[href*="job"], h1, h2, h3, h4, h5, h6, .job-title, [class*="title"]'
          );
          const title = titleElement
            ? (await titleElement.textContent())?.trim() || ""
            : "";

          // Extract company and location using semantic attributes first
          let company = await this.extractCompanyBySemantic(element);
          let location = await this.extractLocationBySemantic(element);

          // 4. Fallback to parsing combined company+location links (original approach)
          if (!company) {
            // Get all links in the job card
            const allLinks = await element.$$("a");

            // Look for the link that contains company + address (not the job title link or tech links)
            for (const link of allLinks) {
              const linkText = (await link.textContent())?.trim() || "";
              const linkHref = (await link.getAttribute("href")) || "";

              // Skip job title links, tech category links, and other non-company links
              if (
                linkHref.includes("/jobs/") &&
                !linkHref.includes("/jobs/TypeScript") &&
                !linkHref.includes("/jobs/JavaScript") &&
                !linkHref.includes("/jobs/Frontend") &&
                !linkHref.includes("/jobs/Angular") &&
                !linkHref.includes("/jobs/Backend") &&
                !linkHref.includes("/jobs/API") &&
                !linkHref.includes("/jobs/Cloud") &&
                !linkHref.includes("/jobs/Azure") &&
                !linkHref.includes("/jobs/C#") &&
                !linkHref.includes("/jobs/CI/CD") &&
                !linkHref.includes("/jobs/Cypress") &&
                !linkHref.includes("/jobs/ROS") &&
                linkText.length > 10 && // Company + address should be longer
                (linkText.includes("AG") ||
                  linkText.includes("GmbH") ||
                  linkText.includes("SA") ||
                  linkText.includes("strasse") ||
                  linkText.includes("gasse") ||
                  linkText.includes(","))
              ) {
                console.log(`🔍 Found company link: "${linkText}"`);

                // Parse company and location from combined text
                const companyPatterns = [
                  /^(.+?\s(?:AG|GmbH|SA|Ltd|Inc|Corp|LLC|AB|Oy))\s*(.+)$/i,
                  /^(.+?)\s+([A-Z][a-z]+(?:strasse|gasse|weg|platz|ring)\s*\d+.*)$/i,
                ];

                let extracted = false;
                for (const pattern of companyPatterns) {
                  const match = linkText.match(pattern);
                  if (match) {
                    company = match[1].trim();
                    location = match[2].trim();
                    extracted = true;
                    console.log(
                      `✅ Parsed: Company="${company}", Location="${location}"`
                    );
                    break;
                  }
                }

                if (extracted) break;
              }
            }
          }

          // If we couldn't extract company from the combined field, try other selectors
          if (!company) {
            const fallbackSelectors = [
              ".company-name",
              '[class*="company"]',
              ".employer",
              '[class*="employer"]',
              "h4",
              ".text-muted",
              "small",
            ];

            for (const selector of fallbackSelectors) {
              const companyElement = await element.$(selector);
              if (companyElement) {
                const companyText =
                  (await companyElement.textContent())?.trim() || "";
                if (
                  companyText &&
                  !companyText.includes("CHF") &&
                  !companyText.includes("€") &&
                  !companyText.includes("$")
                ) {
                  company = companyText;
                  break;
                }
              }
            }
          }

          // Extract job URL
          const linkElement = await element.$('a[href*="job"]');
          const jobUrl = linkElement
            ? (await linkElement.getAttribute("href")) || ""
            : "";

          // Extract salary if available
          const salaryElement = await element.$(
            '[class*="salary"], [class*="wage"], [class*="chf"], [class*="€"], [class*="$"]'
          );
          const salary = salaryElement
            ? (await salaryElement.textContent())?.trim() || ""
            : "";

          // Extract technology badges
          const technologies: string[] = [];
          const techBadgesContainer = await element.$(
            ".job-teaser-technology-badges"
          );
          if (techBadgesContainer) {
            const techBadges = await techBadgesContainer.$$(
              ".technology-badge, .badge"
            );
            for (const badge of techBadges) {
              const techText = (await badge.textContent())?.trim();
              if (techText && techText.length > 0) {
                technologies.push(techText);
              }
            }
          }

          // Only add jobs with at least a title
          if (title && title.length > 0) {
            const job: JobListing = {
              title,
              company: company || "Unknown Company",
              location: location || "Location not specified",
              technologies,
              url: jobUrl.startsWith("http")
                ? jobUrl
                : `https://swissdevjobs.ch${jobUrl}`,
              salary: salary || undefined,
              scraped_at: new Date(),
            };

            jobs.push(job);
            console.log(
              `✅ Extracted job ${
                i + 1
              }: ${title} at ${company} | Tech: ${technologies.join(", ")}`
            );
          }
        } catch (error) {
          console.log(`⚠️ Error extracting job ${i + 1}:`, error);
          continue;
        }
      }

      console.log(`📊 Successfully extracted ${jobs.length} jobs`);
      return jobs;
    } catch (error) {
      console.error("❌ Error in extractJobListings:", error);
      return [];
    }
  }

  private async scrollToLoadAllJobs(): Promise<void> {
    if (!this.page) {
      throw new Error("Browser not initialized");
    }

    try {
      let previousJobCount = 0;
      let currentJobCount = 0;
      let scrollAttempts = 0;
      const maxScrollAttempts = 50; // Prevent infinite loops
      const scrollDelay = 1000; // Wait 1 second between scrolls

      console.log("🔄 Starting infinite scroll to load all jobs...");

      while (scrollAttempts < maxScrollAttempts) {
        // Count current job cards
        const jobCards = await this.page.$$(".card");
        currentJobCount = jobCards.length;

        console.log(`📊 Scroll attempt ${scrollAttempts + 1}: Found ${currentJobCount} job cards`);

        // If no new jobs were loaded in the last scroll, we might be done
        if (currentJobCount === previousJobCount && scrollAttempts > 2) {
          // Double-check by trying to scroll more and waiting longer
          await this.page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
          });
          await this.page.waitForTimeout(2000); // Wait 2 seconds
          
          const finalJobCards = await this.page.$$(".card");
          if (finalJobCards.length === currentJobCount) {
            console.log(`✅ Infinite scroll complete. No new jobs loaded after extra wait.`);
            break;
          }
          currentJobCount = finalJobCards.length;
        }

        // Scroll to bottom of page
        await this.page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });

        // Wait for new content to load
        await this.page.waitForTimeout(scrollDelay);

        // Look for loading indicators or "Load More" buttons
        try {
          // Check for loading spinner or "Load More" button
          const loadMoreButton = await this.page.$('button:has-text("Load More"), button:has-text("Show More"), .load-more, [class*="load-more"]');
          if (loadMoreButton) {
            console.log("🔘 Found 'Load More' button, clicking it...");
            await loadMoreButton.click();
            await this.page.waitForTimeout(2000); // Wait for new content
          }

          // Check for loading indicator
          const loadingIndicator = await this.page.$('.loading, [class*="loading"], .spinner, [class*="spinner"]');
          if (loadingIndicator) {
            console.log("⏳ Waiting for loading to complete...");
            await this.page.waitForSelector('.loading, [class*="loading"], .spinner, [class*="spinner"]', { 
              state: 'detached',
              timeout: 10000 
            });
          }
        } catch (error) {
          // No loading indicators found, continue with normal scroll
        }

        previousJobCount = currentJobCount;
        scrollAttempts++;

        // Extra check: if we've loaded a lot of jobs, maybe we're done
        if (currentJobCount >= 300) {
          console.log(`🎯 Loaded ${currentJobCount} jobs, that seems like all of them. Stopping scroll.`);
          break;
        }
      }

      console.log(`🏁 Infinite scroll completed after ${scrollAttempts} attempts. Total jobs loaded: ${currentJobCount}`);

      // Final scroll to top to ensure all elements are properly rendered
      await this.page.evaluate(() => {
        window.scrollTo(0, 0);
      });
      await this.page.waitForTimeout(1000);

    } catch (error) {
      console.error("❌ Error during infinite scroll:", error);
      // Continue anyway with whatever jobs we have loaded
    }
  }

  // ...existing code...
}
