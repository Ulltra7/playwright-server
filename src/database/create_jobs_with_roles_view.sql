-- Create a view that includes job roles for each job
-- This view joins jobs with their technologies and associated roles

CREATE OR REPLACE VIEW jobs_with_roles AS
SELECT 
    ja.*,
    source.name as source_name,
    source.display_name as source_display_name,
    -- Get technologies as array
    COALESCE(
        array_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL),
        ARRAY[]::text[]
    ) as technologies,
    -- Get job roles as array
    COALESCE(
        array_agg(DISTINCT jr.name) FILTER (WHERE jr.name IS NOT NULL),
        ARRAY[]::text[]
    ) as job_roles
FROM job_applications ja
LEFT JOIN job_sources source ON ja.source_id = source.id
LEFT JOIN job_application_technologies jat ON ja.id = jat.job_application_id
LEFT JOIN technologies t ON jat.technology_id = t.id
LEFT JOIN technology_job_roles tjr ON t.id = tjr.technology_id
LEFT JOIN job_roles jr ON tjr.job_role_id = jr.id
GROUP BY 
    ja.id, 
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
    source.name,
    source.display_name;

-- Grant permissions
GRANT SELECT ON jobs_with_roles TO anon, authenticated;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_jobs_with_roles_job_roles ON job_application_technologies(job_application_id);
CREATE INDEX IF NOT EXISTS idx_technology_job_roles_tech ON technology_job_roles(technology_id);
CREATE INDEX IF NOT EXISTS idx_technology_job_roles_role ON technology_job_roles(job_role_id);