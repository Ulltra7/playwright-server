import { JobScraper } from "./JobScraper";
import { JOB_SITES } from "../constants/urls";
import { JobInput } from "../types/jobInput";

export class SwissDevJobsScraper extends JobScraper {
  async scrapeJobs(): Promise<{
    jobs: JobInput[];
    totalFetched: number;
  }> {
    try {
      console.log("🔍 Starting Swiss Dev Jobs scraper...");

      await this.initBrowser();
      await this.navigateToUrl(JOB_SITES.SWISS_DEV_JOBS.ALL_JOBS);

      console.log(
        "📋 Page loaded successfully. Waiting for initial content..."
      );

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
      const jobs: JobInput[] = await this.extractJobListings();

      await this.closeBrowser();

      return {
        jobs,
        totalFetched: jobs.length,
      };
    } catch (error) {
      await this.closeBrowser();
      throw error;
    }
  }

  private async extractJobListings(): Promise<JobInput[]> {
    if (!this.page) {
      throw new Error("Browser not initialized. Call initBrowser() first.");
    }

    try {
      console.log("📜 Starting incremental scroll to collect all jobs...");

      // Use our improved scrolling method that collects jobs as it goes
      const allCollectedJobs = await this.scrollAndCollectAllJobs();

      console.log(
        `📊 Successfully collected ${allCollectedJobs.length} total jobs through incremental scrolling`
      );
      return allCollectedJobs;
    } catch (error) {
      console.error("❌ Error in extractJobListings:", error);
      return [];
    }
  }

  async scrollAndCollectAllJobs(): Promise<JobInput[]> {
    if (!this.page) {
      throw new Error("Browser not initialized");
    }

    const allJobs: JobInput[] = [];
    const jobsMap = new Map<string, JobInput>(); // Use Map to avoid duplicates
    let scrollAttempts = 0;
    const maxScrollAttempts = 100;
    const scrollDelay = 800;

    try {
      console.log(
        "🔄 Starting comprehensive job collection with incremental scroll..."
      );

      // Get container info
      const containerInfo = await this.page.evaluate(() => {
        const scrollableContainers = Array.from(
          document.querySelectorAll("div")
        ).filter((div) => {
          const style = window.getComputedStyle(div);
          return (
            style.overflow === "auto" &&
            style.position === "relative" &&
            (style.willChange === "transform" ||
              div.style.willChange === "transform")
          );
        });

        if (scrollableContainers.length > 0) {
          const container = scrollableContainers[0];
          return {
            found: true,
            scrollHeight: container.scrollHeight,
            clientHeight: container.clientHeight,
            maxScroll: container.scrollHeight - container.clientHeight,
          };
        }
        return {
          found: false,
          scrollHeight: 0,
          clientHeight: 0,
          maxScroll: 0,
        };
      });

      if (!containerInfo.found || containerInfo.maxScroll <= 0) {
        console.log(
          "❌ No virtualized container found, falling back to current page jobs"
        );
        const currentJobs = await this.page.$$(".card");
        return this.extractJobsFromElements(currentJobs);
      }

      const scrollIncrement = Math.max(containerInfo.clientHeight / 3, 100);
      console.log(
        `📐 Container: ${containerInfo.scrollHeight}px height, will scroll in ${scrollIncrement}px increments`
      );

      // Scroll through the entire list incrementally
      for (
        let position = 0;
        position <= containerInfo.maxScroll;
        position += scrollIncrement
      ) {
        scrollAttempts++;

        console.log(
          `📜 Scroll ${scrollAttempts}: position ${position}/${containerInfo.maxScroll}`
        );

        // Scroll to position
        await this.page.evaluate((targetPosition) => {
          const container = Array.from(document.querySelectorAll("div")).find(
            (div) => {
              const style = window.getComputedStyle(div);
              return style.overflow === "auto" && style.position === "relative";
            }
          );

          if (container) {
            container.scrollTop = targetPosition;
            container.dispatchEvent(new Event("scroll", { bubbles: true }));
          }
        }, position);

        await this.page.waitForTimeout(scrollDelay);

        // Extract jobs from currently visible cards
        const currentJobElements = await this.page.$$(".card");
        const currentJobs = await this.extractJobsFromElements(
          currentJobElements
        );

        // Add to our collection (Map will handle duplicates)
        let newJobsCount = 0;
        for (const job of currentJobs) {
          const jobKey = `${job.job_title}_${job.job_url}`.replace(/\s+/g, "_");
          if (!jobsMap.has(jobKey)) {
            jobsMap.set(jobKey, job);
            newJobsCount++;
          }
        }

        console.log(
          `📋 Found ${currentJobs.length} visible jobs, ${newJobsCount} new unique jobs (total: ${jobsMap.size})`
        );

        if (scrollAttempts >= maxScrollAttempts) {
          console.log("🛑 Reached maximum scroll attempts");
          break;
        }
      }

      // Convert Map back to array
      const uniqueJobs = Array.from(jobsMap.values());
      console.log(
        `🏁 Collection complete: ${uniqueJobs.length} unique jobs found`
      );

      // Fetch descriptions for all collected jobs
      const jobsWithDescriptions = await this.fetchJobDescriptions(uniqueJobs);

      return jobsWithDescriptions;
    } catch (error) {
      console.error("❌ Error during job collection:", error);
      // Return what we have collected so far
      return Array.from(jobsMap.values());
    }
  }

