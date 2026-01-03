import { JOB_PREFERENCES } from "../config/jobPreferences";

const YOUR_PROFILE = `
## Your Profile

**Experience:** 8 years as a fullstack developer
**Current Role:** Lead Fullstack Developer
**Location:** Lucerne, Switzerland

**Primary Technologies (Expert):**
${JOB_PREFERENCES.technologies.primary.join(", ")}

**Secondary Technologies (Proficient):**
${JOB_PREFERENCES.technologies.secondary.join(", ")}

**Familiar With:**
${JOB_PREFERENCES.technologies.familiar.join(", ")}

**Languages Spoken:**
${JOB_PREFERENCES.languages.join(", ")} (all fluent)

**Domain Experience:**
- Fintech/Trading (21Shares AG - crypto ETPs, market maker trading apps)
- Trading firm - senior frontend developer in React
- Frontend React + backend Node.js for liquidity provider (Web3)
- AI Platforms (TUM Munich - research platform with generative AI)
- Low-code/SaaS (Draftbit - mobile app builder)
- Job platform - frontend developer in Angular
- Playwright automation for car sharing app
- Banking (Vontobel - robo advisor)

**Preferred Roles:** ${JOB_PREFERENCES.roles.target.join(", ")}

**Remote Preference:**
- Ideally fully remote
- Hybrid acceptable if ${JOB_PREFERENCES.remote.minRemoteDaysPerWeek}+ days from home
- Onsite only is not acceptable
`;

export const getJobEvaluationPrompt = (job: {
  job_title: string;
  company: string;
  location: string;
  description?: string;
  requirements?: string;
  salary?: string;
  technologies?: Array<{ name: string }>;
}) => {
  const techList = job.technologies?.map((t) => t.name).join(", ") || "Not specified";

  return `You are evaluating a job posting for me. Check how well this job matches my profile and preferences.

${YOUR_PROFILE}

---

## Job to Evaluate

**Title:** ${job.job_title}
**Company:** ${job.company}
**Location:** ${job.location}
**Salary:** ${job.salary || "Not specified"}
**Listed Technologies:** ${techList}

**Description:**
${job.description || "No description available"}

**Requirements:**
${job.requirements || "No requirements listed"}

---

## Evaluation Instructions

1. **Remote Work (MOST IMPORTANT):** Look for keywords like "remote", "hybrid", "home office", "work from home", "on-site", "office-based". Swiss/German jobs may use "Homeoffice" or "Remote-Arbeit". Fully remote jobs are highly preferred.

2. **Technology Match:** Compare job requirements against my primary (expert), secondary (proficient), and familiar technologies.

3. **Seniority:** Determine if this is junior/mid/senior/lead based on years required and responsibility level. Note: This is informational only - don't penalize the score for seniority mismatch.

4. **Languages:** Check if specific languages are required. I speak German, English, and French fluently. Note: This is informational only - don't penalize the score for language requirements.

5. **Domain:** Rate relevance to fintech, trading, AI, Web3, or SaaS domains.

6. **Overall Score:** Weight factors by importance:
   - Remote policy: 50% (THIS IS THE PRIMARY FACTOR)
   - Tech/role match: 35%
   - Domain relevance: 15%
   - Seniority and language: 0% (informational only, do not affect score)

**IMPORTANT SCORING RULES:**
- A fully remote job with mediocre tech match should still score 7+/10
- A fully remote job that's slightly outside your comfort zone (e.g., data scientist, devops) should score 6-7/10 if you could reasonably adapt
- An onsite-only job, even with perfect tech match, should score max 4/10
- Hybrid with 4+ days remote and good tech match should score 7-8/10
- Do NOT penalize jobs for requiring specific seniority levels or languages

**Mark as "interesting" (is_interesting = true) if:**
- Fully remote AND any reasonable tech overlap (score >= 6)
- Hybrid 4+ days AND good tech match (score >= 7)
- Never mark onsite-only jobs as interesting`;
};
