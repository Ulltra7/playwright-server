"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SwissDevJobsScraper = void 0;
const JobScraper_1 = require("../services/JobScraper");
const urls_1 = require("../constants/urls");
class SwissDevJobsScraper extends JobScraper_1.JobScraper {
    async scrapeJobs() {
        try {
            console.log("🔍 Starting Swiss Dev Jobs scraper...");
            await this.initBrowser();
            await this.navigateToUrl(urls_1.JOB_SITES.SWISS_DEV_JOBS.ALL_JOBS);
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
            console.log("🏷️ Semantic analysis:", JSON.stringify(semanticAnalysis, null, 2));
            // Get page info
            const { title, url } = await this.getPageInfo();
            // Try to extract job listings
            const jobs = await this.extractJobListings();
            await this.closeBrowser();
            return {
                url,
                title,
                jobs,
                totalJobs: jobs.length,
                pageAnalysis,
                note: "Job scraping and application logic will be implemented here",
            };
        }
        catch (error) {
            await this.closeBrowser();
            throw error;
        }
    }
    async extractJobListings() {
        if (!this.page) {
            throw new Error("Browser not initialized. Call initBrowser() first.");
        }
        try {
            console.log("📜 Starting incremental scroll to collect all jobs...");
            // Use our improved scrolling method that collects jobs as it goes
            const allCollectedJobs = await this.scrollAndCollectAllJobs();
            console.log(`📊 Successfully collected ${allCollectedJobs.length} total jobs through incremental scrolling`);
            return allCollectedJobs;
        }
        catch (error) {
            console.error("❌ Error in extractJobListings:", error);
            return [];
        }
    }
    async scrollAndCollectAllJobs() {
        if (!this.page) {
            throw new Error("Browser not initialized");
        }
        const allJobs = [];
        const jobsMap = new Map(); // Use Map to avoid duplicates
        let scrollAttempts = 0;
        const maxScrollAttempts = 100;
        const scrollDelay = 800;
        try {
            console.log("🔄 Starting comprehensive job collection with incremental scroll...");
            // Get container info
            const containerInfo = await this.page.evaluate(() => {
                const scrollableContainers = Array.from(document.querySelectorAll('div')).filter(div => {
                    const style = window.getComputedStyle(div);
                    return style.overflow === 'auto' &&
                        style.position === 'relative' &&
                        (style.willChange === 'transform' || div.style.willChange === 'transform');
                });
                if (scrollableContainers.length > 0) {
                    const container = scrollableContainers[0];
                    return {
                        found: true,
                        scrollHeight: container.scrollHeight,
                        clientHeight: container.clientHeight,
                        maxScroll: container.scrollHeight - container.clientHeight
                    };
                }
                return {
                    found: false,
                    scrollHeight: 0,
                    clientHeight: 0,
                    maxScroll: 0
                };
            });
            if (!containerInfo.found || containerInfo.maxScroll <= 0) {
                console.log("❌ No virtualized container found, falling back to current page jobs");
                const currentJobs = await this.page.$$(".card");
                return this.extractJobsFromElements(currentJobs);
            }
            const scrollIncrement = Math.max(containerInfo.clientHeight / 3, 100);
            console.log(`📐 Container: ${containerInfo.scrollHeight}px height, will scroll in ${scrollIncrement}px increments`);
            // Scroll through the entire list incrementally
            for (let position = 0; position <= containerInfo.maxScroll; position += scrollIncrement) {
                scrollAttempts++;
                console.log(`📜 Scroll ${scrollAttempts}: position ${position}/${containerInfo.maxScroll}`);
                // Scroll to position
                await this.page.evaluate((targetPosition) => {
                    const container = Array.from(document.querySelectorAll('div')).find(div => {
                        const style = window.getComputedStyle(div);
                        return style.overflow === 'auto' && style.position === 'relative';
                    });
                    if (container) {
                        container.scrollTop = targetPosition;
                        container.dispatchEvent(new Event('scroll', { bubbles: true }));
                    }
                }, position);
                await this.page.waitForTimeout(scrollDelay);
                // Extract jobs from currently visible cards
                const currentJobElements = await this.page.$$(".card");
                const currentJobs = await this.extractJobsFromElements(currentJobElements);
                // Add to our collection (Map will handle duplicates)
                let newJobsCount = 0;
                for (const job of currentJobs) {
                    const jobKey = `${job.title}_${job.url}`.replace(/\s+/g, '_');
                    if (!jobsMap.has(jobKey)) {
                        jobsMap.set(jobKey, job);
                        newJobsCount++;
                    }
                }
                console.log(`📋 Found ${currentJobs.length} visible jobs, ${newJobsCount} new unique jobs (total: ${jobsMap.size})`);
                if (scrollAttempts >= maxScrollAttempts) {
                    console.log("🛑 Reached maximum scroll attempts");
                    break;
                }
            }
            // Convert Map back to array
            const uniqueJobs = Array.from(jobsMap.values());
            console.log(`🏁 Collection complete: ${uniqueJobs.length} unique jobs found`);
            return uniqueJobs;
        }
        catch (error) {
            console.error("❌ Error during job collection:", error);
            // Return what we have collected so far
            return Array.from(jobsMap.values());
        }
    }
    async extractJobsFromElements(jobElements) {
        const jobs = [];
        for (let i = 0; i < jobElements.length; i++) {
            try {
                const element = jobElements[i];
                // Extract job title
                const titleElement = await element.$('a[href*="job"], h1, h2, h3, h4, h5, h6, .job-title, [class*="title"]');
                const title = titleElement
                    ? (await titleElement.textContent())?.trim() || ""
                    : "";
                if (!title || title.length === 0) {
                    continue; // Skip jobs without titles
                }
                // Extract company and location using semantic attributes first
                let company = await this.extractCompanyBySemantic(element);
                let location = await this.extractLocationBySemantic(element);
                // Fallback to parsing combined company+location links
                if (!company) {
                    const allLinks = await element.$$("a");
                    for (const link of allLinks) {
                        const linkText = (await link.textContent())?.trim() || "";
                        const linkHref = (await link.getAttribute("href")) || "";
                        if (linkHref.includes("/jobs/") &&
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
                            linkText.length > 10 &&
                            (linkText.includes("AG") ||
                                linkText.includes("GmbH") ||
                                linkText.includes("SA") ||
                                linkText.includes("strasse") ||
                                linkText.includes("gasse") ||
                                linkText.includes(","))) {
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
                                    break;
                                }
                            }
                            if (extracted)
                                break;
                        }
                    }
                }
                // Extract job URL
                const linkElement = await element.$('a[href*="job"]');
                const jobUrl = linkElement
                    ? (await linkElement.getAttribute("href")) || ""
                    : "";
                // Extract salary if available
                const salaryElement = await element.$('[class*="salary"], [class*="wage"], [class*="chf"], [class*="€"], [class*="$"]');
                const salary = salaryElement
                    ? (await salaryElement.textContent())?.trim() || ""
                    : "";
                // Extract technology badges
                const technologies = [];
                const techBadgesContainer = await element.$(".job-teaser-technology-badges");
                if (techBadgesContainer) {
                    const techBadges = await techBadgesContainer.$$(".technology-badge, .badge");
                    for (const badge of techBadges) {
                        const techText = (await badge.textContent())?.trim();
                        if (techText && techText.length > 0) {
                            technologies.push(techText);
                        }
                    }
                }
                const job = {
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
            }
            catch (error) {
                console.log(`⚠️ Error extracting job ${i + 1}:`, error);
                continue;
            }
        }
        return jobs;
    }
    async scrollToLoadAllJobs() {
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
            let allJobsSet = new Set(); // Track unique jobs
            console.log("🔄 Starting incremental scroll for virtualized list...");
            // Get initial count
            const initialCards = await this.page.$$(".card");
            currentJobCount = initialCards.length;
            console.log(`📊 Initial job count: ${currentJobCount} cards`);
            // First, find the container and get its dimensions
            const containerInfo = await this.page.evaluate(() => {
                const scrollableContainers = Array.from(document.querySelectorAll('div')).filter(div => {
                    const style = window.getComputedStyle(div);
                    return style.overflow === 'auto' &&
                        style.position === 'relative' &&
                        (style.willChange === 'transform' || div.style.willChange === 'transform');
                });
                if (scrollableContainers.length > 0) {
                    const container = scrollableContainers[0];
                    return {
                        found: true,
                        scrollHeight: container.scrollHeight,
                        clientHeight: container.clientHeight,
                        maxScroll: container.scrollHeight - container.clientHeight
                    };
                }
                return {
                    found: false,
                    scrollHeight: 0,
                    clientHeight: 0,
                    maxScroll: 0
                };
            });
            if (!containerInfo.found || containerInfo.maxScroll <= 0) {
                console.log("❌ No virtualized container found or container not scrollable");
                return;
            }
            console.log(`📐 Container info: scrollHeight=${containerInfo.scrollHeight}, clientHeight=${containerInfo.clientHeight}`);
            // Calculate incremental scroll positions
            const scrollIncrement = Math.max(containerInfo.clientHeight / 3, 100); // Scroll 1/3 viewport at a time
            const totalScrollPositions = Math.ceil(containerInfo.maxScroll / scrollIncrement);
            console.log(`📜 Will scroll incrementally through ${totalScrollPositions} positions`);
            // Scroll incrementally through the entire list
            for (let position = 0; position <= containerInfo.maxScroll; position += scrollIncrement) {
                scrollAttempts++;
                console.log(`📜 Incremental scroll ${scrollAttempts}: position ${position}/${containerInfo.maxScroll}`);
                // Scroll to specific position
                const scrollResult = await this.page.evaluate((targetPosition) => {
                    const scrollableContainers = Array.from(document.querySelectorAll('div')).filter(div => {
                        const style = window.getComputedStyle(div);
                        return style.overflow === 'auto' &&
                            style.position === 'relative' &&
                            (style.willChange === 'transform' || div.style.willChange === 'transform');
                    });
                    if (scrollableContainers.length > 0) {
                        const container = scrollableContainers[0];
                        const beforeScrollTop = container.scrollTop;
                        // Scroll to the target position
                        container.scrollTop = targetPosition;
                        // Dispatch scroll event to trigger virtualization
                        container.dispatchEvent(new Event('scroll', { bubbles: true }));
                        const afterScrollTop = container.scrollTop;
                        return {
                            success: true,
                            beforeScrollTop,
                            afterScrollTop,
                            targetPosition,
                            actualPosition: container.scrollTop
                        };
                    }
                    return { success: false };
                }, position);
                console.log(`📊 Scroll result: ${scrollResult.beforeScrollTop} → ${scrollResult.afterScrollTop} (target: ${position})`);
                // Wait for virtualized content to render
                await this.page.waitForTimeout(scrollDelay);
                // Collect currently visible jobs to track unique ones
                const currentJobs = await this.page.evaluate(() => {
                    const cards = Array.from(document.querySelectorAll('.card'));
                    return cards.map((card, index) => {
                        const titleElement = card.querySelector('a[href*="job"], h1, h2, h3, h4, h5, h6, .job-title, [class*="title"]');
                        const title = titleElement ? titleElement.textContent?.trim() : '';
                        const linkElement = card.querySelector('a[href*="job"]');
                        const url = linkElement ? linkElement.getAttribute('href') : '';
                        return {
                            title,
                            url,
                            uniqueId: `${title}_${url}`.replace(/\s+/g, '_')
                        };
                    }).filter(job => job.title && job.title.length > 0);
                });
                // Add to our set of all jobs
                currentJobs.forEach(job => allJobsSet.add(job.uniqueId));
                const newCurrentJobCount = currentJobs.length;
                console.log(`📋 Currently visible: ${newCurrentJobCount} jobs, Total unique collected: ${allJobsSet.size}`);
                // Progress update
                if (allJobsSet.size > previousJobCount) {
                    console.log(`📈 Progress: +${allJobsSet.size - previousJobCount} new unique jobs (total: ${allJobsSet.size})`);
                    previousJobCount = allJobsSet.size;
                    noChangeAttempts = 0; // Reset since we found new jobs
                }
                else {
                    noChangeAttempts++;
                }
                // Break if we haven't found new jobs for a while
                if (noChangeAttempts >= 10) {
                    console.log("🛑 No new unique jobs found for 10 attempts, ending incremental scroll");
                    break;
                }
                // Safety check
                if (scrollAttempts >= maxScrollAttempts) {
                    console.log("🛑 Reached maximum scroll attempts");
                    break;
                }
            }
            console.log(`🏁 Incremental scroll completed after ${scrollAttempts} attempts`);
            console.log(`📊 Total unique jobs discovered: ${allJobsSet.size}`);
            // Final scroll to top to see all jobs and then scroll through once more to collect everything
            await this.page.evaluate(() => {
                const container = Array.from(document.querySelectorAll('div')).find(div => {
                    const style = window.getComputedStyle(div);
                    return style.overflow === 'auto' && style.position === 'relative';
                });
                if (container) {
                    container.scrollTop = 0;
                }
            });
            await this.page.waitForTimeout(1000);
        }
        catch (error) {
            console.error("❌ Error during incremental scroll:", error);
            // Continue anyway with whatever jobs we have loaded
        }
    }
}
exports.SwissDevJobsScraper = SwissDevJobsScraper;
