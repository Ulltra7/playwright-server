-- Populate technology_job_roles relationships
-- This script maps technologies to job roles with relevance scores (0-100)

-- Helper function to link technologies to roles
CREATE OR REPLACE FUNCTION link_technology_to_role(tech_name VARCHAR, role_name VARCHAR, score INTEGER DEFAULT 100)
RETURNS VOID AS $$
DECLARE
  tech_id UUID;
  role_id UUID;
BEGIN
  -- Get technology ID
  SELECT id INTO tech_id FROM technologies WHERE LOWER(name) = LOWER(tech_name);
  
  -- Get role ID
  SELECT id INTO role_id FROM job_roles WHERE name = role_name;
  
  -- Insert if both exist
  IF tech_id IS NOT NULL AND role_id IS NOT NULL THEN
    INSERT INTO technology_job_roles (technology_id, job_role_id, relevance_score)
    VALUES (tech_id, role_id, score)
    ON CONFLICT (technology_id, job_role_id) DO UPDATE
    SET relevance_score = EXCLUDED.relevance_score;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Frontend technologies
SELECT link_technology_to_role('React', 'frontend_developer', 100);
SELECT link_technology_to_role('React', 'fullstack_developer', 90);
SELECT link_technology_to_role('Angular', 'frontend_developer', 100);
SELECT link_technology_to_role('Angular', 'fullstack_developer', 90);
SELECT link_technology_to_role('Vue.js', 'frontend_developer', 100);
SELECT link_technology_to_role('Vue.js', 'fullstack_developer', 90);
SELECT link_technology_to_role('CSS', 'frontend_developer', 100);
SELECT link_technology_to_role('CSS', 'ux_ui_designer', 70);
SELECT link_technology_to_role('JavaScript', 'frontend_developer', 100);
SELECT link_technology_to_role('JavaScript', 'backend_developer', 80);
SELECT link_technology_to_role('JavaScript', 'fullstack_developer', 100);
SELECT link_technology_to_role('TypeScript', 'frontend_developer', 90);
SELECT link_technology_to_role('TypeScript', 'backend_developer', 90);
SELECT link_technology_to_role('TypeScript', 'fullstack_developer', 100);

-- Backend technologies
SELECT link_technology_to_role('Node.js', 'backend_developer', 100);
SELECT link_technology_to_role('Node.js', 'fullstack_developer', 90);
SELECT link_technology_to_role('Python', 'backend_developer', 100);
SELECT link_technology_to_role('Python', 'data_scientist', 100);
SELECT link_technology_to_role('Python', 'ai_ml_engineer', 100);
SELECT link_technology_to_role('Python', 'data_engineer', 90);
SELECT link_technology_to_role('Java', 'backend_developer', 100);
SELECT link_technology_to_role('C#', 'backend_developer', 100);
SELECT link_technology_to_role('.NET', 'backend_developer', 100);
SELECT link_technology_to_role('PHP', 'backend_developer', 100);
SELECT link_technology_to_role('Ruby', 'backend_developer', 100);

-- Database technologies
SELECT link_technology_to_role('PostgreSQL', 'backend_developer', 90);
SELECT link_technology_to_role('PostgreSQL', 'database_administrator', 100);
SELECT link_technology_to_role('PostgreSQL', 'data_engineer', 80);
SELECT link_technology_to_role('MySQL', 'backend_developer', 90);
SELECT link_technology_to_role('MySQL', 'database_administrator', 100);
SELECT link_technology_to_role('MongoDB', 'backend_developer', 90);
SELECT link_technology_to_role('MongoDB', 'fullstack_developer', 70);
SELECT link_technology_to_role('Redis', 'backend_developer', 80);
SELECT link_technology_to_role('Redis', 'devops_engineer', 70);

-- Mobile technologies
SELECT link_technology_to_role('React Native', 'mobile_developer', 100);
SELECT link_technology_to_role('React Native', 'frontend_developer', 60);
SELECT link_technology_to_role('Flutter', 'mobile_developer', 100);
SELECT link_technology_to_role('Swift', 'mobile_developer', 100);
SELECT link_technology_to_role('Kotlin', 'mobile_developer', 100);
SELECT link_technology_to_role('iOS', 'mobile_developer', 100);
SELECT link_technology_to_role('Android', 'mobile_developer', 100);

-- DevOps technologies
SELECT link_technology_to_role('Docker', 'devops_engineer', 100);
SELECT link_technology_to_role('Docker', 'backend_developer', 70);
SELECT link_technology_to_role('Docker', 'site_reliability_engineer', 90);
SELECT link_technology_to_role('Kubernetes', 'devops_engineer', 100);
SELECT link_technology_to_role('Kubernetes', 'site_reliability_engineer', 100);
SELECT link_technology_to_role('Kubernetes', 'cloud_architect', 90);
SELECT link_technology_to_role('Jenkins', 'devops_engineer', 100);
SELECT link_technology_to_role('Terraform', 'devops_engineer', 100);
SELECT link_technology_to_role('Terraform', 'cloud_architect', 100);

