"""
Lightweight JS/TS/JSX/TSX parser.

We don't have a real JS AST engine available in a plain Python backend, so
this uses regex heuristics to pick out the entities that matter for a
"chat with your codebase" use case: functions, classes, and imports.

This is intentionally a stub-quality parser - good enough to build a useful
graph and demo the pipeline end to end. Swap in something like a
tree-sitter binding later for production-grade accuracy.
"""
import re

IMPORT_RE = re.compile(r"""import\s+(?:.+?\s+from\s+)?['"]([^'"]+)['"]""")
REQUIRE_RE = re.compile(r"""require\(\s*['"]([^'"]+)['"]\s*\)""")
FUNCTION_DECL_RE = re.compile(r"""(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(""")
ARROW_CONST_RE = re.compile(r"""(?:export\s+)?const\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>""")
CLASS_RE = re.compile(r"""(?:export\s+)?(?:default\s+)?class\s+([A-Za-z0-9_$]+)""")


def parse_js_file(filepath: str, relpath: str):
    nodes = []
    edges = []

    file_id = f"file:{relpath}"
    nodes.append({
        "id": file_id, "type": "file", "name": relpath,
        "file": relpath, "docstring": None, "lineno": None,
    })

    try:
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            lines = f.readlines()
    except (UnicodeDecodeError, OSError):
        return nodes, edges

    for lineno, line in enumerate(lines, start=1):
        for match in IMPORT_RE.finditer(line):
            _add_import(nodes, edges, file_id, relpath, match.group(1), lineno)
        for match in REQUIRE_RE.finditer(line):
            _add_import(nodes, edges, file_id, relpath, match.group(1), lineno)

        m = FUNCTION_DECL_RE.search(line)
        if m:
            _add_function(nodes, edges, file_id, relpath, m.group(1), lineno)

        m = ARROW_CONST_RE.search(line)
        if m:
            _add_function(nodes, edges, file_id, relpath, m.group(1), lineno)

        m = CLASS_RE.search(line)
        if m:
            class_id = f"class:{relpath}:{m.group(1)}:{lineno}"
            nodes.append({
                "id": class_id, "type": "class", "name": m.group(1),
                "file": relpath, "docstring": None, "lineno": lineno,
            })
            edges.append({"source": file_id, "target": class_id, "relation": "CONTAINS"})

    return nodes, edges


def _add_import(nodes, edges, file_id, relpath, mod_name, lineno):
    import_id = f"import:{relpath}:{mod_name}"
    nodes.append({
        "id": import_id, "type": "import", "name": mod_name,
        "file": relpath, "docstring": None, "lineno": lineno,
    })
    edges.append({"source": file_id, "target": import_id, "relation": "IMPORTS"})


def _add_function(nodes, edges, file_id, relpath, func_name, lineno):
    func_id = f"func:{relpath}:{func_name}:{lineno}"
    nodes.append({
        "id": func_id, "type": "function", "name": func_name,
        "file": relpath, "docstring": None, "lineno": lineno,
    })
    edges.append({"source": file_id, "target": func_id, "relation": "CONTAINS"})
