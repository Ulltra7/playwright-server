import { JobScraper } from "../scrapers/JobScraper";
import { JobApplication } from "./SupabaseService";

export interface JobApplicationResult {
  jobId: string;
  jobTitle: string;
  company: string;
  success: boolean;
  status: "form_filled" | "external_link" | "no_apply_button" | "error";
  message: string;
  formData?: {
    name?: string;
    email?: string;
    phone?: string;
    coverLetter?: string;
  };
  error?: string;
}

export class JobApplicationService extends JobScraper {
  private readonly APPLICATION_CONFIG = {
    name: "John Doe", // Replace with actual name
    email: "john.doe@example.com", // Replace with actual email
    phone: "+41 XX XXX XX XX", // Replace with actual phone
    coverLetter: `Dear Hiring Manager,

I am writing to express my interest in this position. As an experienced developer with expertise in modern web technologies including Node.js, React, TypeScript, and Python, I am excited about the opportunity to contribute to your team.

I have a strong background in full-stack development and am passionate about creating efficient, scalable solutions. I would welcome the opportunity to discuss how my skills and experience can benefit your organization.

Thank you for your consideration.

Best regards,
John Doe`,
  };

  async applyToJob(job: JobApplication): Promise<JobApplicationResult> {
    const result: JobApplicationResult = {
      jobId: job.id || "",
      jobTitle: job.job_title,
      company: job.company,
      success: false,
      status: "error",
      message: "",
    };

    try {
      console.log(
        `🎯 Starting application process for: ${job.job_title} at ${job.company}`
      );

      await this.initBrowser();
      await this.navigateToUrl(job.job_url);

      // Wait for page to load
      await this.page?.waitForTimeout(2000);

      // Look for the apply button
      const applyButtonResult = await this.findAndClickApplyButton();

      if (!applyButtonResult.found) {
        result.status = "no_apply_button";
        result.message = "No apply button found on the page";
        await this.closeBrowser();
        return result;
      }

      if (applyButtonResult.isExternalLink) {
        result.status = "external_link";
        result.message = `Apply button leads to external site: ${applyButtonResult.externalUrl}`;
        await this.closeBrowser();
        return result;
      }

      // If we reach here, the apply button was clicked and should open a form
      console.log("✅ Apply button clicked, looking for application form...");

      // Wait for potential form to appear
      await this.page?.waitForTimeout(3000);

      // Try to fill the application form
      const formResult = await this.fillApplicationForm();

      if (formResult.success) {
        result.success = true;
        result.status = "form_filled";
        result.message = "Application form filled successfully (not submitted)";
        result.formData = formResult.formData;
      } else {
        result.status = "error";
        result.message =
          formResult.message || "Failed to fill application form";
      }
    } catch (error) {
      console.error(`❌ Error applying to job ${job.job_title}:`, error);
      result.error = error instanceof Error ? error.message : String(error);
      result.message = `Error during application process: ${result.error}`;
    } finally {
      // wait 5 seconds before closing the browser
      await this.page?.waitForTimeout(5000);
      await this.closeBrowser();
    }

    return result;
  }

