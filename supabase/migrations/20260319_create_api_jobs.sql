-- api_jobs table: maps external API job IDs to internal predictions/gallery
CREATE TABLE IF NOT EXISTS api_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  api_key_id uuid NOT NULL REFERENCES api_keys(id),
  type text NOT NULL CHECK (type IN ('image', 'video', 'character', 'recipe')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  prediction_id text,
  gallery_id uuid,
  batch_id uuid,
  cost integer NOT NULL DEFAULT 0,
  input jsonb,
  result jsonb,
  error_message text,
  webhook_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- Indexes
CREATE UNIQUE INDEX idx_api_jobs_prediction_id ON api_jobs(prediction_id) WHERE prediction_id IS NOT NULL;
CREATE INDEX idx_api_jobs_user_created ON api_jobs(user_id, created_at DESC);
CREATE INDEX idx_api_jobs_status ON api_jobs(status);
CREATE INDEX idx_api_jobs_batch ON api_jobs(batch_id) WHERE batch_id IS NOT NULL;

-- RLS
ALTER TABLE api_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own jobs" ON api_jobs
  FOR SELECT USING (user_id = auth.uid());

-- Service role bypasses RLS by default, no separate policy needed
