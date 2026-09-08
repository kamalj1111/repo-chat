"""
Walks a cloned repo directory, dispatches each file to the right parser,
and merges everything into one graph: {"nodes": [...], "edges": [...]}.
"""
import os

from app.config import (
    PYTHON_EXTENSIONS, JS_EXTENSIONS, IGNORED_DIRS, MAX_FILES_PER_REPO,
)
from app.parser_python import parse_python_file
from app.parser_js import parse_js_file


def _iter_source_files(root_dir: str):
    for dirpath, dirnames, filenames in os.walk(root_dir):
        dirnames[:] = [d for d in dirnames if d not in IGNORED_DIRS and not d.startswith(".")]
        for filename in filenames:
            ext = os.path.splitext(filename)[1]
            if ext in PYTHON_EXTENSIONS or ext in JS_EXTENSIONS:
                full_path = os.path.join(dirpath, filename)
                rel_path = os.path.relpath(full_path, root_dir)
                yield full_path, rel_path, ext


def build_graph(root_dir: str, max_files: int = MAX_FILES_PER_REPO):
    """
    Returns (graph_dict, file_count, truncated: bool)
    """
    nodes = {}
    edges = []
    file_count = 0
    truncated = False

    for full_path, rel_path, ext in _iter_source_files(root_dir):
        if file_count >= max_files:
            truncated = True
            break

        if ext in PYTHON_EXTENSIONS:
            file_nodes, file_edges = parse_python_file(full_path, rel_path)
        else:
            file_nodes, file_edges = parse_js_file(full_path, rel_path)

        for n in file_nodes:
            # Multiple files can import the same module - de-dupe by id,
            # keeping the first version we saw.
            nodes.setdefault(n["id"], n)
        edges.extend(file_edges)

        file_count += 1

    graph = {"nodes": list(nodes.values()), "edges": edges}
    return graph, file_count, truncated
