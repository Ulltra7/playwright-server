-- Create a view that includes job role information for each job
-- This allows filtering jobs by role based on their technologies

CREATE OR REPLACE VIEW jobs_with_roles AS
WITH job_role_scores AS (
  SELECT 
    ja.id as job_id,
    ja.job_title,
    ja.company,
    ja.location,
    ja.job_url,
    ja.salary,
    ja.description,
    ja.requirements,
    ja.source_id,
    ja.scraped_at,
    ja.application_status,
    ja.applied_at,
    ja.interview_date,
    ja.notes,
    ja.priority,
    ja.created_at,
    ja.updated_at,
    jr.id as role_id,
    jr.name as role_name,
    jr.display_name as role_display_name,
    SUM(COALESCE(tjr.relevance_score, 0)) as role_score,
    COUNT(DISTINCT jat.technology_id) as matching_tech_count
  FROM job_applications ja
  LEFT JOIN job_application_technologies jat ON ja.id = jat.job_application_id
  LEFT JOIN technology_job_roles tjr ON jat.technology_id = tjr.technology_id
  LEFT JOIN job_roles jr ON tjr.job_role_id = jr.id
  GROUP BY 
    ja.id, ja.job_title, ja.company, ja.location, ja.job_url, ja.salary,
    ja.description, ja.requirements, ja.source_id, ja.scraped_at,
    ja.application_status, ja.applied_at, ja.interview_date, ja.notes,
    ja.priority, ja.created_at, ja.updated_at, jr.id, jr.name, jr.display_name
),
ranked_roles AS (
  SELECT 
    *,
    ROW_NUMBER() OVER (PARTITION BY job_id ORDER BY role_score DESC) as role_rank
  FROM job_role_scores
  WHERE role_id IS NOT NULL
)
SELECT 
  j.*,
  -- Include role information
  COALESCE(
    (SELECT json_agg(
      json_build_object(
        'role_id', rr.role_id,
        'role_name', rr.role_name,
        'role_display_name', rr.role_display_name,
        'score', rr.role_score,
        'rank', rr.role_rank
      ) ORDER BY rr.role_rank
    )
    FROM ranked_roles rr 
    WHERE rr.job_id = j.id AND rr.role_score > 0),
    '[]'::json
  ) as job_roles,
  -- Primary role (highest scoring)
  (SELECT rr.role_name FROM ranked_roles rr WHERE rr.job_id = j.id AND rr.role_rank = 1) as primary_role_name,
  (SELECT rr.role_display_name FROM ranked_roles rr WHERE rr.job_id = j.id AND rr.role_rank = 1) as primary_role_display_name,
  (SELECT rr.role_score FROM ranked_roles rr WHERE rr.job_id = j.id AND rr.role_rank = 1) as primary_role_score,
  -- Include existing technology array
  (SELECT ARRAY_AGG(DISTINCT t.name ORDER BY t.name)
   FROM job_application_technologies jat
   JOIN technologies t ON jat.technology_id = t.id
   WHERE jat.job_application_id = j.id
  ) as technologies,
  -- Include source information
  s.name as source_name,
  s.display_name as source_display_name
FROM job_applications j
LEFT JOIN job_sources s ON j.source_id = s.id;

-- Create an index for better performance when filtering by role
CREATE INDEX IF NOT EXISTS idx_job_application_technologies_job_id 
ON job_application_technologies(job_application_id);

CREATE INDEX IF NOT EXISTS idx_technology_job_roles_technology_id 
ON technology_job_roles(technology_id);