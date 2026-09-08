from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    repo_url: str = Field(..., description="Public GitHub repo URL, e.g. https://github.com/owner/repo")


class AnalyzeResponse(BaseModel):
    session_id: str


class StatusResponse(BaseModel):
    session_id: str
    status: str  # queued | cloning | parsing | building_graph | saving | ready | error
    message: Optional[str] = None
    file_count: Optional[int] = None
    node_count: Optional[int] = None
    edge_count: Optional[int] = None


class ChatRequest(BaseModel):
    session_id: str
    question: str


class GraphNode(BaseModel):
    id: str
    type: str  # file | function | class | import
    name: str
    file: Optional[str] = None
    docstring: Optional[str] = None
    lineno: Optional[int] = None


class GraphEdge(BaseModel):
    source: str
    target: str
    relation: str  # CONTAINS | IMPORTS


class Graph(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]


class ChatResponse(BaseModel):
    answer: str
    matched_node_ids: List[str]
    subgraph: Graph


class GraphResponse(BaseModel):
    repo_url: str
    graph: Graph
    file_count: int