-- Cloud technologies
SELECT link_technology_to_role('AWS', 'cloud_architect', 100);
SELECT link_technology_to_role('AWS', 'devops_engineer', 90);
SELECT link_technology_to_role('AWS', 'backend_developer', 70);
SELECT link_technology_to_role('Azure', 'cloud_architect', 100);
SELECT link_technology_to_role('Azure', 'devops_engineer', 90);
SELECT link_technology_to_role('Google Cloud', 'cloud_architect', 100);
SELECT link_technology_to_role('Google Cloud', 'devops_engineer', 90);

-- Data science / AI technologies
SELECT link_technology_to_role('TensorFlow', 'data_scientist', 100);
SELECT link_technology_to_role('TensorFlow', 'ai_ml_engineer', 100);
SELECT link_technology_to_role('PyTorch', 'data_scientist', 100);
SELECT link_technology_to_role('PyTorch', 'ai_ml_engineer', 100);
SELECT link_technology_to_role('Pandas', 'data_scientist', 100);
SELECT link_technology_to_role('Pandas', 'data_analyst', 90);
SELECT link_technology_to_role('NumPy', 'data_scientist', 100);
SELECT link_technology_to_role('Jupyter', 'data_scientist', 90);
SELECT link_technology_to_role('Spark', 'data_engineer', 100);
SELECT link_technology_to_role('Spark', 'data_scientist', 70);
SELECT link_technology_to_role('Airflow', 'data_engineer', 100);

-- BI/Analytics technologies
SELECT link_technology_to_role('Tableau', 'data_analyst', 100);
SELECT link_technology_to_role('Tableau', 'business_intelligence_developer', 100);
SELECT link_technology_to_role('Power BI', 'data_analyst', 100);
SELECT link_technology_to_role('Power BI', 'business_intelligence_developer', 100);
SELECT link_technology_to_role('SQL', 'data_analyst', 100);
SELECT link_technology_to_role('SQL', 'backend_developer', 90);
SELECT link_technology_to_role('SQL', 'data_engineer', 100);

-- Testing technologies
SELECT link_technology_to_role('Jest', 'qa_engineer', 90);
SELECT link_technology_to_role('Jest', 'frontend_developer', 70);
SELECT link_technology_to_role('Cypress', 'qa_engineer', 100);
SELECT link_technology_to_role('Cypress', 'test_automation_engineer', 100);
SELECT link_technology_to_role('Selenium', 'qa_engineer', 100);
SELECT link_technology_to_role('Selenium', 'test_automation_engineer', 100);
SELECT link_technology_to_role('Playwright', 'test_automation_engineer', 100);
SELECT link_technology_to_role('JUnit', 'qa_engineer', 90);
SELECT link_technology_to_role('JUnit', 'backend_developer', 60);

-- Design technologies
SELECT link_technology_to_role('Figma', 'ux_ui_designer', 100);
SELECT link_technology_to_role('Figma', 'product_designer', 100);
SELECT link_technology_to_role('Sketch', 'ux_ui_designer', 100);
SELECT link_technology_to_role('Adobe XD', 'ux_ui_designer', 100);
SELECT link_technology_to_role('Photoshop', 'graphic_designer', 100);
SELECT link_technology_to_role('Photoshop', 'ux_ui_designer', 70);

-- Security technologies
SELECT link_technology_to_role('OWASP', 'security_engineer', 100);
SELECT link_technology_to_role('Burp Suite', 'penetration_tester', 100);
SELECT link_technology_to_role('Burp Suite', 'security_engineer', 90);
SELECT link_technology_to_role('Splunk', 'security_analyst', 100);
SELECT link_technology_to_role('Splunk', 'devops_engineer', 60);

-- Project management technologies
SELECT link_technology_to_role('Jira', 'project_manager', 90);
SELECT link_technology_to_role('Jira', 'scrum_master', 100);
SELECT link_technology_to_role('Jira', 'product_manager', 80);
SELECT link_technology_to_role('Confluence', 'project_manager', 80);
SELECT link_technology_to_role('Confluence', 'product_manager', 80);

-- Generic tools used by multiple roles
SELECT link_technology_to_role('Git', 'frontend_developer', 90);
SELECT link_technology_to_role('Git', 'backend_developer', 90);
SELECT link_technology_to_role('Git', 'fullstack_developer', 90);
SELECT link_technology_to_role('Git', 'mobile_developer', 90);
SELECT link_technology_to_role('Git', 'devops_engineer', 80);

-- Clean up the helper function
DROP FUNCTION IF EXISTS link_technology_to_role;