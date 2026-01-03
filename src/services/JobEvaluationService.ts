import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { SupabaseService, Job } from "./SupabaseService";
import {
  jobEvaluationSchema,
  JobEvaluation,
} from "../schemas/jobEvaluationSchema";
import { getJobEvaluationPrompt } from "../prompts/jobEvaluationPrompt";

export interface JobForEvaluation extends Job {
  technologies?: Array<{ id: string; name: string; category?: string }>;
}

export class JobEvaluationService {
  private supabaseService: SupabaseService;

  constructor() {
    this.supabaseService = new SupabaseService();
  }

  /**
   * Evaluate all active jobs from all sources
   */
  async evaluateAllActiveJobs(options?: { forceRewrite?: boolean }): Promise<void> {
    const { forceRewrite = false } = options || {};

    try {
      const jobs = await this.getAllActiveJobs();
      console.log(`Found ${jobs.length} active jobs to evaluate`);

      let jobsToEvaluate: JobForEvaluation[];

      if (forceRewrite) {
        jobsToEvaluate = jobs;
        console.log(`Force rewrite: will re-evaluate all ${jobs.length} jobs`);
      } else {
        jobsToEvaluate = await this.filterUnevaluatedJobs(jobs);
        console.log(`${jobsToEvaluate.length} jobs need evaluation`);
      }

      for (const job of jobsToEvaluate) {
        try {
          console.log(`Evaluating: ${job.job_title} at ${job.company}`);
          const evaluation = await this.evaluateJob(job);
          await this.saveEvaluation(job.id!, evaluation, forceRewrite);
          console.log(
            `  -> Score: ${evaluation.overall_score}/10, Interesting: ${evaluation.is_interesting}`
          );
        } catch (error) {
          console.error(`Error evaluating job ${job.id}:`, error);
        }
      }

      console.log("Job evaluation complete");
    } catch (error) {
      console.error("Error in evaluateAllActiveJobs:", error);
      throw error;
    }
  }

  /**
   * Evaluate all active SwissDevJobs and save results to database
   * @deprecated Use evaluateAllActiveJobs instead
   */
  async evaluateSwissDevJobs(options?: { forceRewrite?: boolean }): Promise<void> {
    return this.evaluateAllActiveJobs(options);
  }

  /**
   * Evaluate a single job using AI
   */
  async evaluateJob(job: JobForEvaluation): Promise<JobEvaluation> {
    const prompt = getJobEvaluationPrompt({
      job_title: job.job_title,
      company: job.company,
      location: job.location,
      description: job.description,
      requirements: job.requirements,
      salary: job.salary,
      technologies: job.technologies,
    });

    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: jobEvaluationSchema,
      prompt,
    });

    return object;
  }

  /**
   * Filter out jobs that have already been evaluated
   */
  private async filterUnevaluatedJobs(
    jobs: JobForEvaluation[]
  ): Promise<JobForEvaluation[]> {
    if (jobs.length === 0) return [];

    const jobIds = jobs.map((j) => j.id).filter(Boolean);

    const { data: existingEvaluations } =
      await this.supabaseService.supabase
        .from("job_evaluations")
        .select("job_id")
        .in("job_id", jobIds);

    const evaluatedIds = new Set(
      existingEvaluations?.map((e) => e.job_id) || []
    );

    return jobs.filter((job) => !evaluatedIds.has(job.id));
  }

  /**
   * Save evaluation result to database
   */
  private async saveEvaluation(
    jobId: string,
    evaluation: JobEvaluation,
    upsert: boolean = false
  ): Promise<void> {
    const data = {
      job_id: jobId,
      remote_type: evaluation.remote_type,
      remote_days_per_week: evaluation.remote_days_per_week,
      remote_score: evaluation.remote_score,
      matched_technologies: evaluation.matched_technologies,
      tech_match_score: evaluation.tech_match_score,
      seniority: evaluation.seniority,
      seniority_match: evaluation.seniority_match,
      required_languages: evaluation.required_languages,
      language_match: evaluation.language_match,
      domain_relevance_score: evaluation.domain_relevance_score,
      overall_score: evaluation.overall_score,
      is_interesting: evaluation.is_interesting,
      ai_reasoning: evaluation.ai_reasoning,
      evaluated_at: new Date().toISOString(),
    };

    let error;

    if (upsert) {
      const result = await this.supabaseService.supabase
        .from("job_evaluations")
        .upsert(data, { onConflict: "job_id" });
      error = result.error;
    } else {
      const result = await this.supabaseService.supabase
        .from("job_evaluations")
        .insert(data);
      error = result.error;
    }

    if (error) {
      console.error("Error saving evaluation:", error);
      throw error;
    }
  }

  /**
   * Get all interesting jobs (already evaluated with is_interesting = true)
   */
  async getInterestingJobs(): Promise<any[]> {
    const { data, error } = await this.supabaseService.supabase
      .from("job_evaluations")
      .select(
        `
        *,
        jobs (
          id,
          job_title,
          company,
          location,
          job_url,
          salary,
          job_sources (
            name,
            display_name
          )
        )
      `
      )
      .eq("is_interesting", true)
      .order("overall_score", { ascending: false });

    if (error) {
      console.error("Error fetching interesting jobs:", error);
      return [];
    }

    return data || [];
  }

  /**
   * Fetches all active jobs from all sources for AI evaluation
   */
  async getAllActiveJobs(): Promise<JobForEvaluation[]> {
    try {
      const { data: jobs, error } = await this.supabaseService.supabase
        .from("jobs")
        .select(
          `
          *,
          job_technologies (
            technologies (
              id,
              name,
              category
            )
          ),
          job_sources (
            name,
            display_name
          )
        `
        )
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching active jobs:", error);
        return [];
      }

      return (jobs || []).map((job) => ({
        ...job,
        technologies:
          job.job_technologies
            ?.map((jt: any) => jt.technologies)
            .filter(Boolean) || [],
      }));
    } catch (error) {
      console.error("Error in getAllActiveJobs:", error);
      return [];
    }
  }

  /**
   * Fetches all active jobs from a specific source
   */
  async getActiveJobsBySource(sourceName: string): Promise<JobForEvaluation[]> {
    try {
      const sourceId =
        await this.supabaseService.getOrCreateJobSource(sourceName);

      if (!sourceId) {
        console.error(`${sourceName} source not found`);
        return [];
      }

      const { data: jobs, error } = await this.supabaseService.supabase
        .from("jobs")
        .select(
          `
          *,
          job_technologies (
            technologies (
              id,
              name,
              category
            )
          )
        `
        )
        .eq("source_id", sourceId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(`Error fetching active ${sourceName} jobs:`, error);
        return [];
      }

      return (jobs || []).map((job) => ({
        ...job,
        technologies:
          job.job_technologies
            ?.map((jt: any) => jt.technologies)
            .filter(Boolean) || [],
      }));
    } catch (error) {
      console.error(`Error in getActiveJobsBySource(${sourceName}):`, error);
      return [];
    }
  }

  /**
   * @deprecated Use getAllActiveJobs instead
   */
  async getActiveSwissDevJobs(): Promise<JobForEvaluation[]> {
    return this.getActiveJobsBySource("swissdevjobs");
  }
}

export default JobEvaluationService;
