import { useState } from "react";

export default function RepoInput({ onSubmit, error }) {
  const [url, setUrl] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!url.trim()) return;
    onSubmit(url.trim());
  }

  return (
    <div className="min-h-screen bg-gh-bg flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-xl">
        {/* GitHub Branding Header */}
        <div className="flex items-center gap-3 mb-6">
          <svg className="w-10 h-10 text-gh-text" fill="currentColor" viewBox="0 0 24 24">
            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
          </svg>
          <div>
            <span className="font-mono text-xs px-2.5 py-0.5 rounded-full border border-[#444c56] text-gh-blue bg-gh-panel font-semibold">
              repo-chat · GraphRAG
            </span>
            <h1 className="text-2xl font-bold text-gh-text tracking-tight mt-1">
              Talk to any GitHub Codebase
            </h1>
          </div>
        </div>

        {/* GitHub Panel Container */}
        <div className="bg-gh-panel border border-[#444c56] rounded-xl shadow-2xl p-6">
          <p className="text-sm text-[#adbac7] mb-5 leading-relaxed">
            Enter a public GitHub repository. We clone, parse the AST dependency graph (files, functions, classes, imports), and power real-time GraphRAG AI conversations.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gh-text font-mono flex items-center justify-between">
                <span>Repository URL or Shorthand</span>
                <span className="text-[#8b949e] text-[11px] font-normal">e.g. owner/repository</span>
              </label>
              
              <div className="flex items-center gap-2 bg-[#21262d] border border-[#444c56] rounded-lg px-3.5 py-2.5 focus-within:border-gh-blue focus-within:ring-2 focus-within:ring-gh-blue/30 transition-all">
                <span className="font-mono text-sm text-[#8b949e] select-none font-medium">https://github.com/</span>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="facebook/react"
                  className="flex-1 bg-transparent outline-none font-mono text-sm text-[#f0f6fc] placeholder:text-[#768390]"
                  autoFocus
                />
              </div>
            </div>

            {error && (
              <div className="bg-gh-red/10 border border-gh-red/40 rounded-lg p-3 text-xs font-mono text-gh-red flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="mt-1 self-start bg-gh-green hover:bg-gh-greenHover text-white font-semibold text-sm px-5 py-2.5 rounded-lg border border-[rgba(240,246,252,0.1)] shadow-md transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Analyze & Build Graph</span>
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-[#30363d] flex items-center justify-between text-xs text-[#8b949e] font-mono">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-gh-green" />
              GraphRAG AI Powered
            </span>
            <span>Public Repos · Auto AST Parser</span>
          </div>
        </div>
      </div>
    </div>
  );
}
