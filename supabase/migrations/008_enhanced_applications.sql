-- Enhanced application fields for richer kanban cards
ALTER TABLE applications ADD COLUMN sub_stage TEXT;
ALTER TABLE applications ADD COLUMN salary_range TEXT;
ALTER TABLE applications ADD COLUMN tags TEXT[] DEFAULT '{}';
ALTER TABLE applications ADD COLUMN meet_link TEXT;
ALTER TABLE applications ADD COLUMN interviewer_name TEXT;
