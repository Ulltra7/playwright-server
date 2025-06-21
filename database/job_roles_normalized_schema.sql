-- Create job_roles table
CREATE TABLE IF NOT EXISTS job_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert job roles
INSERT INTO job_roles (name, display_name, description) VALUES
-- Development roles
('frontend_developer', 'Frontend Developer', 'Specializes in client-side web development'),
('backend_developer', 'Backend Developer', 'Focuses on server-side development'),
('fullstack_developer', 'Full Stack Developer', 'Works on both frontend and backend'),
('mobile_developer', 'Mobile Developer', 'Develops mobile applications'),

-- Data & AI roles
('data_scientist', 'Data Scientist', 'Analyzes data and builds ML models'),
('data_engineer', 'Data Engineer', 'Builds data pipelines and infrastructure'),
('ai_ml_engineer', 'AI/ML Engineer', 'Specializes in AI/ML systems'),
('data_analyst', 'Data Analyst', 'Analyzes business data'),
('business_intelligence_developer', 'BI Developer', 'Creates BI solutions and dashboards'),

-- Infrastructure & Operations
('devops_engineer', 'DevOps Engineer', 'Manages CI/CD and deployment'),
('site_reliability_engineer', 'Site Reliability Engineer', 'Ensures system reliability'),
('cloud_architect', 'Cloud Architect', 'Designs cloud infrastructure'),
('database_administrator', 'Database Administrator', 'Manages database systems'),

-- Quality & Security
('qa_engineer', 'QA Engineer', 'Tests software quality'),
('test_automation_engineer', 'Test Automation Engineer', 'Specializes in test automation'),
('sdet', 'SDET', 'Software Development Engineer in Test'),
('security_engineer', 'Security Engineer', 'Implements security measures'),
('security_analyst', 'Security Analyst', 'Analyzes security threats'),
('penetration_tester', 'Penetration Tester', 'Tests systems for vulnerabilities'),

-- Design & Product
('ux_ui_designer', 'UX/UI Designer', 'Designs user interfaces and experiences'),
('product_designer', 'Product Designer', 'Overall product design'),
('graphic_designer', 'Graphic Designer', 'Creates visual designs'),

-- Management & Leadership
('project_manager', 'Project Manager', 'Manages project timelines and resources'),
('product_manager', 'Product Manager', 'Defines product strategy'),
('scrum_master', 'Scrum Master', 'Facilitates agile processes'),
('it_manager', 'IT Manager', 'Manages IT teams and resources');

-- Create technology_job_roles junction table
CREATE TABLE IF NOT EXISTS technology_job_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  technology_id UUID NOT NULL REFERENCES technologies(id) ON DELETE CASCADE,
  job_role_id UUID NOT NULL REFERENCES job_roles(id) ON DELETE CASCADE,
  relevance_score INTEGER DEFAULT 100 CHECK (relevance_score >= 0 AND relevance_score <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(technology_id, job_role_id)
);

-- Create indexes for better performance
CREATE INDEX idx_technology_job_roles_tech ON technology_job_roles(technology_id);
CREATE INDEX idx_technology_job_roles_role ON technology_job_roles(job_role_id);

-- Create a view to easily see technology-role relationships
CREATE OR REPLACE VIEW technology_roles_view AS
SELECT 
  t.id as technology_id,
  t.name as technology_name,
  t.category as technology_category,
  jr.id as job_role_id,
  jr.name as job_role_name,
  jr.display_name as job_role_display_name,
  tjr.relevance_score
FROM technologies t
JOIN technology_job_roles tjr ON t.id = tjr.technology_id
JOIN job_roles jr ON tjr.job_role_id = jr.id
ORDER BY t.name, tjr.relevance_score DESC;

-- Create a function to get job role scores for a job based on its technologies
CREATE OR REPLACE FUNCTION calculate_job_role_scores(job_id UUID)
RETURNS TABLE (
  job_role_id UUID,
  job_role_name VARCHAR(50),
  job_role_display_name VARCHAR(100),
  total_score BIGINT,
  technology_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    jr.id,
    jr.name,
    jr.display_name,
    SUM(tjr.relevance_score) as total_score,
    COUNT(DISTINCT jat.technology_id) as technology_count
  FROM job_application_technologies jat
  JOIN technology_job_roles tjr ON jat.technology_id = tjr.technology_id
  JOIN job_roles jr ON tjr.job_role_id = jr.id
  WHERE jat.job_application_id = job_id
  GROUP BY jr.id, jr.name, jr.display_name
  ORDER BY total_score DESC;
END;
$$ LANGUAGE plpgsql;

-- Create a view for jobs with their most likely role
CREATE OR REPLACE VIEW jobs_with_primary_role AS
WITH job_role_scores AS (
  SELECT 
    ja.id,
    ja.job_title,
    ja.company,
    jr.id as job_role_id,
    jr.name as job_role_name,
    jr.display_name as job_role_display_name,
    SUM(tjr.relevance_score) as total_score,
    ROW_NUMBER() OVER (PARTITION BY ja.id ORDER BY SUM(tjr.relevance_score) DESC) as rn
  FROM job_applications ja
  LEFT JOIN job_application_technologies jat ON ja.id = jat.job_application_id
  LEFT JOIN technology_job_roles tjr ON jat.technology_id = tjr.technology_id
  LEFT JOIN job_roles jr ON tjr.job_role_id = jr.id
  GROUP BY ja.id, ja.job_title, ja.company, jr.id, jr.name, jr.display_name
)
SELECT 
  id,
  job_title,
  company,
  job_role_id,
  job_role_name,
  job_role_display_name,
  total_score
FROM job_role_scores
WHERE rn = 1;

-- Function to get jobs by role
CREATE OR REPLACE FUNCTION get_jobs_by_role(role_name VARCHAR(50), min_score INTEGER DEFAULT 50)
RETURNS TABLE (
  job_id UUID,
  job_title VARCHAR(255),
  company VARCHAR(255),
  location VARCHAR(255),
  job_url TEXT,
  scraped_at TIMESTAMP WITH TIME ZONE,
  role_score BIGINT,
  matching_technologies TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ja.id,
    ja.job_title,
    ja.company,
    ja.location,
    ja.job_url,
    ja.scraped_at,
    SUM(tjr.relevance_score) as role_score,
    ARRAY_AGG(DISTINCT t.name ORDER BY t.name) as matching_technologies
  FROM job_applications ja
  JOIN job_application_technologies jat ON ja.id = jat.job_application_id
  JOIN technology_job_roles tjr ON jat.technology_id = tjr.technology_id
  JOIN job_roles jr ON tjr.job_role_id = jr.id
  JOIN technologies t ON jat.technology_id = t.id
  WHERE jr.name = role_name
  GROUP BY ja.id, ja.job_title, ja.company, ja.location, ja.job_url, ja.scraped_at
  HAVING SUM(tjr.relevance_score) >= min_score
  ORDER BY role_score DESC;
END;
$$ LANGUAGE plpgsql;