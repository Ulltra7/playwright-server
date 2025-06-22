import { JobSiteHandler, ApplicationResult } from "./JobSiteHandler";
import { JobApplication } from "../SupabaseService";
import * as path from "path";
import * as fs from "fs";

export class GenericHandler extends JobSiteHandler {
  canHandle(_url: string): boolean {
    // This handler can handle any URL as a fallback
    return true;
  }

  getSiteName(): string {
    return "Generic";
  }

  async apply(job: JobApplication): Promise<ApplicationResult> {
    try {
      console.log("🌐 Using generic handler for", new URL(job.job_url).hostname);

      // Try to fill any form found on the page
      const fillResult = await this.fillGenericForm();
      
      return fillResult;
    } catch (error) {
      return {
        success: false,
        message: `Error handling application: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  private async fillGenericForm(): Promise<ApplicationResult> {
    const formData: Record<string, string> = {};
    let fieldsFound = 0;

    try {
      // Field mappings with multiple possible selectors
      const fieldMappings = [
        {
          selectors: [
            'input[name*="first"]',
            'input[name*="fname"]',
            'input[name*="firstName"]',
            'input[placeholder*="First"]',
            'input[id*="first"]',
            '#first_name',
          ],
          value: this.applicantInfo.firstName,
          field: "firstName",
        },
        {
          selectors: [
            'input[name*="last"]',
            'input[name*="lname"]',
            'input[name*="lastName"]',
            'input[placeholder*="Last"]',
            'input[id*="last"]',
            '#last_name',
          ],
          value: this.applicantInfo.lastName,
          field: "lastName",
        },
        {
          selectors: [
            'input[name*="name"]:not([name*="first"]):not([name*="last"])',
            'input[placeholder*="Full name"]',
            'input[placeholder*="Name"]',
            'input[id="name"]',
          ],
          value: this.applicantInfo.fullName,
          field: "fullName",
        },
        {
          selectors: [
            'input[type="email"]',
            'input[name*="email"]',
            'input[placeholder*="email"]',
            'input[id*="email"]',
            '#email',
          ],
          value: this.applicantInfo.email,
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
          value: this.applicantInfo.phoneNumber,
          field: "phone",
        },
        {
          selectors: [
            'input[name*="linkedin"]',
            'input[placeholder*="LinkedIn"]',
            'input[id*="linkedin"]',
          ],
          value: this.applicantInfo.linkedIn || "",
          field: "linkedIn",
        },
        {
          selectors: [
            'input[name*="github"]',
            'input[placeholder*="GitHub"]',
            'input[id*="github"]',
          ],
          value: this.applicantInfo.github || "",
          field: "github",
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

      // Try to attach CV
      const cvAttached = await this.attachCV();
      if (cvAttached) {
        fieldsFound++;
        formData["cv"] = "CV attached";
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
        message: `Generic form filled with ${fieldsFound} fields`,
        formData,
        submitted: false, // Generic handler doesn't submit
      };
    } catch (error) {
      return {
        success: false,
        message: `Error filling form: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  private async attachCV(): Promise<boolean> {
    try {
      const fileInputSelectors = [
        'input[type="file"]',
        'input[name*="cv"]',
        'input[name*="resume"]',
        'input[name*="CV"]',
        'input[name*="Resume"]',
        'input[accept*="pdf"]',
        '#cv_or_resume',
      ];

      for (const selector of fileInputSelectors) {
        try {
          const fileInput = await this.page.$(selector);
          if (fileInput) {
            const isVisible = await fileInput.isVisible();
            if (isVisible) {
              const cvPath = path.join(process.cwd(), this.applicantInfo.cvPath);
              
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
}