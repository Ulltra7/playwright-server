import * as cron from "node-cron";
import { JobOrchestrationService } from "./JobOrchestrationService";

/**
 * Service responsible ONLY for scheduling tasks
 * Single Responsibility: Cron scheduling
 */
export class CronJobService {
  private jobOrchestrationService: JobOrchestrationService;

  constructor() {
    this.jobOrchestrationService = new JobOrchestrationService();
  }

  /**
   * Start daily job scraping at 7:00 AM
   */
  startDailyJobScraping(): void {
    // Cron expression: '0 7 * * *' = At 7:00 AM every day
    cron.schedule(
      "0 7 * * *",
      async () => {
        console.log(
          "⏰ Daily job scraping triggered at:",
          new Date().toISOString()
        );
        await this.jobOrchestrationService.runAllScrapers();
      },
      {
        timezone: "Europe/Zurich",
      }
    );

    console.log("📅 Daily job scraping scheduled for 7:00 AM (Europe/Zurich)");
  }

  /**
   * Manual trigger for testing - delegates to orchestration service
   */
  async runArbeitnowScraping(): Promise<void> {
    await this.jobOrchestrationService.runScraper("arbeitnow");
  }

  /**
   * Manual trigger for testing - delegates to orchestration service
   */
  async runSwissDevJobsScraping(): Promise<void> {
    await this.jobOrchestrationService.runScraper("swissdevjobs");
  }

  /**
   * Manual trigger for testing - delegates to orchestration service
   */
  async runAllScrapers(): Promise<void> {
    await this.jobOrchestrationService.runAllScrapers();
  }
}
