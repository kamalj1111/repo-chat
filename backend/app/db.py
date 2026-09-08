"""
Thin persistence layer supporting Supabase API, PostgreSQL, or SQLite.
"""
import json
import sqlite3
import os
from contextlib import contextmanager

from app.config import DATABASE_URL, SUPABASE_URL, SUPABASE_API_KEY, SUPABASE_PUBLISHABLE_KEY

# Determine Supabase Client vs Postgres vs SQLite
supabase_client = None
USE_SUPABASE = False
USE_POSTGRES = False
USE_SQLITE = False

# Try initializing Supabase Python Client first if URL & API Key exist
if SUPABASE_URL.startswith("http") and (SUPABASE_API_KEY or SUPABASE_PUBLISHABLE_KEY):
    try:
        from supabase import create_client
        api_key = SUPABASE_API_KEY or SUPABASE_PUBLISHABLE_KEY
        supabase_client = create_client(SUPABASE_URL, api_key)
        # Test query
        res = supabase_client.table("repos").select("session_id").limit(1).execute()
        USE_SUPABASE = True
        print("[db.py] Successfully connected to Supabase Database via API Client.")
    except Exception as e:
        print(f"[db.py] Supabase API connection notice: {e}")

# If Supabase API client is not used, check for Direct Postgres / Pooler connection
if not USE_SUPABASE and DATABASE_URL.startswith("postgresql"):
    try:
        import psycopg2
        import psycopg2.extras
        conn = psycopg2.connect(DATABASE_URL, connect_timeout=3)
        conn.close()
        USE_POSTGRES = True
        print("[db.py] Successfully connected to PostgreSQL / Supabase Database via psycopg2.")
    except Exception as e:
        print(f"[db.py] Postgres connection notice ({e}), falling back to local SQLite.")

# Default to SQLite if neither Supabase API nor Postgres URI is connected
if not USE_SUPABASE and not USE_POSTGRES:
    USE_SQLITE = True
    print("[db.py] Operating on local SQLite database (repo_chat.db).")

SQLITE_DB_PATH = os.path.join(os.path.dirname(__file__), "..", "repo_chat.db")

CREATE_TABLE_POSTGRES = """
CREATE TABLE IF NOT EXISTS repos (
    session_id UUID PRIMARY KEY,
    repo_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ready',
    file_count INTEGER DEFAULT 0,
    graph JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
"""

CREATE_TABLE_SQLITE = """
CREATE TABLE IF NOT EXISTS repos (
    session_id TEXT PRIMARY KEY,
    repo_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ready',
    file_count INTEGER DEFAULT 0,
    graph TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""


@contextmanager
def get_conn():
    if USE_POSTGRES:
        import psycopg2
        conn = psycopg2.connect(DATABASE_URL)
        try:
            yield conn
        finally:
            conn.close()
    else:
        conn = sqlite3.connect(SQLITE_DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()


def init_db():
    """Create repos table if missing (handled automatically for SQLite / Postgres)."""
    if USE_SUPABASE:
        # Table is created in Supabase Dashboard or init_db.sql
        return
    with get_conn() as conn:
        if USE_SQLITE:
            cur = conn.cursor()
            cur.execute(CREATE_TABLE_SQLITE)
        elif USE_POSTGRES:
            with conn.cursor() as cur:
                cur.execute(CREATE_TABLE_POSTGRES)
        conn.commit()


def save_repo(session_id: str, repo_url: str, graph: dict, file_count: int):
    if USE_SUPABASE and supabase_client:
        supabase_client.table("repos").upsert({
            "session_id": session_id,
            "repo_url": repo_url,
            "status": "ready",
            "file_count": file_count,
            "graph": graph,
        }).execute()
        return

    with get_conn() as conn:
        if USE_SQLITE:
            cur = conn.cursor()
            cur.execute(
                """
                INSERT INTO repos (session_id, repo_url, status, file_count, graph)
                VALUES (?, ?, 'ready', ?, ?)
                ON CONFLICT(session_id) DO UPDATE SET
                    repo_url = excluded.repo_url,
                    status = 'ready',
                    file_count = excluded.file_count,
                    graph = excluded.graph
                """,
                (session_id, repo_url, file_count, json.dumps(graph)),
            )
        elif USE_POSTGRES:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO repos (session_id, repo_url, status, file_count, graph)
                    VALUES (%s, %s, 'ready', %s, %s)
                    ON CONFLICT (session_id) DO UPDATE
                    SET repo_url = EXCLUDED.repo_url,
                        status = 'ready',
                        file_count = EXCLUDED.file_count,
                        graph = EXCLUDED.graph
                    """,
                    (session_id, repo_url, file_count, json.dumps(graph)),
                )
        conn.commit()


def get_repo(session_id: str):
    if USE_SUPABASE and supabase_client:
        res = supabase_client.table("repos").select("*").eq("session_id", session_id).execute()
        if res.data and len(res.data) > 0:
            row = res.data[0]
            if isinstance(row.get("graph"), str):
                row["graph"] = json.loads(row["graph"])
            return row
        return None

    with get_conn() as conn:
        if USE_SQLITE:
            cur = conn.cursor()
            cur.execute(
                "SELECT session_id, repo_url, status, file_count, graph FROM repos WHERE session_id = ?",
                (session_id,),
            )
            row = cur.fetchone()
            if not row:
                return None
            res = dict(row)
            if isinstance(res["graph"], str):
                res["graph"] = json.loads(res["graph"])
            return res
        elif USE_POSTGRES:
            import psycopg2.extras
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    "SELECT session_id, repo_url, status, file_count, graph FROM repos WHERE session_id = %s",
                    (session_id,),
                )
                row = cur.fetchone()
                return dict(row) if row else None

    return None
