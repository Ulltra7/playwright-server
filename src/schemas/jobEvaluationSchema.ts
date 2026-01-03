import { z } from "zod";

export const remoteWorkTypeSchema = z.enum([
  "remote",
  "hybrid",
  "onsite",
  "unknown",
]);

export const seniorityLevelSchema = z.enum([
  "junior",
  "mid",
  "senior",
  "lead",
  "unknown",
]);

export const jobEvaluationSchema = z.object({
  // Remote assessment
  remote_type: remoteWorkTypeSchema.describe(
    "The remote work policy: remote (fully remote), hybrid (mix of office and remote), onsite (office only), unknown (not specified)"
  ),
  remote_days_per_week: z
    .number()
    .min(0)
    .max(5)
    .nullable()
    .describe(
      "For hybrid roles, estimated days per week working from home. Null if fully remote, onsite, or unknown."
    ),
  remote_score: z
    .number()
    .min(1)
    .max(5)
    .describe(
      "Score 1-5 based on remote friendliness. 5=fully remote, 4=hybrid 4+ days, 3=hybrid 2-3 days, 2=hybrid 1 day, 1=onsite only"
    ),

  // Tech match
  matched_technologies: z
    .array(z.string())
    .describe(
      "List of technologies from the job that match the candidate's skills"
    ),
  tech_match_score: z
    .number()
    .min(1)
    .max(5)
    .describe(
      "Score 1-5 based on technology match. 5=perfect match with primary stack, 4=good match, 3=partial match, 2=few matches, 1=no match"
    ),

  // Seniority
  seniority: seniorityLevelSchema.describe(
    "The seniority level required: junior (0-2 yrs), mid (2-5 yrs), senior (5-8 yrs), lead (8+ yrs)"
  ),
  seniority_match: z
    .boolean()
    .describe(
      "True if the role matches senior/lead level (candidate has 8 years experience)"
    ),

  // Language requirements
  required_languages: z
    .array(z.string())
    .describe("Languages explicitly required in the job posting"),
  language_match: z
    .boolean()
    .describe(
      "True if candidate speaks all required languages (German, English, French available)"
    ),

  // Domain relevance
  domain_relevance_score: z
    .number()
    .min(1)
    .max(5)
    .describe(
      "Score 1-5 based on domain fit. 5=fintech/trading/AI, 4=related tech domain, 3=general tech, 2=non-tech domain, 1=unrelated"
    ),

  // Overall assessment
  overall_score: z
    .number()
    .min(1)
    .max(10)
    .describe(
      "Overall fit score 1-10 considering all factors weighted by importance"
    ),
  is_interesting: z
    .boolean()
    .describe(
      "True if the job is worth applying to (overall_score >= 7 and remote_score >= 4)"
    ),
  ai_reasoning: z
    .string()
    .describe(
      "Brief explanation of the evaluation, highlighting key pros and cons"
    ),
});

export type JobEvaluation = z.infer<typeof jobEvaluationSchema>;