  private async extractJobsFromElements(
    jobElements: any[]
  ): Promise<JobInput[]> {
    const jobs: JobInput[] = [];

    for (let i = 0; i < jobElements.length; i++) {
      try {
        const element = jobElements[i];

        // Extract job title
        const titleElement = await element.$(
          'a[href*="job"], h1, h2, h3, h4, h5, h6, .job-title, [class*="title"]'
        );
        const title = titleElement
          ? (await titleElement.textContent())?.trim() || ""
          : "";

        if (!title || title.length === 0) {
          continue; // Skip jobs without titles
        }

        // Extract company and location using exact aria-label attributes
        let company = "";
        let location = "";

        // Get company from span with aria-label="hiring organization"
        const companySpan = await element.$(
          'span[aria-label="hiring organization"]'
        );
        if (companySpan) {
          company = (await companySpan.textContent())?.trim() || "";
        }

        // Get location from div with aria-label="hiring organization address"
        const locationDiv = await element.$(
          'div[aria-label="hiring organization address"]'
        );
        if (locationDiv) {
          const fullAddress = (await locationDiv.textContent())?.trim() || "";
          // Extract city from full address (usually after last comma)
          if (fullAddress.includes(",")) {
            const parts = fullAddress.split(",");
            location = parts[parts.length - 1].trim();
          } else {
            location = fullAddress;
          }
        }

        // Get salary from div with aria-label="annual salary range"
        let salary = "";
        const salaryDiv = await element.$(
          'div[aria-label="annual salary range"]'
        );
        if (salaryDiv) {
          salary = (await salaryDiv.textContent())?.trim() || "";
        }

        // Final fallback values
        if (!company) company = "Unknown Company";
        if (!location) location = "Location not specified";

        // Extract job URL
        const linkElement = await element.$('a[href*="job"]');
        const jobUrl = linkElement
          ? (await linkElement.getAttribute("href")) || ""
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

        const job: JobInput = {
          job_title: title,
          company: company || "Unknown Company",
          location: location || "Location not specified",
          technologies,
          job_url: jobUrl.startsWith("http")
            ? jobUrl
            : `https://swissdevjobs.ch${jobUrl}`,
          salary: salary || undefined,
          source: {
            name: "swissdevjobs",
            display_name: JOB_SITES.SWISS_DEV_JOBS.NAME,
            base_url: JOB_SITES.SWISS_DEV_JOBS.BASE_URL,
          },
        };

        jobs.push(job);
      } catch (error) {
        console.log(`⚠️ Error extracting job ${i + 1}:`, error);
        continue;
      }
    }

    return jobs;
  }

