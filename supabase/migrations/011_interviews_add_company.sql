-- Add company column to interviews (for Google Favicon logos + future kanban→interview flow)
ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS company TEXT;

-- Drop cover_image since we use dynamic favicons/avatars now
ALTER TABLE public.interviews DROP COLUMN IF EXISTS cover_image;
