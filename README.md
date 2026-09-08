# repo-chat

Chat with a GitHub repo's structure: paste a repo URL, it gets cloned and
parsed into a graph (files → functions/classes → imports), and you can ask
questions against that graph in a chat UI, with a live force-directed graph
view alongside it.

This is a **local, single-user** build (no deployment configs, no auth) and
the chat layer is a **stub retrieval engine** — it does real keyword-based
graph search and returns real, useful answers, but doesn't call an LLM yet.
See `backend/app/chat_engine.py` for exactly where to plug one in.

```
repo-chat/
  backend/    FastAPI app: clone -> parse -> graph -> chat
  frontend/   React + Tailwind UI
```

## 1. Prerequisites

- Python 3.10+
- Node.js 18+
- `git` installed and on your PATH (used to clone repos)
- A Postgres database — either:
  - a local Postgres install, or
  - a free [Supabase](https://supabase.com) project (you get a Postgres
    connection string from Project Settings → Database → Connection string)

## 2. Backend setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# edit .env and set DATABASE_URL to your local Postgres or Supabase connection string
```

The app creates its own `repos` table automatically on startup (see
`app/db.py: init_db()`), so you don't need to run any migration by hand.
(`init_db.sql` is there too if you'd rather run it manually.)

Run the API:

```bash
uvicorn app.main:app --reload --port 8000
```

Check it's alive: open http://localhost:8000/api/health — should return
`{"status": "ok"}`. Interactive API docs are at http://localhost:8000/docs.

## 3. Frontend setup

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. It talks to the backend at
`http://localhost:8000` by default — override with a `VITE_API_URL` env var
if you run the backend somewhere else.

## 4. Using it

1. Paste a public GitHub repo (either `owner/repo` or a full URL) and hit
   **Analyze repo**.
2. Watch the pipeline: cloning → parsing → building graph → saving.
3. Once ready, ask questions like:
   - "what does the auth module do?"
   - "tell me about UserService"
   - "what does main.py import?"

   Matches light up in the graph panel on the right.

## How the pipeline works

1. **Clone** — `git clone --depth 1` into a temp dir (`backend/app/git_utils.py`)
2. **Parse** — real Python AST parsing (`ast` module) for `.py` files;
   regex-based heuristic parsing for `.js/.jsx/.ts/.tsx` files (good enough
   for a first pass — swap in `tree-sitter` later for real JS/TS accuracy)
3. **Graph** — one `{nodes, edges}` structure per repo, stored as JSONB in
   Postgres (no dedicated graph database needed at this scale)
4. **Chat** — keyword scoring over node names/docstrings/paths, returning
   matched nodes plus their immediate neighborhood as a subgraph

## Known limits (by design, for this local demo pass)

- Capped at 500 files per repo (`MAX_FILES_PER_REPO` in `backend/app/config.py`)
- No auth, no multi-tenancy hardening, no deployment configs
- JS/TS parsing is regex-based, not a true AST — it'll miss edge cases
- Chat answers are template-formatted matches, not LLM-generated prose

## Where to go next

- Swap `chat_engine.py`'s `_format_answer()` for a real LLM call once you
  want natural-language answers (the file has a worked example in its
  docstring)
- Swap the JS/TS regex parser for `tree-sitter` bindings for real accuracy
- Move job status out of the in-memory `JOBS` dict in `analyzer.py` if you
  ever run multiple backend workers
- Add the multi-tenancy/deploy layer (Render/Railway + Vercel + Supabase)
  once this local version feels solid — that's mostly "web engineering
  around a thing that already works" at that point
