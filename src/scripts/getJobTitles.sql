-- Query to get all unique job titles from the database
-- This will help identify non-IT jobs that might have been missed

SELECT DISTINCT job_title, COUNT(*) as count
FROM job_applications
GROUP BY job_title
ORDER BY job_title ASC;