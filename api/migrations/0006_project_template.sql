-- Add template fields column to projects table
ALTER TABLE projects ADD COLUMN template_fields_json TEXT;
