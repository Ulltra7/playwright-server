-- Create a view to track job postings by role and week
CREATE OR REPLACE VIEW job_roles_weekly AS
WITH job_role_data AS (
  -- Get all jobs with their technology roles
  SELECT DISTINCT
    ja.id,
    ja.job_title,
    ja.company,
    ja.scraped_at,
    DATE_TRUNC('week', ja.scraped_at) as week_start,
    TO_CHAR(DATE_TRUNC('week', ja.scraped_at), 'YYYY-MM-DD') as week_label,
    COALESCE(
      tr.parent_role,
      tr.role_name,
      CASE 
        WHEN ja.job_title ILIKE '%frontend%' OR ja.job_title ILIKE '%front-end%' THEN 'Web Developer'
        WHEN ja.job_title ILIKE '%backend%' OR ja.job_title ILIKE '%back-end%' THEN 'Web Developer'
        WHEN ja.job_title ILIKE '%fullstack%' OR ja.job_title ILIKE '%full-stack%' THEN 'Web Developer'
        WHEN ja.job_title ILIKE '%data scientist%' OR ja.job_title ILIKE '%data analyst%' THEN 'Data Scientist'
        WHEN ja.job_title ILIKE '%manager%' THEN 'IT Manager'
        WHEN ja.job_title ILIKE '%designer%' OR ja.job_title ILIKE '%ux%' THEN 'Designer'
        WHEN ja.job_title ILIKE '%devops%' THEN 'DevOps Engineer'
        WHEN ja.job_title ILIKE '%mobile%' OR ja.job_title ILIKE '%ios%' OR ja.job_title ILIKE '%android%' THEN 'Mobile Developer'
        WHEN ja.job_title ILIKE '%qa%' OR ja.job_title ILIKE '%test%' THEN 'QA Engineer'
        WHEN ja.job_title ILIKE '%security%' THEN 'Security Engineer'
        ELSE 'Other IT'
      END
    ) as main_role
  FROM job_applications ja
  LEFT JOIN job_application_technologies jat ON ja.id = jat.job_application_id
  LEFT JOIN technologies t ON jat.technology_id = t.id
  LEFT JOIN technology_job_roles tjr ON t.id = tjr.technology_id
  LEFT JOIN job_roles jr ON tjr.job_role_id = jr.id
  LEFT JOIN technology_roles tr ON jr.name = tr.name
),
role_aggregation AS (
  -- Group by main roles
  SELECT 
    week_start,
    week_label,
    main_role,
    COUNT(DISTINCT id) as job_count
  FROM job_role_data
  GROUP BY week_start, week_label, main_role
)
SELECT 
  week_start,
  week_label,
  main_role,
  job_count,
  -- Calculate week-over-week change
  LAG(job_count, 1) OVER (PARTITION BY main_role ORDER BY week_start) as previous_week_count,
  job_count - LAG(job_count, 1) OVER (PARTITION BY main_role ORDER BY week_start) as week_change,
  -- Calculate percentage change
  CASE 
    WHEN LAG(job_count, 1) OVER (PARTITION BY main_role ORDER BY week_start) > 0 
    THEN ROUND(((job_count::numeric - LAG(job_count, 1) OVER (PARTITION BY main_role ORDER BY week_start)) / LAG(job_count, 1) OVER (PARTITION BY main_role ORDER BY week_start) * 100), 1)
    ELSE NULL
  END as percentage_change
FROM role_aggregation
ORDER BY week_start DESC, job_count DESC;

-- Create an index for better performance
CREATE INDEX IF NOT EXISTS idx_job_applications_scraped_at ON job_applications(scraped_at);

-- Create a summary view for the current week
CREATE OR REPLACE VIEW job_roles_current_week AS
SELECT 
  main_role,
  job_count,
  previous_week_count,
  week_change,
  percentage_change,
  RANK() OVER (ORDER BY job_count DESC) as popularity_rank
FROM job_roles_weekly
WHERE week_start = DATE_TRUNC('week', CURRENT_DATE)
ORDER BY job_count DESC;

-- Create a trend view showing last 4 weeks
CREATE OR REPLACE VIEW job_roles_trend AS
SELECT 
  main_role,
  week_label,
  job_count,
  week_change,
  percentage_change
FROM job_roles_weekly
WHERE week_start >= DATE_TRUNC('week', CURRENT_DATE - INTERVAL '3 weeks')
ORDER BY main_role, week_start DESC;