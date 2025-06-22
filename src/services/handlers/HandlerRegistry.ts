import { Page } from "playwright";
import { JobSiteHandler } from "./JobSiteHandler";
import { SwissDevJobsHandler } from "./SwissDevJobsHandler";
import { ArbeitnowHandler } from "./ArbeitnowHandler";
import { ApplicantInfo } from "../../config/applicant.config";

export class HandlerRegistry {
  private handlers: typeof JobSiteHandler[] = [
    SwissDevJobsHandler,
    ArbeitnowHandler,
  ];

  /**
   * Get the appropriate handler for a job URL
   */
  getHandler(
    url: string, 
    page: Page, 
    applicantInfo: ApplicantInfo, 
    jobId: string,
    updateApplicationStatus?: (status: "applied" | "rejected" | "interview_scheduled") => Promise<void>
  ): JobSiteHandler | null {
    for (const HandlerClass of this.handlers) {
      // Create a temporary instance to check if it can handle the URL
      const tempHandler = new (HandlerClass as any)(page, applicantInfo, jobId);
      if (tempHandler.canHandle(url)) {
        // If we have an update function, attach it to the handler
        if (updateApplicationStatus) {
          tempHandler.updateApplicationStatus = updateApplicationStatus;
        }
        return tempHandler;
      }
    }
    return null;
  }

  /**
   * Register a new handler
   */
  registerHandler(handler: typeof JobSiteHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Get all registered site names
   */
  getRegisteredSites(): string[] {
    return this.handlers.map(HandlerClass => {
      const tempHandler = new (HandlerClass as any)(null, null, "");
      return tempHandler.getSiteName();
    });
  }
}

// Export a singleton instance
export const handlerRegistry = new HandlerRegistry();