  private async fetchJobDescriptions(jobs: JobInput[]): Promise<JobInput[]> {
    if (!this.page) {
      throw new Error("Browser not initialized");
    }

    console.log(`\n📄 Fetching descriptions for ${jobs.length} jobs...`);
    const jobsWithDescriptions: JobInput[] = [];

    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      try {
        console.log(
          `\n[${i + 1}/${jobs.length}] Fetching description for: ${
            job.job_title
          } at ${job.company}`
        );

        // Navigate to the job page
        await this.page.goto(job.job_url, {
          waitUntil: "networkidle",
          timeout: 30000,
        });

        // Wait for job details to load
        await this.page.waitForSelector(".job-details-section-box", {
          timeout: 5000,
        });

        // Extract description from div with class job-details-section-box that contains "Description" title
        const description = await this.page.evaluate(() => {
          const sectionBoxes = Array.from(
            document.querySelectorAll(".job-details-section-box")
          );

          // Find the section box that contains "Description" in its title
          const descriptionBox = sectionBoxes.find((box) => {
            const titleElement = box.querySelector(
              "h2, h3, h4, .section-title"
            );
            return (
              titleElement &&
              titleElement.textContent?.toLowerCase().includes("description")
            );
          });

          if (descriptionBox) {
            // Get all text content from the description box, excluding the title
            const title = descriptionBox.querySelector(
              "h2, h3, h4, .section-title"
            );
            if (title) {
              title.remove(); // Remove title to get only description content
            }
            return descriptionBox.textContent?.trim() || "";
          }

          // Fallback: try to find any section with description-like content
          const fallbackBox = sectionBoxes.find((box) => {
            const text = box.textContent?.toLowerCase() || "";
            return (
              text.includes("responsibilities") ||
              text.includes("what you") ||
              text.includes("role")
            );
          });

          return fallbackBox ? fallbackBox.textContent?.trim() || "" : "";
        });

        // Add description to job object
        const jobWithDescription: JobInput = {
          ...job,
          description: description || "No description available",
        };

        jobsWithDescriptions.push(jobWithDescription);
        console.log(
          `✅ Description fetched (${description?.length || 0} chars)`
        );

        // Small delay to avoid overwhelming the server
        if (i < jobs.length - 1) {
          await this.page.waitForTimeout(1000);
        }
      } catch (error) {
        console.log(
          `⚠️ Failed to fetch description for ${job.job_title}: ${error}`
        );
        // Add job without description on error
        jobsWithDescriptions.push({
          ...job,
          description: "Failed to fetch description",
        });
      }
    }

