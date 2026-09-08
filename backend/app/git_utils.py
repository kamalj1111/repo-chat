"""
Handles cloning a public GitHub repo into a temp directory.
"""
import os
import shutil
import subprocess
import uuid

from app.config import CLONE_ROOT


class CloneError(Exception):
    pass


def clone_repo(repo_url: str) -> str:
    """
    Shallow-clones repo_url into a fresh temp directory and returns the path.
    Raises CloneError on failure (bad URL, private repo, network issue, etc.)
    """
    os.makedirs(CLONE_ROOT, exist_ok=True)
    target_dir = os.path.join(CLONE_ROOT, str(uuid.uuid4()))

    try:
        result = subprocess.run(
            ["git", "clone", "--depth", "1", repo_url, target_dir],
            capture_output=True,
            text=True,
            timeout=300,
        )
    except subprocess.TimeoutExpired:
        raise CloneError("Cloning the repo took too long and timed out.")

    if result.returncode != 0:
        raise CloneError(f"git clone failed: {result.stderr.strip()[:500]}")

    return target_dir


def cleanup_repo(path: str):
    """Best-effort removal of the cloned repo once we're done parsing it."""
    shutil.rmtree(path, ignore_errors=True)
