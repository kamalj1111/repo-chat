import { useEffect, useRef, useState } from "react";
import RepoInput from "./components/RepoInput";
import ProcessingState from "./components/ProcessingState";
import ChatWindow from "./components/ChatWindow";
import GraphView from "./components/GraphView";
import { analyzeRepo, getStatus, getGraph } from "./api";

function normalizeRepoUrl(input) {
  const trimmed = input.trim().replace(/\/$/, "");
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://github.com/${trimmed}`;
}

export default function App() {
  const [stage, setStage] = useState("input"); // input | processing | chat
  const [repoUrl, setRepoUrl] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [jobMessage, setJobMessage] = useState(null);
  const [inputError, setInputError] = useState(null);
  const [graph, setGraph] = useState(null);
  const [highlightIds, setHighlightIds] = useState([]);
  const [subgraph, setSubgraph] = useState(null);

  const pollRef = useRef(null);

  async function handleSubmitRepo(rawUrl) {
    setInputError(null);
    const url = normalizeRepoUrl(rawUrl);
    setRepoUrl(url);
    setStage("processing");
    setJobStatus("queued");

    try {
      const { session_id } = await analyzeRepo(url);
      setSessionId(session_id);
      startPolling(session_id);
    } catch (err) {
      setStage("input");
      setInputError(err.message || "Failed to start analysis.");
    }
  }

  function startPolling(session_id) {
    let errorCount = 0;
    const MAX_ERRORS = 5; // tolerate up to 5 consecutive failures (cold starts, etc.)

    pollRef.current = setInterval(async () => {
      try {
        const s = await getStatus(session_id);
        errorCount = 0; // reset on success
        setJobStatus(s.status);
        setJobMessage(s.message);

        if (s.status === "ready") {
          clearInterval(pollRef.current);
          const g = await getGraph(session_id);
          setGraph(g.graph);
          setStage("chat");
        } else if (s.status === "error") {
          clearInterval(pollRef.current);
        }
      } catch (err) {
        errorCount++;
        if (errorCount >= MAX_ERRORS) {
          clearInterval(pollRef.current);
          setJobStatus("error");
          setJobMessage(err.message);
        } else {
          // transient error — keep polling silently
          setJobMessage(`Connecting to backend... (retry ${errorCount}/${MAX_ERRORS})`);
        }
      }
    }, 2000);
  }

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function handleMatchedNodes(ids, sub) {
    setHighlightIds(ids || []);
    setSubgraph(sub || null);
  }

  function handleReset() {
    setStage("input");
    setRepoUrl("");
    setSessionId(null);
    setJobStatus(null);
    setGraph(null);
    setHighlightIds([]);
    setSubgraph(null);
  }

  if (stage === "input") {
    return <RepoInput onSubmit={handleSubmitRepo} error={inputError} />;
  }

  if (stage === "processing") {
    return (
      <ProcessingState
        repoUrl={repoUrl}
        status={jobStatus}
        message={jobMessage}
        error={jobStatus === "error" ? jobMessage : null}
      />
    );
  }

  // stage === "chat"
  return (
    <div className="h-screen flex flex-col bg-gh-bg text-gh-text">
      {/* GitHub Header Navigation Bar */}
      <header className="flex items-center justify-between border-b border-gh-border bg-gh-panel px-5 py-2.5 shadow-sm">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 text-gh-text" fill="currentColor" viewBox="0 0 24 24">
            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
          </svg>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] px-1.5 py-0.2 rounded border border-gh-border text-gh-blue bg-gh-bg font-semibold">
                repo-chat
              </span>
              <span className="text-xs text-gh-secondary font-mono font-medium truncate max-w-xs md:max-w-md">
                {repoUrl}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handleReset}
          className="font-mono text-xs bg-gh-subpanel hover:bg-gh-border text-gh-text border border-gh-border rounded-md px-3 py-1.5 shadow-sm transition-all flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5 text-gh-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Analyze another repository</span>
        </button>
      </header>

      {/* Split View Container */}
      <main className="flex-1 grid grid-cols-1 md:grid-cols-2 min-h-0">
        <section className="border-r border-gh-border min-h-0">
          <ChatWindow sessionId={sessionId} onMatchedNodes={handleMatchedNodes} />
        </section>
        <section className="min-h-0 hidden md:block">
          <GraphView fullGraph={graph} subgraph={subgraph} highlightIds={highlightIds} />
        </section>
      </main>
    </div>
  );
}