    console.log(
      `\n✅ Fetched descriptions for ${
        jobsWithDescriptions.filter(
          (j) =>
            j.description && j.description !== "Failed to fetch description"
        ).length
      }/${jobs.length} jobs`
    );
    return jobsWithDescriptions;
  }

  private async scrollToLoadAllJobs(): Promise<void> {
    if (!this.page) {
      throw new Error("Browser not initialized");
    }

    try {
      let previousJobCount = 0;
      let currentJobCount = 0;
      let scrollAttempts = 0;
      const maxScrollAttempts = 100; // Increased for incremental scrolling
      const scrollDelay = 800; // Faster for incremental scrolling
      let noChangeAttempts = 0;
      let allJobsSet = new Set<string>(); // Track unique jobs

      console.log("🔄 Starting incremental scroll for virtualized list...");

      // Get initial count
      const initialCards = await this.page.$$(".card");
      currentJobCount = initialCards.length;
      console.log(`📊 Initial job count: ${currentJobCount} cards`);

      // First, find the container and get its dimensions
      const containerInfo = await this.page.evaluate(() => {
        const scrollableContainers = Array.from(
          document.querySelectorAll("div")
        ).filter((div) => {
          const style = window.getComputedStyle(div);
          return (
            style.overflow === "auto" &&
            style.position === "relative" &&
            (style.willChange === "transform" ||
              div.style.willChange === "transform")
          );
        });

        if (scrollableContainers.length > 0) {
          const container = scrollableContainers[0];
          return {
            found: true,
            scrollHeight: container.scrollHeight,
            clientHeight: container.clientHeight,
            maxScroll: container.scrollHeight - container.clientHeight,
          };
        }
        return {
          found: false,
          scrollHeight: 0,
          clientHeight: 0,
          maxScroll: 0,
        };
      });

      if (!containerInfo.found || containerInfo.maxScroll <= 0) {
        console.log(
          "❌ No virtualized container found or container not scrollable"
        );
        return;
      }

      console.log(
        `📐 Container info: scrollHeight=${containerInfo.scrollHeight}, clientHeight=${containerInfo.clientHeight}`
      );

      // Calculate incremental scroll positions
      const scrollIncrement = Math.max(containerInfo.clientHeight / 3, 100); // Scroll 1/3 viewport at a time
      const totalScrollPositions = Math.ceil(
        containerInfo.maxScroll / scrollIncrement
      );

      console.log(
        `📜 Will scroll incrementally through ${totalScrollPositions} positions`
      );

      // Scroll incrementally through the entire list
      for (
        let position = 0;
        position <= containerInfo.maxScroll;
        position += scrollIncrement
      ) {
        scrollAttempts++;

        console.log(
          `📜 Incremental scroll ${scrollAttempts}: position ${position}/${containerInfo.maxScroll}`
        );

        // Scroll to specific position
        const scrollResult = await this.page.evaluate((targetPosition) => {
          const scrollableContainers = Array.from(
            document.querySelectorAll("div")
          ).filter((div) => {
            const style = window.getComputedStyle(div);
            return (
              style.overflow === "auto" &&
              style.position === "relative" &&
              (style.willChange === "transform" ||
                div.style.willChange === "transform")
            );
          });

          if (scrollableContainers.length > 0) {
            const container = scrollableContainers[0];
            const beforeScrollTop = container.scrollTop;

            // Scroll to the target position
            container.scrollTop = targetPosition;

            // Dispatch scroll event to trigger virtualization
            container.dispatchEvent(new Event("scroll", { bubbles: true }));

            const afterScrollTop = container.scrollTop;

            return {
              success: true,
              beforeScrollTop,
              afterScrollTop,
              targetPosition,
              actualPosition: container.scrollTop,
            };
          }
          return { success: false };
        }, position);

        console.log(
          `📊 Scroll result: ${scrollResult.beforeScrollTop} → ${scrollResult.afterScrollTop} (target: ${position})`
        );

        // Wait for virtualized content to render
        await this.page.waitForTimeout(scrollDelay);

        // Collect currently visible jobs to track unique ones
        const currentJobs = await this.page.evaluate(() => {
          const cards = Array.from(document.querySelectorAll(".card"));
          return cards
            .map((card, index) => {
              const titleElement = card.querySelector(
                'a[href*="job"], h1, h2, h3, h4, h5, h6, .job-title, [class*="title"]'
              );
              const title = titleElement
                ? titleElement.textContent?.trim()
                : "";
              const linkElement = card.querySelector('a[href*="job"]');
              const url = linkElement ? linkElement.getAttribute("href") : "";
              return {
                title,
                url,
                uniqueId: `${title}_${url}`.replace(/\s+/g, "_"),
              };
            })
            .filter((job) => job.title && job.title.length > 0);
        });

        // Add to our set of all jobs
        currentJobs.forEach((job) => allJobsSet.add(job.uniqueId));

        const newCurrentJobCount = currentJobs.length;
        console.log(
          `📋 Currently visible: ${newCurrentJobCount} jobs, Total unique collected: ${allJobsSet.size}`
        );

        // Progress update
        if (allJobsSet.size > previousJobCount) {
          console.log(
            `📈 Progress: +${
              allJobsSet.size - previousJobCount
            } new unique jobs (total: ${allJobsSet.size})`
          );
          previousJobCount = allJobsSet.size;
          noChangeAttempts = 0; // Reset since we found new jobs
        } else {
          noChangeAttempts++;
        }

        // Break if we haven't found new jobs for a while
        if (noChangeAttempts >= 10) {
          console.log(
            "🛑 No new unique jobs found for 10 attempts, ending incremental scroll"
          );
          break;
        }

        // Safety check
        if (scrollAttempts >= maxScrollAttempts) {
          console.log("🛑 Reached maximum scroll attempts");
          break;
        }
      }

      console.log(
        `🏁 Incremental scroll completed after ${scrollAttempts} attempts`
      );
      console.log(`📊 Total unique jobs discovered: ${allJobsSet.size}`);

      // Final scroll to top to see all jobs and then scroll through once more to collect everything
      await this.page.evaluate(() => {
        const container = Array.from(document.querySelectorAll("div")).find(
          (div) => {
            const style = window.getComputedStyle(div);
            return style.overflow === "auto" && style.position === "relative";
          }
        );
        if (container) {
          container.scrollTop = 0;
        }
      });

      await this.page.waitForTimeout(1000);
    } catch (error) {
      console.error("❌ Error during incremental scroll:", error);
      // Continue anyway with whatever jobs we have loaded
    }
  }

  // ...existing code...
}
