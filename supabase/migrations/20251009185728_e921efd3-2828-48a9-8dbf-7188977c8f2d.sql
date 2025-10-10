-- Add repository_url field to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS repository_url text;

-- Add repository_url field to job_revisions table
ALTER TABLE job_revisions ADD COLUMN IF NOT EXISTS repository_url text;

-- Add comment for documentation
COMMENT ON COLUMN jobs.repository_url IS 'GitHub/GitLab repository URL for the project';
COMMENT ON COLUMN job_revisions.repository_url IS 'GitHub/GitLab repository URL for this revision';