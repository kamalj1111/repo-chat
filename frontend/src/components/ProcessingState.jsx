const STEPS = [
  { key: "queued", label: "Queued" },
  { key: "cloning", label: "Cloning GitHub repo" },
  { key: "parsing", label: "Parsing AST source files" },
  { key: "building_graph", label: "Building GraphRAG dependency graph" },
  { key: "saving", label: "Saving graph to database" },
  { key: "ready", label: "Ready" },
];

function stepState(stepKey, currentStatus) {
  const order = STEPS.map((s) => s.key);
  const currentIdx = order.indexOf(currentStatus);
  const stepIdx = order.indexOf(stepKey);
  if (currentStatus === "error") return "idle";
  if (stepIdx < currentIdx) return "done";
  if (stepIdx === currentIdx) return "active";
  return "idle";
}

export default function ProcessingState({ repoUrl, status, message, error }) {
  return (
    <div className="min-h-screen bg-gh-bg flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-lg bg-gh-panel border border-gh-border rounded-xl shadow-2xl p-6">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gh-border">
          <svg className="w-8 h-8 text-gh-blue animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <div>
            <span className="font-mono text-xs text-gh-blue font-semibold">ANALYZING CODEBASE</span>
            <h2 className="text-base font-semibold text-gh-text break-all font-mono">
              {repoUrl}
            </h2>
          </div>
        </div>

        <div className="flex flex-col gap-3 py-2">
          {STEPS.filter((s) => s.key !== "ready").map((step) => {
            const state = stepState(step.key, status);
            return (
              <div key={step.key} className="flex items-center gap-3 font-mono text-xs">
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 border transition-all ${
                    state === "done"
                      ? "bg-gh-green border-gh-green text-white"
                      : state === "active"
                      ? "bg-gh-blue/20 border-gh-blue text-gh-blue animate-pulse"
                      : "border-gh-border text-transparent"
                  }`}
                >
                  {state === "done" && (
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {state === "active" && <span className="w-1.5 h-1.5 rounded-full bg-gh-blue" />}
                </div>
                <span
                  className={
                    state === "active"
                      ? "text-gh-text font-bold"
                      : state === "done"
                      ? "text-gh-secondary"
                      : "text-gh-muted"
                  }
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {error ? (
          <div className="mt-6 p-3 bg-gh-red/10 border border-gh-red/30 rounded-lg text-xs font-mono text-gh-red">
            {error}
          </div>
        ) : (
          <div className="mt-6 pt-4 border-t border-gh-border text-xs font-mono text-gh-secondary flex items-center justify-between">
            <span>Status: <strong className="text-gh-blue">{message || "Working..."}</strong></span>
          </div>
        )}
      </div>
    </div>
  );
}
