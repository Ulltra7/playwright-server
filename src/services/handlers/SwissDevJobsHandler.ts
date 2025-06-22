import { JobSiteHandler, ApplicationResult } from "./JobSiteHandler";
import { JobApplication } from "../SupabaseService";
import * as path from "path";
import * as fs from "fs";

export class SwissDevJobsHandler extends JobSiteHandler {
  canHandle(url: string): boolean {
    return url.includes("swissdevjobs");
  }

  getSiteName(): string {
    return "SwissDevJobs";
  }

  async apply(job: JobApplication): Promise<ApplicationResult> {
    try {
      console.log("🇨🇭 Using SwissDevJobs handler");

      // First, try to click the "Bewerben" button
      const buttonClicked = await this.clickApplyButton();
      if (!buttonClicked) {
        console.log("  ℹ️  No Bewerben button found, checking if form is already visible");
      }

      // Wait for form to appear
      await this.page.waitForTimeout(2000);

      // Fill the form
      const fillResult = await this.fillApplicationForm(job);
      if (!fillResult.success) {
        return fillResult;
      }

      // Submit the form
      const submitResult = await this.submitForm();
      
      return {
        ...fillResult,
        submitted: submitResult,
        message: submitResult 
          ? `SwissDevJobs form submitted successfully with ${Object.keys(fillResult.formData || {}).length} fields`
          : `SwissDevJobs form filled with ${Object.keys(fillResult.formData || {}).length} fields`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error handling SwissDevJobs application: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  private async clickApplyButton(): Promise<boolean> {
    const applyButtonSelectors = [
      'button:has-text("BEWERBEN")',
      'button:has-text("Bewerben")',
      "button.job-apply-button",
      'button[aria-label*="Bewerben"]',
    ];

    for (const selector of applyButtonSelectors) {
      try {
        const button = await this.page.$(selector);
        if (button && await button.isVisible()) {
          await button.click();
          console.log("  ✓ Clicked Bewerben button");
          return true;
        }
      } catch (error) {
        // Continue to next selector
      }
    }
    
    return false;
  }

  private async fillApplicationForm(job: JobApplication): Promise<ApplicationResult> {
    const formData: Record<string, string> = {};
    let fieldsFound = 0;

    try {
      // Fill name field (Vor- und Nachname)
      const nameInput = await this.page.$('input[name="name"]');
      if (nameInput && await nameInput.isVisible()) {
        await nameInput.fill(`${this.applicantInfo.firstName} ${this.applicantInfo.lastName}`);
        formData["name"] = `${this.applicantInfo.firstName} ${this.applicantInfo.lastName}`;
        fieldsFound++;
        console.log("  ✓ Filled name field");
      }

      // Fill email field
      const emailInput = await this.page.$('input[name="email"]');
      if (emailInput && await emailInput.isVisible()) {
        await emailInput.fill(this.applicantInfo.email);
        formData["email"] = this.applicantInfo.email;
        fieldsFound++;
        console.log("  ✓ Filled email field");
      }

      // Select EU citizen radio button (Yes)
      const euYesRadio = await this.page.$("input#YesEurope");
      if (euYesRadio && await euYesRadio.isVisible()) {
        await euYesRadio.click();
        formData["isFromEurope"] = "Yes";
        fieldsFound++;
        console.log("  ✓ Selected EU citizen: Yes");
      }

      // Upload CV
      const cvInput = await this.page.$('input[name="cvFile"]');
      if (cvInput && await cvInput.isVisible()) {
        const cvPath = path.join(process.cwd(), this.applicantInfo.cvPath);
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
      const motivationTextarea = await this.page.$('textarea[name="motivationLetter"]');
      if (motivationTextarea && await motivationTextarea.isVisible()) {
        // Create a personalized cover letter
        const personalizedCoverLetter = this.applicantInfo.coverLetterString
          .replace("[Company Name]", job.company || "Ihr Unternehmen")
          .trim();
        
        await motivationTextarea.fill(personalizedCoverLetter);
        formData["motivationLetter"] = "Cover letter filled";
        fieldsFound++;
        console.log("  ✓ Filled motivation letter");
      }

      // Uncheck newsletter checkbox if it's checked
      const newsletterCheckbox = await this.page.$('input[name="wantsNewsletter"]');
      if (newsletterCheckbox && await newsletterCheckbox.isVisible()) {
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

      console.log(`  ✓ Filled ${fieldsFound} fields on SwissDevJobs form`);
      return {
        success: true,
        message: `Filled ${fieldsFound} fields`,
        formData,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error filling form: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  private async submitForm(): Promise<boolean> {
    try {
      const submitButton = await this.page.$('button[type="submit"]');
      
      if (submitButton && await submitButton.isVisible()) {
        console.log("  ℹ️  Submit button found, preparing to submit...");
        
        // Update database before submitting
        if (this.updateApplicationStatus) {
          await this.updateApplicationStatus("applied");
          console.log("  ✓ Updated application status in database");
        }
        
        // Click submit
        await submitButton.click();
        console.log("  ✓ Clicked submit button");
        
        // Wait for submission
        await this.page.waitForTimeout(3000);
        
        // Check for success indicators
        const successMessage = await this.page.$('text=/erfolgreich|gesendet|danke/i');
        if (successMessage) {
          console.log("  ✅ Application submitted successfully!");
          return true;
        }
        
        console.log("  ℹ️  Form submitted (success confirmation not detected)");
        return true;
      }
      
      console.log("  ⚠️  Submit button not found");
      return false;
    } catch (error) {
      console.error("  ❌ Error submitting form:", error);
      return false;
    }
  }
}