import { chromium, Browser, Page } from "playwright";
import { BROWSER_CONFIG } from "../constants/urls";
import { applicantConfig } from "../config/applicant.config";
import { JobApplication, SupabaseService } from "./SupabaseService";
import { handlerRegistry } from "./handlers/HandlerRegistry";
import { GenericHandler } from "./handlers/GenericHandler";

export interface JobApplicationResult {
  jobId: string;
  jobTitle: string;
  company: string;
  success: boolean;
  status:
    | "form_filled"
    | "form_submitted"
    | "already_applied"
    | "no_form"
    | "error";
  message: string;
  formData?: Record<string, string>;
  error?: string;
}

export class JobApplicationService {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private supabaseService: SupabaseService;

  constructor() {
    this.supabaseService = new SupabaseService();
  }

  async applyToJob(job: JobApplication): Promise<JobApplicationResult> {
    const jobId = job.id || "";

    const result: JobApplicationResult = {
      jobId,
      jobTitle: job.job_title,
      company: job.company,
      success: false,
      status: "error",
      message: "",
    };

    try {
      console.log(`\n🎯 Processing: ${job.job_title} at ${job.company}`);

      // Initialize browser
      await this.initBrowser();
      await this.navigateToUrl(job.job_url);

      // Wait for page to load
      await this.page!.waitForTimeout(2000);

      // Create update function for handlers
      const updateApplicationStatus = async (
        status: "applied" | "rejected" | "interview_scheduled"
      ) => {
        await this.updateApplicationStatus(jobId, status);
      };

      // Get appropriate handler for this job site
      let handler = handlerRegistry.getHandler(
        job.job_url,
        this.page!,
        applicantConfig,
        jobId,
        updateApplicationStatus
      );

      // If no specific handler found, use generic handler
      if (!handler) {
        console.log("  ℹ️  No specific handler found, using generic handler");
        handler = new GenericHandler(this.page!, applicantConfig, jobId);
        handler.updateApplicationStatus = updateApplicationStatus;
      }

      // Apply using the handler
      const handlerResult = await handler.apply(job);

      if (handlerResult.success) {
        result.success = true;
        result.status = handlerResult.submitted
          ? "form_submitted"
          : "form_filled";
        result.message = handlerResult.message;
        result.formData = handlerResult.formData;
        console.log(`✅ ${handlerResult.message}`);
      } else {
        result.status = "no_form";
        result.message = handlerResult.message;
        console.log(`❌ ${handlerResult.message}`);
      }

      // Take screenshot for debugging
      await this.takeScreenshot(`application-${job.company}-${Date.now()}.png`);
    } catch (error) {
      console.error(`❌ Error applying to job:`, error);
      result.error = error instanceof Error ? error.message : String(error);
      result.message = `Error: ${result.error}`;
    } finally {
      await this.closeBrowser();
    }

    return result;
  }

  private async initBrowser(): Promise<void> {
    this.browser = await chromium.launch({
      headless: BROWSER_CONFIG.HEADLESS,
      args: BROWSER_CONFIG.ARGS,
    });
    this.page = await this.browser.newPage();
  }

  private async navigateToUrl(url: string): Promise<void> {
    if (!this.page) {
      throw new Error("Browser not initialized");
    }

    await this.page.goto(url, {
      waitUntil: "networkidle",
      timeout: BROWSER_CONFIG.TIMEOUT,
    });
  }

  private async takeScreenshot(filename: string): Promise<void> {
    if (!this.page) return;

    try {
      await this.page.screenshot({
        path: `screenshots/${filename}`,
        fullPage: true,
      });
    } catch (error) {
      console.error("Error taking screenshot:", error);
    }
  }

  private async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  private async updateApplicationStatus(
    jobId: string,
    status: "applied" | "rejected" | "interview_scheduled"
  ): Promise<void> {
    try {
      // First check if application record exists
      const { data: existing } = await this.supabaseService.supabase
        .from("applications")
        .select("id")
        .eq("job_id", jobId)
        .single();

      if (existing) {
        // Update existing record
        const { error } = await this.supabaseService.supabase
          .from("applications")
          .update({
            application_status: status,
            applied_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            notes: `Applied via automated system on ${new Date().toLocaleString()}`,
          })
          .eq("job_id", jobId);

        if (error) {
          console.error("  ❌ Error updating application status:", error);
          throw new Error(`Failed to update application status: ${error.message}`);
        } else {
          console.log("  ✅ Application status updated in database");
        }
      } else {
        // Insert new record
        const { error } = await this.supabaseService.supabase
          .from("applications")
          .insert({
            job_id: jobId,
            application_status: status,
            applied_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            priority: "medium",
            notes: `Applied via automated system on ${new Date().toLocaleString()}`,
          });

        if (error) {
          console.error("  ❌ Error inserting application status:", error);
          throw new Error(`Failed to insert application status: ${error.message}`);
        } else {
          console.log("  ✅ Application status inserted in database");
        }
      }
    } catch (error) {
      console.error("  ❌ Error in updateApplicationStatus:", error);
    }
  }
}
