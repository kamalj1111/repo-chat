"""
Orchestrates the full pipeline for one repo: clone -> parse -> build graph
-> persist. Runs as a FastAPI BackgroundTask so /analyze can return
immediately and the frontend polls /status for progress.

Job status lives in a simple in-memory dict, which is fine for a local,
single-process app. If you deploy this for real with multiple workers,
move JOBS into something shared (Redis, or just rely on the DB status
column and skip the in-memory dict).
"""
from app import db
from app.git_utils import clone_repo, cleanup_repo, CloneError
from app.graph_builder import build_graph

# session_id -> {"status": str, "message": str|None, "file_count": int|None,
#                "node_count": int|None, "edge_count": int|None}
JOBS: dict = {}


def _set_status(session_id: str, status: str, **extra):
    job = JOBS.setdefault(session_id, {})
    job["status"] = status
    job.update(extra)


def get_job_status(session_id: str):
    return JOBS.get(session_id)


def run_analysis(session_id: str, repo_url: str):
    _set_status(session_id, "cloning", message=f"Cloning {repo_url}...")

    try:
        repo_dir = clone_repo(repo_url)
    except CloneError as e:
        _set_status(session_id, "error", message=str(e))
        return

    try:
        _set_status(session_id, "parsing", message="Parsing source files...")
        graph, file_count, truncated = build_graph(repo_dir)

        _set_status(session_id, "building_graph", message="Building graph structure...")
        # (build_graph already returns the finished graph - this status
        # step exists mainly so the UI has something to show for larger repos.)

        _set_status(session_id, "saving", message="Saving graph...")
        db.save_repo(session_id, repo_url, graph, file_count)

        msg = f"Ready! Parsed {file_count} files."
        if truncated:
            msg += f" (Capped at {file_count} files for this demo - larger repos are truncated.)"

        _set_status(
            session_id, "ready", message=msg,
            file_count=file_count,
            node_count=len(graph["nodes"]),
            edge_count=len(graph["edges"]),
        )
    except Exception as e:  # noqa: BLE001 - surface any parsing bug to the UI instead of hanging
        _set_status(session_id, "error", message=f"Failed while analyzing repo: {e}")
    finally:
        cleanup_repo(repo_dir)
