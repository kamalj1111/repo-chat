"""
Answers questions about a repo's graph.

This is deliberately a STUB retrieval layer, not a real LLM integration -
that was the explicit scope for this pass. It does real, useful work
(keyword matching over node names/docstrings/paths + pulling in the
immediate neighborhood of whatever matches), so the whole pipeline is
testable end to end.

--------------------------------------------------------------------------
TO UPGRADE TO A REAL LLM LATER:
1. Keep everything below `find_matches()` as-is - it's your retrieval step.
2. Instead of building `answer` with _format_answer(), send the matched
   nodes + subgraph as context to Claude/GPT with the user's question and
   let the model write the actual answer.
   e.g. (Anthropic):
       message = client.messages.create(
           model="claude-sonnet-4-6",
           max_tokens=1000,
           messages=[{
               "role": "user",
               "content": f"Repo context:\\n{context_str}\\n\\nQuestion: {question}"
           }],
       )
--------------------------------------------------------------------------
"""
import re
from collections import Counter

STOPWORDS = {
    "the", "a", "an", "is", "are", "what", "how", "does", "do", "in", "of",
    "to", "for", "and", "or", "this", "that", "where", "which", "why",
    "explain", "tell", "me", "about", "code", "repo", "codebase", "project",
}


def _tokenize(text: str, keep_all: bool = False):
    words = [w for w in re.findall(r"[a-zA-Z_][a-zA-Z0-9_]*", text.lower()) if len(w) > 1]
    if keep_all:
        return words
    return [w for w in words if w not in STOPWORDS]


def find_matches(question: str, graph: dict, top_k: int = 8):
    """
    Scores every node against the question's keywords and returns the
    top_k highest-scoring nodes.
    If no specific node matches, returns top core nodes for overview.
    """
    all_nodes = graph.get("nodes", [])
    if not all_nodes:
        return [], False

    query_tokens = set(_tokenize(question))
    # If standard stopwords removed everything, try keeping all tokens
    if not query_tokens:
        query_tokens = set(_tokenize(question, keep_all=True))

    scored = []
    if query_tokens:
        for node in all_nodes:
            haystack = " ".join(filter(None, [
                node.get("name", ""),
                node.get("file", ""),
                node.get("docstring") or "",
                node.get("type", "")
            ])).lower()
            
            node_tokens = Counter(_tokenize(haystack, keep_all=True))

            score = sum(node_tokens[t] for t in query_tokens if t in node_tokens)
            
            # Partial substring matching boost
            for qt in query_tokens:
                if len(qt) >= 3 and qt in node.get("name", "").lower():
                    score += 3
                if len(qt) >= 3 and qt in node.get("file", "").lower():
                    score += 2

            # Boost exact name matches
            if node.get("name", "").lower() in query_tokens:
                score += 5

            if score > 0:
                scored.append((score, node))

    if scored:
        scored.sort(key=lambda pair: pair[0], reverse=True)
        return [node for _, node in scored[:top_k]], True

    # Fallback for general questions or when no specific keyword matches:
    # Select top file or class nodes to present an overview of the graph
    file_nodes = [n for n in all_nodes if n.get("type") == "file"]
    class_nodes = [n for n in all_nodes if n.get("type") == "class"]
    other_nodes = [n for n in all_nodes if n.get("type") not in ("file", "class")]
    
    fallback_nodes = (file_nodes + class_nodes + other_nodes)[:top_k]
    return fallback_nodes, False


def build_subgraph(matched_nodes: list, graph: dict):
    """
    Pulls in matched nodes plus any edges directly touching them, and the
    other endpoint of those edges, so the frontend can render a small,
    relevant slice of the whole graph instead of everything.
    """
    matched_ids = {n["id"] for n in matched_nodes}
    sub_edges = [e for e in graph.get("edges", []) if e["source"] in matched_ids or e["target"] in matched_ids]

    neighbor_ids = matched_ids.copy()
    for e in sub_edges:
        neighbor_ids.add(e["source"])
        neighbor_ids.add(e["target"])

    node_lookup = {n["id"]: n for n in graph.get("nodes", [])}
    sub_nodes = [node_lookup[nid] for nid in neighbor_ids if nid in node_lookup]

    return {"nodes": sub_nodes, "edges": sub_edges}