  private async findAndClickApplyButton(): Promise<{
    found: boolean;
    isExternalLink: boolean;
    externalUrl?: string;
  }> {
    if (!this.page) {
      return { found: false, isExternalLink: false };
    }

    try {
      // Look for apply button with various selectors
      const applySelectors = [
        'button[title="Apply for this job"]',
        'button:has-text("APPLY")',
        'a[title="Apply for this job"]',
        'a:has-text("APPLY")',
        'button:has-text("Apply")',
        'a:has-text("Apply")',
        '[data-testid*="apply"]',
        ".apply-button",
        "#apply-button",
        'button[class*="apply"]',
        'a[class*="apply"]',
      ];

      let applyElement = null;
      let usedSelector = "";

      // Try each selector
      for (const selector of applySelectors) {
        try {
          applyElement = await this.page.$(selector);
          if (applyElement) {
            usedSelector = selector;
            console.log(`🎯 Found apply button with selector: ${selector}`);
            break;
          }
        } catch (error) {
          // Continue to next selector
        }
      }

      if (!applyElement) {
        console.log("❌ No apply button found with any selector");
        return { found: false, isExternalLink: false };
      }

      // Check if it's a link (a tag) and get the href
      const tagName = await applyElement.evaluate((el) =>
        el.tagName.toLowerCase()
      );

      if (tagName === "a") {
        const href = await applyElement.getAttribute("href");

        if (href) {
          // Check if it's an external link
          const currentDomain = new URL(this.page.url()).hostname;

          try {
            const linkUrl = new URL(href, this.page.url());
            if (linkUrl.hostname !== currentDomain) {
              console.log(
                `🔗 Apply button is external link to: ${linkUrl.href}`
              );
              return {
                found: true,
                isExternalLink: true,
                externalUrl: linkUrl.href,
              };
            }
          } catch (error) {
            // If URL parsing fails, treat as relative link
          }
        }
      }

      // Click the apply button
      await applyElement.click();
      console.log("✅ Apply button clicked successfully");

      return { found: true, isExternalLink: false };
    } catch (error) {
      console.error("❌ Error finding/clicking apply button:", error);
      return { found: false, isExternalLink: false };
    }
  }

  private async fillApplicationForm(): Promise<{
    success: boolean;
    message?: string;
    formData?: any;
  }> {
    if (!this.page) {
      return { success: false, message: "Browser not initialized" };
    }

    try {
      // Wait for potential modal or form to appear
      await this.page.waitForTimeout(2000);

      const formData: any = {};

      // Look for common form fields and fill them
      const fieldMappings = [
        {
          selectors: [
            'input[name*="name"]',
            'input[placeholder*="name"]',
            'input[id*="name"]',
          ],
          value: this.APPLICATION_CONFIG.name,
          field: "name",
        },
        {
          selectors: [
            'input[name*="email"]',
            'input[placeholder*="email"]',
            'input[id*="email"]',
            'input[type="email"]',
          ],
          value: this.APPLICATION_CONFIG.email,
          field: "email",
        },
        {
          selectors: [
            'input[name*="phone"]',
            'input[placeholder*="phone"]',
            'input[id*="phone"]',
            'input[type="tel"]',
          ],
          value: this.APPLICATION_CONFIG.phone,
          field: "phone",
        },
        {
          selectors: [
            'textarea[name*="cover"]',
            'textarea[placeholder*="cover"]',
            'textarea[name*="letter"]',
            'textarea[placeholder*="letter"]',
            'textarea[name*="message"]',
          ],
          value: this.APPLICATION_CONFIG.coverLetter,
          field: "coverLetter",
        },
      ];

      let fieldsFound = 0;

      for (const mapping of fieldMappings) {
        let fieldFound = false;

        for (const selector of mapping.selectors) {
          try {
            const element = await this.page.$(selector);
            if (element) {
              // Check if the element is visible and enabled
              const isVisible = await element.isVisible();
              const isEnabled = await element.isEnabled();

              if (isVisible && isEnabled) {
                await element.fill(mapping.value);
                formData[mapping.field] = mapping.value;
                fieldsFound++;
                fieldFound = true;
                console.log(
                  `✅ Filled ${mapping.field} field with selector: ${selector}`
                );
                break;
              }
            }
          } catch (error) {
            // Continue to next selector
          }
        }

        if (!fieldFound) {
          console.log(`⚠️ Could not find field: ${mapping.field}`);
        }
      }

      if (fieldsFound === 0) {
        return {
          success: false,
          message: "No form fields found or form not visible",
        };
      }

      console.log(`✅ Successfully filled ${fieldsFound} form fields`);

      // Take a screenshot for debugging
      await this.takeScreenshot(`application-form-${Date.now()}.png`);

      return {
        success: true,
        message: `Form filled with ${fieldsFound} fields. Ready for manual submission.`,
        formData,
      };
    } catch (error) {
      console.error("❌ Error filling application form:", error);
      return {
        success: false,
        message: `Error filling form: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  // Override the abstract method from JobScraper (not used in this context)
  async scrapeJobs(): Promise<any> {
    throw new Error("JobApplicationService is not for scraping jobs");
  }
}
