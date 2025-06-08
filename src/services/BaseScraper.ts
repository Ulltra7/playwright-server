import { Browser, Page, chromium } from "playwright";
import { BROWSER_CONFIG } from "../constants/urls";

export abstract class BaseScraper {
  protected browser: Browser | null = null;
  protected page: Page | null = null;

  protected async initBrowser(): Promise<void> {
    this.browser = await chromium.launch({
      headless: BROWSER_CONFIG.HEADLESS,
      args: BROWSER_CONFIG.ARGS,
    });
    this.page = await this.browser.newPage();
  }

  protected async navigateToUrl(url: string): Promise<void> {
    if (!this.page) {
      throw new Error("Browser not initialized. Call initBrowser() first.");
    }

    console.log(`🌐 Navigating to ${url}`);
    await this.page.goto(url, {
      waitUntil: "networkidle",
      timeout: BROWSER_CONFIG.TIMEOUT,
    });

    // Wait for page to load
    await this.page.waitForTimeout(BROWSER_CONFIG.WAIT_FOR_LOAD);
  }

  protected async getPageInfo(): Promise<{ title: string; url: string }> {
    if (!this.page) {
      throw new Error("Browser not initialized. Call initBrowser() first.");
    }

    const title = await this.page.title();
    const url = this.page.url();

    return { title, url };
  }

  protected async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  // Abstract method that each scraper must implement
  abstract scrapeJobs(): Promise<any>;
}