def _format_answer(question: str, matched_nodes: list, is_exact_match: bool, total_nodes: int):
    if total_nodes == 0:
        return (
            "This repository has 0 parsed Python or JavaScript files. "
            "Graph analysis is currently supported for .py, .js, .jsx, .ts, and .tsx files."
        )

    if not matched_nodes:
        return (
            "I couldn't find any specific nodes matching that question. "
            "Try asking about specific files, functions, or classes in this repository."
        )

    if is_exact_match:
        lines = [f"Here is what I found in the codebase graph related to \"{question}\":", ""]
    else:
        lines = [
            f"Here is an overview of key files and components in the repository graph matching your prompt (\"{question}\"):",
            ""
        ]

    for node in matched_nodes:
        loc = f"{node.get('file')}:{node.get('lineno')}" if node.get("lineno") else node.get("file", "")
        loc_str = f" ({loc})" if loc else ""
        lines.append(f"- [{node.get('type', 'node')}] {node.get('name', 'Unnamed')}{loc_str}")
        if node.get("docstring"):
            snippet = node["docstring"].strip().splitlines()[0][:140]
            lines.append(f"    \"{snippet}\"")

    lines.append("")
    lines.append(
        "(Keyword & graph retrieval over parsed AST nodes. Select any node in the graph panel to explore dependencies.)"
    )
    return "\n".join(lines)


def _generate_llm_answer(question: str, matched_nodes: list, subgraph: dict, repo_url: str = "") -> str:
    from app.config import NVIDIA_API_KEY, NVIDIA_MODEL, NVIDIA_INVOKE_URL
    import requests
    import json

    if not NVIDIA_API_KEY:
        return None

    repo_name = repo_url.split("github.com/")[-1] if ("github.com/" in repo_url) else (repo_url or "Target Repository")

    context_lines = [f"Target Repository Name: {repo_name} ({repo_url})"]
    context_lines.append("Parsed Codebase AST Nodes & Files:")
    for n in matched_nodes:
        loc = f"{n.get('file')}:{n.get('lineno')}" if n.get("lineno") else n.get("file", "")
        context_lines.append(f" - [{n.get('type', 'node')}] {n.get('name')} (File: {loc})")
        if n.get("docstring"):
            context_lines.append(f"     Docstring: {n.get('docstring').strip()}")

    edges = subgraph.get("edges", [])
    if edges:
        context_lines.append("\nCode Dependencies & Relationships:")
        for e in edges[:25]:
            context_lines.append(f"  {e.get('source')} --[{e.get('label', 'relates_to')}]--> {e.get('target')}")

    context_str = "\n".join(context_lines)

    headers = {
        "Authorization": f"Bearer {NVIDIA_API_KEY}",
        "Accept": "text/event-stream",
        "Content-Type": "application/json"
    }

    prompt = (
        f"You are an expert software architecture AI assistant analyzing the external GitHub repository '{repo_name}'.\n\n"
        "STRICT SYSTEM DIRECTIVES:\n"
        f"1. You are analyzing the TARGET REPOSITORY '{repo_name}' ({repo_url}).\n"
        "2. Do NOT talk about your own implementation, internal code, or the backend server.\n"
        f"3. Answer ONLY about the target repository '{repo_name}' using the AST nodes and relationship graph context provided below.\n\n"
        f"--- Context for Target Repository ({repo_name}) ---\n{context_str}\n\n"
        f"--- Question ---\n{question}"
    )

    payload = {
        "model": NVIDIA_MODEL,
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.3,
        "max_tokens": 1024,
        "stream": True
    }

    try:
        resp = requests.post(NVIDIA_INVOKE_URL, headers=headers, json=payload, stream=True, timeout=30)
        if resp.ok:
            collected_chunks = []
            for line in resp.iter_lines():
                if not line:
                    continue
                line_str = line.decode("utf-8").strip()
                if line_str.startswith("data: "):
                    data_str = line_str[6:].strip()
                    if data_str == "[DONE]":
                        break
                    try:
                        chunk_json = json.loads(data_str)
                        choices = chunk_json.get("choices", [])
                        if choices:
                            delta = choices[0].get("delta", {})
                            content = delta.get("content", "")
                            if content:
                                collected_chunks.append(content)
                    except Exception:
                        pass
            if collected_chunks:
                return "".join(collected_chunks)
        else:
            print(f"[chat_engine] NVIDIA API response error {resp.status_code}: {resp.text}")
    except Exception as e:
        print(f"[chat_engine] NVIDIA API request failed: {e}")

    return None


def answer_question(question: str, graph: dict, repo_url: str = ""):
    nodes = graph.get("nodes", [])
    matched_nodes, is_exact_match = find_matches(question, graph)
    subgraph = build_subgraph(matched_nodes, graph)
    
    llm_answer = _generate_llm_answer(question, matched_nodes, subgraph, repo_url=repo_url)
    answer = llm_answer if llm_answer else _format_answer(question, matched_nodes, is_exact_match, len(nodes))
    
    return {
        "answer": answer,
        "matched_node_ids": [n["id"] for n in matched_nodes],
        "subgraph": subgraph,
    }

