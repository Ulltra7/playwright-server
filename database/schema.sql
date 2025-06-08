-- Job Applications Table Schema for Supabase (Normalized)
-- Run this in your Supabase SQL Editor to create the tables

-- 1. Job Sources Table
CREATE TABLE job_sources (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE, -- e.g., 'swissdevjobs', 'linkedin', 'indeed'
    display_name VARCHAR(100) NOT NULL, -- e.g., 'Swiss Dev Jobs', 'LinkedIn'
    base_url VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Technologies Table
CREATE TABLE technologies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE, -- e.g., 'TypeScript', 'React', 'Node.js'
    category VARCHAR(50), -- e.g., 'language', 'framework', 'database', 'tool'
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Job Applications Table
CREATE TABLE job_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Job Information
    job_title VARCHAR(255) NOT NULL,
    company VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    job_url VARCHAR(500) NOT NULL UNIQUE, -- Prevent duplicate URLs
    salary VARCHAR(100),
    description TEXT,
    requirements TEXT,
    source_id UUID NOT NULL REFERENCES job_sources(id),
    scraped_at TIMESTAMPTZ NOT NULL,
    
    -- Application Tracking
    application_status VARCHAR(50) DEFAULT 'not_applied' CHECK (
        application_status IN (
            'not_applied',
            'applied', 
            'interview_scheduled',
            'interview_completed',
            'offer_received',
            'rejected',
            'withdrawn'
        )
    ),
    applied_at TIMESTAMPTZ,
    interview_date TIMESTAMPTZ,
    notes TEXT,
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Junction Table for Job-Technology Many-to-Many Relationship
CREATE TABLE job_application_technologies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
    technology_id UUID NOT NULL REFERENCES technologies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique combinations
    UNIQUE(job_application_id, technology_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_job_applications_status ON job_applications(application_status);
CREATE INDEX idx_job_applications_company ON job_applications(company);
CREATE INDEX idx_job_applications_source_id ON job_applications(source_id);
CREATE INDEX idx_job_applications_priority ON job_applications(priority);
CREATE INDEX idx_job_applications_created_at ON job_applications(created_at);
CREATE INDEX idx_job_applications_scraped_at ON job_applications(scraped_at);
CREATE INDEX idx_job_applications_job_title ON job_applications(job_title);

-- Indexes for technologies and junction table
CREATE INDEX idx_technologies_name ON technologies(name);
CREATE INDEX idx_technologies_category ON technologies(category);
CREATE INDEX idx_job_tech_job_id ON job_application_technologies(job_application_id);
CREATE INDEX idx_job_tech_tech_id ON job_application_technologies(technology_id);

-- Index for job sources
CREATE INDEX idx_job_sources_name ON job_sources(name);
CREATE INDEX idx_job_sources_active ON job_sources(is_active);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_job_applications_updated_at 
    BEFORE UPDATE ON job_applications 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Optional: Create a view for job statistics with technology information
CREATE VIEW job_stats AS
SELECT 
    COUNT(*) as total_jobs,
    COUNT(*) FILTER (WHERE application_status = 'not_applied') as not_applied,
    COUNT(*) FILTER (WHERE application_status = 'applied') as applied,
    COUNT(*) FILTER (WHERE application_status IN ('interview_scheduled', 'interview_completed')) as interviews,
    COUNT(*) FILTER (WHERE application_status = 'offer_received') as offers,
    COUNT(*) FILTER (WHERE application_status = 'rejected') as rejected,
    COUNT(*) FILTER (WHERE application_status = 'withdrawn') as withdrawn,
    COUNT(DISTINCT source_id) as total_sources,
    COUNT(DISTINCT company) as total_companies
FROM job_applications;

-- View for jobs with their technologies (for easy querying)
CREATE VIEW jobs_with_technologies AS
SELECT 
    ja.id,
    ja.job_title,
    ja.company,
    ja.location,
    ja.job_url,
    ja.salary,
    ja.application_status,
    ja.priority,
    ja.applied_at,
    ja.interview_date,
    ja.notes,
    ja.scraped_at,
    ja.created_at,
    ja.updated_at,
    js.name as source_name,
    js.display_name as source_display_name,
    ARRAY_AGG(t.name ORDER BY t.name) as technologies
FROM job_applications ja
LEFT JOIN job_sources js ON ja.source_id = js.id
LEFT JOIN job_application_technologies jat ON ja.id = jat.job_application_id
LEFT JOIN technologies t ON jat.technology_id = t.id
GROUP BY ja.id, js.name, js.display_name;

-- Insert default job sources
INSERT INTO job_sources (name, display_name, base_url) VALUES 
('swissdevjobs', 'Swiss Dev Jobs', 'https://swissdevjobs.ch/'),
('linkedin', 'LinkedIn', 'https://linkedin.com/'),
('indeed', 'Indeed', 'https://indeed.com/'),
('xing', 'Xing', 'https://xing.com/'),
('jobs_ch', 'Jobs.ch', 'https://jobs.ch/');

-- Insert common technologies
INSERT INTO technologies (name, category) VALUES 
-- Programming Languages
('TypeScript', 'language'),
('JavaScript', 'language'),
('Python', 'language'),
('Java', 'language'),
('C#', 'language'),
('PHP', 'language'),
('Go', 'language'),
('Rust', 'language'),
('Kotlin', 'language'),
('Swift', 'language'),

-- Frontend Frameworks/Libraries
('React', 'framework'),
('Vue.js', 'framework'),
('Angular', 'framework'),
('Svelte', 'framework'),
('Next.js', 'framework'),
('Nuxt.js', 'framework'),

-- Backend Frameworks
('Node.js', 'framework'),
('Express.js', 'framework'),
('Django', 'framework'),
('FastAPI', 'framework'),
('Spring Boot', 'framework'),
('Laravel', 'framework'),
('.NET', 'framework'),

-- Databases
('PostgreSQL', 'database'),
('MySQL', 'database'),
('MongoDB', 'database'),
('Redis', 'database'),
('SQLite', 'database'),
('Oracle', 'database'),

-- Cloud & DevOps
('AWS', 'cloud'),
('Azure', 'cloud'),
('Google Cloud', 'cloud'),
('Docker', 'tool'),
('Kubernetes', 'tool'),
('Jenkins', 'tool'),
('GitLab CI', 'tool'),
('GitHub Actions', 'tool'),

-- Tools & Others
('Git', 'tool'),
('Webpack', 'tool'),
('Vite', 'tool'),
('GraphQL', 'tool'),
('REST API', 'tool'),
('Microservices', 'architecture'),
('Agile', 'methodology'),
('Scrum', 'methodology');
