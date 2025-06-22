import { Page } from "playwright";
import { JobApplication } from "../SupabaseService";
import { ApplicantInfo } from "../../config/applicant.config";

export interface ApplicationFormData {
  [key: string]: string;
}

export interface ApplicationResult {
  success: boolean;
  message: string;
  formData?: ApplicationFormData;
  submitted?: boolean;
}

export abstract class JobSiteHandler {
  protected page: Page;
  protected applicantInfo: ApplicantInfo;
  protected jobId: string;

  constructor(page: Page, applicantInfo: ApplicantInfo, jobId: string) {
    this.page = page;
    this.applicantInfo = applicantInfo;
    this.jobId = jobId;
  }

  /**
   * Check if this handler can handle the given job URL
   */
  abstract canHandle(url: string): boolean;

  /**
   * Handle the job application process for this site
   */
  abstract apply(job: JobApplication): Promise<ApplicationResult>;

  /**
   * Get the name of the job site this handler is for
   */
  abstract getSiteName(): string;

  /**
   * Update application status in database before submission
   */
  public updateApplicationStatus?(
    status: "applied" | "rejected" | "interview_scheduled"
  ): Promise<void>;
}