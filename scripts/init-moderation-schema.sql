-- Base Moderation & Bingo Submission Schema Migration
-- Salingkusog-Project (PostgreSQL)

CREATE TABLE IF NOT EXISTS public.bingo_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_index INT NOT NULL CHECK (slot_index >= 0 AND slot_index <= 8) UNIQUE,
  title VARCHAR(120) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'spirit',
  unlock_day INT NOT NULL DEFAULT 1,
  requires_selfie BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES neon_auth.user(id) ON DELETE CASCADE,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  display_name TEXT,
  college_dept TEXT,
  image_url TEXT NOT NULL,
  caption TEXT,
  is_bingo_entry BOOLEAN NOT NULL DEFAULT true,
  bingo_task_id UUID REFERENCES public.bingo_tasks(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'published', -- 'published', 'flagged', 'hidden'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_bingo ON public.posts(is_bingo_entry, bingo_task_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON public.posts(status);

CREATE TABLE IF NOT EXISTS public.user_bingo_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES neon_auth.user(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.bingo_tasks(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, task_id)
);

CREATE INDEX IF NOT EXISTS idx_user_bingo_user ON public.user_bingo_progress(user_id);

INSERT INTO public.bingo_tasks (slot_index, title, description, category, unlock_day, requires_selfie)
VALUES 
  (0, 'Opening Ceremony Cheer', 'Snap a selfie cheering at the intramurals parade or opening ceremony.', 'spirit', 1, true),
  (1, 'College Booth Selfie', 'Visit your college or department booth and take a selfie with the booth crew.', 'booth', 1, true),
  (2, 'Team Mascot High-Five', 'Find the university or college mascot and snap a selfie or photo high-fiving them.', 'spirit', 1, true),
  (3, 'Ball Games Sideline Cheer', 'Watch any basketball, volleyball, or soccer match and snap a courtside selfie.', 'sports', 2, true),
  (4, 'University Color Swag', 'Wear your college department colors or university shirt and snap a selfie.', 'culture', 2, true),
  (5, 'Campus Snack Break', 'Buy a snack or drink from a student-run booth and snap a foodie selfie.', 'booth', 2, true),
  (6, 'Athletic Action Moment', 'Catch a live sports action moment or cheer on your department athletes.', 'sports', 3, true),
  (7, 'Friendship / Squad Photo', 'Take a selfie with at least two friends or teammates at the sports complex.', 'spirit', 3, true),
  (8, 'Championship Trophy / Stage', 'Snap a selfie in front of the main stage, awards podium, or trophy table.', 'culture', 3, true)
ON CONFLICT (slot_index) DO NOTHING;
