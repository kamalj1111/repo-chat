-- Optional: run this manually if you'd rather not rely on the app's
-- automatic init_db() call on startup (app/db.py does this for you already).

CREATE TABLE IF NOT EXISTS repos (
    session_id UUID PRIMARY KEY,
    repo_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ready',
    file_count INTEGER DEFAULT 0,
    graph JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
