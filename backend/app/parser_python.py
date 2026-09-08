"""
Extracts entities (functions, classes, imports) and relationships from a
single Python file using the standard library `ast` module.

Returns nodes/edges in the shared graph schema used across all parsers -
see graph_builder.py for how these get merged together.
"""
import ast


def parse_python_file(filepath: str, relpath: str):
    nodes = []
    edges = []

    file_id = f"file:{relpath}"
    nodes.append({
        "id": file_id, "type": "file", "name": relpath,
        "file": relpath, "docstring": None, "lineno": None,
    })

    try:
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            source = f.read()
        tree = ast.parse(source, filename=relpath)
    except (SyntaxError, UnicodeDecodeError, ValueError):
        # Unparseable file (bad encoding, syntax error in old python2 code, etc.)
        # We still keep the file node so it shows up in the graph.
        return nodes, edges

    # Pre-collect method nodes so the generic function branch below doesn't
    # ALSO add them as standalone file-level functions (ast.walk visits
    # every node in the tree, including methods nested in a class body).
    method_node_ids = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef):
            for item in node.body:
                if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    method_node_ids.add(id(item))

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                mod_name = alias.name
                import_id = f"import:{relpath}:{mod_name}"
                nodes.append({
                    "id": import_id, "type": "import", "name": mod_name,
                    "file": relpath, "docstring": None, "lineno": node.lineno,
                })
                edges.append({"source": file_id, "target": import_id, "relation": "IMPORTS"})

        elif isinstance(node, ast.ImportFrom):
            mod_name = node.module or "(relative import)"
            import_id = f"import:{relpath}:{mod_name}"
            nodes.append({
                "id": import_id, "type": "import", "name": mod_name,
                "file": relpath, "docstring": None, "lineno": node.lineno,
            })
            edges.append({"source": file_id, "target": import_id, "relation": "IMPORTS"})

        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            if id(node) in method_node_ids:
                continue  # already added under its class below
            func_id = f"func:{relpath}:{node.name}:{node.lineno}"
            nodes.append({
                "id": func_id, "type": "function", "name": node.name,
                "file": relpath, "docstring": ast.get_docstring(node), "lineno": node.lineno,
            })
            edges.append({"source": file_id, "target": func_id, "relation": "CONTAINS"})

        elif isinstance(node, ast.ClassDef):
            class_id = f"class:{relpath}:{node.name}:{node.lineno}"
            nodes.append({
                "id": class_id, "type": "class", "name": node.name,
                "file": relpath, "docstring": ast.get_docstring(node), "lineno": node.lineno,
            })
            edges.append({"source": file_id, "target": class_id, "relation": "CONTAINS"})

            for item in node.body:
                if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    method_id = f"func:{relpath}:{node.name}.{item.name}:{item.lineno}"
                    nodes.append({
                        "id": method_id, "type": "function", "name": f"{node.name}.{item.name}",
                        "file": relpath, "docstring": ast.get_docstring(item), "lineno": item.lineno,
                    })
                    edges.append({"source": class_id, "target": method_id, "relation": "CONTAINS"})

    return nodes, edges
