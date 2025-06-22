import { chromium, Browser, Page } from "playwright";
import { BROWSER_CONFIG } from "../constants/urls";
import { applicantConfig } from "../config/applicant.config";
import { JobApplication, SupabaseService } from "./SupabaseService";
import * as path from "path";
import * as fs from "fs";

export interface JobApplicationResult {
  jobId: string;
  jobTitle: string;
  company: string;
  success: boolean;
  status: "form_filled" | "form_submitted" | "already_applied" | "no_form" | "error";
  message: string;
  formData?: Record<string, string>;
  error?: string;
}

export class JobApplicationService {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private supabaseService: SupabaseService;
  private currentJobId: string = "";

  constructor() {
    this.supabaseService = new SupabaseService();
  }

  async applyToJob(job: JobApplication): Promise<JobApplicationResult> {
    this.currentJobId = job.id || "";
    
    const result: JobApplicationResult = {
      jobId: job.id || "",
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

      // Check if this is a SwissDevJobs URL
      if (job.job_url.includes("swissdevjobs")) {
        console.log("🇨🇭 Detected SwissDevJobs URL, using specific handler");
        const swissResult = await this.handleSwissDevJobsApplication();

        if (swissResult.success) {
          result.success = true;
          result.status = "form_filled";
          result.message =
            swissResult.message || "SwissDevJobs form filled successfully";
          result.formData = swissResult.formData;
        } else {
          result.status = "no_form";
          result.message =
            swissResult.message || "Failed to fill SwissDevJobs form";
        }
      } else {
        // Generic form filling for other sites
        const formResult = await this.fillApplicationForm();

        if (formResult.success) {
          result.success = true;
          result.status = "form_filled";
          result.message = "Application form filled successfully";
          result.formData = formResult.formData;
          console.log("✅ Form filled successfully");
        } else {
          result.status = "no_form";
          result.message = "No application form found on page";
          console.log("❌ No form found");
        }
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

  private async handleSwissDevJobsApplication(): Promise<{
    success: boolean;
    message?: string;
    formData?: Record<string, string>;
  }> {
    if (!this.page) {
      return { success: false, message: "Browser not initialized" };
    }

    try {
      // First, look for and click the "Bewerben" button
      const applyButtonSelectors = [
        'button:has-text("BEWERBEN")',
        'button:has-text("Bewerben")',
        "button.job-apply-button",
        'button[aria-label*="Bewerben"]',
      ];

      let buttonClicked = false;
      for (const selector of applyButtonSelectors) {
        try {
          const button = await this.page.$(selector);
          if (button && (await button.isVisible())) {
            await button.click();
            console.log("  ✓ Clicked Bewerben button");
            buttonClicked = true;
            break;
          }
        } catch (error) {
          // Continue to next selector
        }
      }

      if (!buttonClicked) {
        console.log(
          "  ℹ️  No Bewerben button found, checking if form is already visible"
        );
      }

      // Wait for form to appear
      await this.page.waitForTimeout(2000);

      // Now fill the SwissDevJobs specific form
      const formData: Record<string, string> = {};
      let fieldsFound = 0;

      // Fill name field (Vor- und Nachname)
      const nameInput = await this.page.$('input[name="name"]');
      if (nameInput && (await nameInput.isVisible())) {
        await nameInput.fill(
          `${applicantConfig.firstName} ${applicantConfig.lastName}`
        );
        formData[
          "name"
        ] = `${applicantConfig.firstName} ${applicantConfig.lastName}`;
        fieldsFound++;
        console.log("  ✓ Filled name field");
      }

      // Fill email field
      const emailInput = await this.page.$('input[name="email"]');
      if (emailInput && (await emailInput.isVisible())) {
        await emailInput.fill(applicantConfig.email);
        formData["email"] = applicantConfig.email;
        fieldsFound++;
        console.log("  ✓ Filled email field");
      }

      // Select EU citizen radio button (Yes)
      const euYesRadio = await this.page.$("input#YesEurope");
      if (euYesRadio && (await euYesRadio.isVisible())) {
        await euYesRadio.click();
        formData["isFromEurope"] = "Yes";
        fieldsFound++;
        console.log("  ✓ Selected EU citizen: Yes");
      }

      // Upload CV
      const cvInput = await this.page.$('input[name="cvFile"]');
      if (cvInput && (await cvInput.isVisible())) {
        const cvPath = path.join(process.cwd(), applicantConfig.cvPath);
        if (fs.existsSync(cvPath)) {
          await cvInput.setInputFiles(cvPath);
          formData["cv"] = "CV.pdf uploaded";
          fieldsFound++;
          console.log("  ✓ CV uploaded");
        } else {
          console.log("  ⚠️  CV file not found at:", cvPath);
        }
      }

      // Fill motivation letter
      const motivationTextarea = await this.page.$(
        'textarea[name="motivationLetter"]'
      );
      if (motivationTextarea && (await motivationTextarea.isVisible())) {
        // Create a personalized cover letter
        const personalizedCoverLetter = applicantConfig.coverLetterString
          .replace("[Company Name]", "Ihr Unternehmen")
          .trim();

        await motivationTextarea.fill(personalizedCoverLetter);
        formData["motivationLetter"] = "Cover letter filled";
        fieldsFound++;
        console.log("  ✓ Filled motivation letter");
      }

      // Uncheck newsletter checkbox if it's checked
      const newsletterCheckbox = await this.page.$(
        'input[name="wantsNewsletter"]'
      );
      if (newsletterCheckbox && (await newsletterCheckbox.isVisible())) {
        const isChecked = await newsletterCheckbox.isChecked();
        if (isChecked) {
          await newsletterCheckbox.uncheck();
          console.log("  ✓ Unchecked newsletter");
        }
      }

      if (fieldsFound === 0) {
        return {
          success: false,
          message: "No SwissDevJobs form fields found",
        };
      }

      console.log(`  ✓ SwissDevJobs form filled with ${fieldsFound} fields`);

      // Submit the form
      const submitButton = await this.page.$('button[type="submit"]');
      if (submitButton && await submitButton.isVisible()) {
        console.log("  ℹ️  Submit button found, preparing to submit...");
        
        // Update database BEFORE submitting
        await this.updateApplicationStatus(this.currentJobId, "applied");
        console.log("  ✓ Updated application status in database");
        
        // Now submit the form
        await submitButton.click();
        console.log("  ✓ Clicked submit button");
        
        // Wait for submission to process
        await this.page.waitForTimeout(3000);
        
        // Check for success indicators
        const successMessage = await this.page.$('text=/erfolgreich|gesendet|danke/i');
        if (successMessage) {
          console.log("  ✅ Application submitted successfully!");
          return {
            success: true,
            message: `SwissDevJobs form submitted successfully with ${fieldsFound} fields`,
            formData,
          };
        }
      } else {
        console.log("  ⚠️  Submit button not found");
      }

      return {
        success: true,
        message: `SwissDevJobs form filled with ${fieldsFound} fields and submitted`,
        formData,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error filling SwissDevJobs form: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  private async fillApplicationForm(): Promise<{
    success: boolean;
    message?: string;
    formData?: Record<string, string>;
  }> {
    if (!this.page) {
      return { success: false, message: "Browser not initialized" };
    }

    try {
      const formData: Record<string, string> = {};
      let fieldsFound = 0;

      // Field mappings with multiple possible selectors
      const fieldMappings = [
        {
          selectors: [
            'input[name*="first"]',
            'input[name*="fname"]',
            'input[name*="firstName"]',
            'input[placeholder*="First"]',
            'input[id*="first"]',
          ],
          value: applicantConfig.firstName,
          field: "firstName",
        },
        {
          selectors: [
            'input[name*="last"]',
            'input[name*="lname"]',
            'input[name*="lastName"]',
            'input[placeholder*="Last"]',
            'input[id*="last"]',
          ],
          value: applicantConfig.lastName,
          field: "lastName",
        },
        {
          selectors: [
            'input[name*="name"]:not([name*="first"]):not([name*="last"])',
            'input[placeholder*="Full name"]',
            'input[placeholder*="Name"]',
            'input[id="name"]',
          ],
          value: applicantConfig.fullName,
          field: "fullName",
        },
        {
          selectors: [
            'input[type="email"]',
            'input[name*="email"]',
            'input[placeholder*="email"]',
            'input[id*="email"]',
          ],
          value: applicantConfig.email,
          field: "email",
        },
        {
          selectors: [
            'input[type="tel"]',
            'input[name*="phone"]',
            'input[name*="tel"]',
            'input[placeholder*="phone"]',
            'input[placeholder*="Phone"]',
            'input[id*="phone"]',
          ],
          value: applicantConfig.phoneNumber,
          field: "phone",
        },
        {
          selectors: [
            'input[name*="linkedin"]',
            'input[placeholder*="LinkedIn"]',
            'input[id*="linkedin"]',
          ],
          value: applicantConfig.linkedIn || "",
          field: "linkedIn",
        },
        {
          selectors: [
            'input[name*="github"]',
            'input[placeholder*="GitHub"]',
            'input[id*="github"]',
          ],
          value: applicantConfig.github || "",
          field: "github",
        },
        {
          selectors: [
            'input[name*="portfolio"]',
            'input[name*="website"]',
            'input[placeholder*="Portfolio"]',
            'input[placeholder*="Website"]',
            'input[id*="portfolio"]',
          ],
          value: applicantConfig.portfolio || "",
          field: "portfolio",
        },
      ];

      // Try to fill each field
      for (const mapping of fieldMappings) {
        if (!mapping.value) continue;

        for (const selector of mapping.selectors) {
          try {
            const element = await this.page.$(selector);
            if (element) {
              const isVisible = await element.isVisible();
              const isEnabled = await element.isEnabled();

              if (isVisible && isEnabled) {
                await element.fill(mapping.value);
                formData[mapping.field] = mapping.value;
                fieldsFound++;
                console.log(`  ✓ Filled ${mapping.field}`);
                break;
              }
            }
          } catch (error) {
            // Continue to next selector
          }
        }
      }

      // Try to attach CV if file upload is present
      const cvAttached = await this.attachCV();
      if (cvAttached) {
        fieldsFound++;
        formData["cv"] = "CV.pdf attached";
      }

      if (fieldsFound === 0) {
        return {
          success: false,
          message: "No form fields found on page",
        };
      }

      console.log(`  ✓ Filled ${fieldsFound} fields`);
      return {
        success: true,
        message: `Filled ${fieldsFound} fields`,
        formData,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async attachCV(): Promise<boolean> {
    if (!this.page) return false;

    try {
      // Look for file input fields
      const fileInputSelectors = [
        'input[type="file"]',
        'input[name*="cv"]',
        'input[name*="resume"]',
        'input[name*="CV"]',
        'input[name*="Resume"]',
        'input[accept*="pdf"]',
      ];

      for (const selector of fileInputSelectors) {
        try {
          const fileInput = await this.page.$(selector);
          if (fileInput) {
            const isVisible = await fileInput.isVisible();
            if (isVisible) {
              // Get CV path
              const cvPath = path.join(process.cwd(), applicantConfig.cvPath);

              // Check if CV exists
              if (fs.existsSync(cvPath)) {
                await fileInput.setInputFiles(cvPath);
                console.log("  ✓ CV attached");
                return true;
              } else {
                console.log("  ⚠️  CV file not found at:", cvPath);
              }
            }
          }
        } catch (error) {
          // Continue to next selector
        }
      }
    } catch (error) {
      console.error("  ❌ Error attaching CV:", error);
    }

    return false;
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
      const { error } = await this.supabaseService.supabase
        .from("applications")
        .upsert({
          job_id: jobId,
          application_status: status,
          applied_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          priority: "medium",
          notes: `Applied via automated system on ${new Date().toLocaleString()}`
        });

      if (error) {
        console.error("  ❌ Error updating application status:", error);
      }
    } catch (error) {
      console.error("  ❌ Error in updateApplicationStatus:", error);
    }
  }
}
