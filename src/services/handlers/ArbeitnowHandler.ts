import { JobSiteHandler, ApplicationResult } from "./JobSiteHandler";
import { JobApplication } from "../SupabaseService";
import * as path from "path";
import * as fs from "fs";

export class ArbeitnowHandler extends JobSiteHandler {
  canHandle(url: string): boolean {
    return url.includes("arbeitnow.com");
  }

  getSiteName(): string {
    return "Arbeitnow";
  }

  async apply(job: JobApplication): Promise<ApplicationResult> {
    try {
      console.log("🇩🇪 Using Arbeitnow handler");

      // Check if form exists on the page
      const formExists = await this.checkFormExists();
      if (!formExists) {
        return {
          success: false,
          message: "No application form found on Arbeitnow page",
        };
      }

      // Fill the form
      const fillResult = await this.fillApplicationForm();
      if (!fillResult.success) {
        return fillResult;
      }

      // Submit the form
      const submitResult = await this.submitForm();
      
      return {
        ...fillResult,
        submitted: submitResult,
        message: submitResult 
          ? `Arbeitnow form submitted successfully with ${Object.keys(fillResult.formData || {}).length} fields`
          : `Arbeitnow form filled with ${Object.keys(fillResult.formData || {}).length} fields`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error handling Arbeitnow application: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  private async checkFormExists(): Promise<boolean> {
    // Check for the specific Arbeitnow form
    const form = await this.page.$('#form_job_application');
    return !!form;
  }

  private async fillApplicationForm(): Promise<ApplicationResult> {
    const formData: Record<string, string> = {};
    let fieldsFound = 0;

    try {
      // Fill first name
      const firstNameInput = await this.page.$('#first_name');
      if (firstNameInput && await firstNameInput.isVisible()) {
        await firstNameInput.fill(this.applicantInfo.firstName);
        formData["firstName"] = this.applicantInfo.firstName;
        fieldsFound++;
        console.log("  ✓ Filled first name");
      }

      // Fill last name
      const lastNameInput = await this.page.$('#last_name');
      if (lastNameInput && await lastNameInput.isVisible()) {
        await lastNameInput.fill(this.applicantInfo.lastName);
        formData["lastName"] = this.applicantInfo.lastName;
        fieldsFound++;
        console.log("  ✓ Filled last name");
      }

      // Fill email
      const emailInput = await this.page.$('#email');
      if (emailInput && await emailInput.isVisible()) {
        await emailInput.fill(this.applicantInfo.email);
        formData["email"] = this.applicantInfo.email;
        fieldsFound++;
        console.log("  ✓ Filled email");
      }

      // Upload CV
      const cvInput = await this.page.$('#cv_or_resume');
      if (cvInput && await cvInput.isVisible()) {
        const cvPath = path.join(process.cwd(), this.applicantInfo.cvPath);
        if (fs.existsSync(cvPath)) {
          await cvInput.setInputFiles(cvPath);
          formData["cv"] = "CV uploaded";
          fieldsFound++;
          console.log("  ✓ CV uploaded");
        } else {
          console.log("  ⚠️  CV file not found at:", cvPath);
        }
      }

      // Check terms and conditions
      const termsCheckbox = await this.page.$('#terms');
      if (termsCheckbox && await termsCheckbox.isVisible()) {
        const isChecked = await termsCheckbox.isChecked();
        if (!isChecked) {
          await termsCheckbox.check();
          formData["terms"] = "accepted";
          fieldsFound++;
          console.log("  ✓ Accepted terms and conditions");
        }
      }

      if (fieldsFound === 0) {
        return {
          success: false,
          message: "No form fields found on Arbeitnow page",
        };
      }

      console.log(`  ✓ Filled ${fieldsFound} fields on Arbeitnow form`);
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
      // Look for the submit button
      const submitButton = await this.page.$('#button_send_application');
      
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
        const successIndicators = [
          'text=/thank you|thanks|vielen dank|erfolgreich|successfully/i',
          '.alert-success',
          '.success-message'
        ];
        
        for (const selector of successIndicators) {
          try {
            const element = await this.page.$(selector);
            if (element) {
              console.log("  ✅ Application submitted successfully!");
              return true;
            }
          } catch (error) {
            // Continue checking other selectors
          }
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