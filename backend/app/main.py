import uuid

from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app import db, analyzer, chat_engine
from app.config import FRONTEND_ORIGIN
from app.schemas import (
    AnalyzeRequest, AnalyzeResponse, StatusResponse,
    ChatRequest, ChatResponse, GraphResponse,
)

app = FastAPI(title="Repo Chat API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    db.init_db()


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest, background_tasks: BackgroundTasks):
    if "github.com" not in req.repo_url:
        raise HTTPException(status_code=400, detail="Please provide a GitHub repo URL.")

    session_id = str(uuid.uuid4())
    analyzer.JOBS[session_id] = {"status": "queued", "message": "Queued..."}
    background_tasks.add_task(analyzer.run_analysis, session_id, req.repo_url)
    return AnalyzeResponse(session_id=session_id)


@app.get("/api/status/{session_id}", response_model=StatusResponse)
def status(session_id: str):
    job = analyzer.get_job_status(session_id)
    if job:
        return StatusResponse(session_id=session_id, **job)

    # Not in memory (e.g. server restarted) - check whether it's already
    # persisted and done.
    repo = db.get_repo(session_id)
    if repo:
        graph = repo["graph"]
        return StatusResponse(
            session_id=session_id, status="ready", message="Ready.",
            file_count=repo["file_count"],
            node_count=len(graph.get("nodes", [])),
            edge_count=len(graph.get("edges", [])),
        )

    raise HTTPException(status_code=404, detail="Unknown session_id.")


@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    repo = db.get_repo(req.session_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repo not found or not ready yet.")

    result = chat_engine.answer_question(req.question, repo["graph"], repo_url=repo.get("repo_url", ""))
    return ChatResponse(**result)


@app.get("/api/graph/{session_id}", response_model=GraphResponse)
def get_graph(session_id: str):
    repo = db.get_repo(session_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repo not found or not ready yet.")

    return GraphResponse(repo_url=repo["repo_url"], graph=repo["graph"], file_count=repo["file_count"])
