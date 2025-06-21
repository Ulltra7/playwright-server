-- Add job_roles column to technologies table
-- This column will store an array of job roles that typically use this technology

ALTER TABLE technologies 
ADD COLUMN job_roles TEXT[] DEFAULT '{}';

-- Update existing technologies with appropriate job roles
UPDATE technologies SET job_roles = 
  CASE 
    -- Frontend technologies
    WHEN name IN ('React', 'Angular', 'Vue.js', 'Svelte', 'jQuery', 'HTML', 'CSS', 'SASS', 'LESS', 'Bootstrap', 'Tailwind CSS', 'Material-UI', 'Webpack', 'Vite', 'Babel', 'Next.js', 'Nuxt.js', 'Gatsby') 
    THEN ARRAY['frontend_developer', 'fullstack_developer']
    
    -- Backend technologies
    WHEN name IN ('Node.js', 'Express.js', 'Django', 'Flask', 'FastAPI', 'Laravel', 'Spring', 'Spring Boot', '.NET', 'ASP.NET', 'Ruby on Rails', 'Golang', 'Rust', 'PHP', 'Java', 'C#', 'Python', 'Ruby') 
    THEN ARRAY['backend_developer', 'fullstack_developer']
    
    -- Database technologies
    WHEN name IN ('PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 'Cassandra', 'DynamoDB', 'SQLite', 'Oracle', 'SQL Server', 'MariaDB', 'Neo4j', 'CouchDB') 
    THEN ARRAY['backend_developer', 'fullstack_developer', 'data_engineer', 'database_administrator']
    
    -- Mobile technologies
    WHEN name IN ('React Native', 'Flutter', 'Swift', 'Kotlin', 'Ionic', 'Xamarin', 'Android', 'iOS', 'Objective-C') 
    THEN ARRAY['mobile_developer']
    
    -- DevOps/Cloud technologies
    WHEN name IN ('Docker', 'Kubernetes', 'AWS', 'Azure', 'Google Cloud', 'Terraform', 'Ansible', 'Jenkins', 'GitLab CI', 'GitHub Actions', 'CircleCI', 'Helm', 'Prometheus', 'Grafana', 'ELK Stack', 'Nginx', 'Apache') 
    THEN ARRAY['devops_engineer', 'site_reliability_engineer', 'cloud_architect']
    
    -- Data Science/AI technologies
    WHEN name IN ('TensorFlow', 'PyTorch', 'Scikit-learn', 'Keras', 'Pandas', 'NumPy', 'Jupyter', 'R', 'SAS', 'MATLAB', 'Spark', 'Hadoop', 'Airflow', 'Databricks', 'MLflow', 'Kubeflow') 
    THEN ARRAY['data_scientist', 'ai_ml_engineer', 'data_engineer']
    
    -- BI/Analytics technologies
    WHEN name IN ('Tableau', 'Power BI', 'Looker', 'Qlik', 'Snowflake', 'BigQuery', 'Redshift', 'dbt', 'Apache Superset') 
    THEN ARRAY['data_analyst', 'business_intelligence_developer', 'data_engineer']
    
    -- Testing technologies
    WHEN name IN ('Jest', 'Cypress', 'Selenium', 'Playwright', 'Mocha', 'Jasmine', 'JUnit', 'TestNG', 'Postman', 'JMeter', 'LoadRunner', 'Appium') 
    THEN ARRAY['qa_engineer', 'test_automation_engineer', 'sdet']
    
    -- Design technologies
    WHEN name IN ('Figma', 'Sketch', 'Adobe XD', 'Photoshop', 'Illustrator', 'InVision', 'Zeplin', 'Principle', 'Framer', 'After Effects') 
    THEN ARRAY['ux_ui_designer', 'product_designer', 'graphic_designer']
    
    -- Security technologies
    WHEN name IN ('OWASP', 'Burp Suite', 'Metasploit', 'Nessus', 'Wireshark', 'Kali Linux', 'SIEM', 'Splunk', 'CrowdStrike', 'Okta') 
    THEN ARRAY['security_engineer', 'security_analyst', 'penetration_tester']
    
    -- Project Management/Collaboration
    WHEN name IN ('Jira', 'Confluence', 'Trello', 'Asana', 'Monday.com', 'Slack', 'Microsoft Teams', 'Notion') 
    THEN ARRAY['project_manager', 'product_manager', 'scrum_master', 'it_manager']
    
    -- General programming concepts
    WHEN name IN ('Git', 'GitHub', 'GitLab', 'Bitbucket', 'SVN', 'Agile', 'Scrum', 'Kanban', 'CI/CD', 'REST API', 'GraphQL', 'Microservices') 
    THEN ARRAY['frontend_developer', 'backend_developer', 'fullstack_developer', 'devops_engineer', 'mobile_developer']
    
    ELSE ARRAY[]::TEXT[]
  END
WHERE job_roles IS NULL OR job_roles = '{}';

-- Add comment to explain the column
COMMENT ON COLUMN technologies.job_roles IS 'Array of job roles that typically use this technology. Possible values: frontend_developer, backend_developer, fullstack_developer, mobile_developer, devops_engineer, site_reliability_engineer, cloud_architect, data_scientist, ai_ml_engineer, data_engineer, data_analyst, business_intelligence_developer, qa_engineer, test_automation_engineer, sdet, ux_ui_designer, product_designer, graphic_designer, security_engineer, security_analyst, penetration_tester, database_administrator, project_manager, product_manager, scrum_master, it_manager';