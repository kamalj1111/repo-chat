import { useState, useRef, useEffect } from "react";
import { sendChat } from "../api";

export default function ChatWindow({ sessionId, onMatchedNodes }) {
  const [messages, setMessages] = useState([
    {
      role: "system",
      text: "Repository indexed into GraphRAG context. Ask questions about architecture, functions, files, or dependencies.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend(e) {
    e.preventDefault();
    const question = input.trim();
    if (!question || loading) return;

    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setInput("");
    setLoading(true);

    try {
      const result = await sendChat(sessionId, question);
      setMessages((prev) => [...prev, { role: "assistant", text: result.answer }]);
      onMatchedNodes?.(result.matched_node_ids, result.subgraph);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "error", text: err.message || "Something went wrong." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-full flex flex-col bg-[#0d1117]">
      {/* Messages Scroll Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        {messages.map((m, i) => (
          <ChatBubble key={i} role={m.role} text={m.text} />
        ))}
        {loading && (
          <div
            className="self-start border rounded-xl p-3.5 text-xs font-mono flex items-center gap-2.5 shadow-md max-w-[85%]"
            style={{ backgroundColor: "#161b22", borderColor: "#444c56", color: "#adbac7" }}
          >
            <svg className="w-4 h-4 text-[#58a6ff] animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Analyzing codebase & generating AI response...</span>
          </div>
        )}
      </div>

      {/* GitHub Input Form */}
      <form
        onSubmit={handleSend}
        className="border-t p-3 flex gap-2"
        style={{ backgroundColor: "#161b22", borderColor: "#30363d" }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about this repository..."
          className="flex-1 border rounded-lg px-4 py-2.5 outline-none font-mono text-xs transition-all shadow-inner"
          style={{
            backgroundColor: "#0d1117",
            borderColor: "#444c56",
            color: "#f0f6fc",
          }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="font-medium text-xs px-4 py-2.5 rounded-lg border transition-all flex items-center gap-1.5 shadow-md disabled:opacity-40"
          style={{
            backgroundColor: "#238636",
            borderColor: "rgba(240, 246, 252, 0.15)",
            color: "#ffffff",
          }}
        >
          <span>Send</span>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </form>
    </div>
  );
}

function ChatBubble({ role, text }) {
  // USER PROMPT BUBBLE CONTAINER
  if (role === "user") {
    return (
      <div className="self-end max-w-[85%] flex flex-col items-end gap-1">
        <span className="text-[10px] font-mono font-medium text-[#8b949e] px-1">You</span>
        <div
          className="rounded-2xl rounded-tr-xs px-4 py-3 text-xs font-sans font-medium shadow-md leading-relaxed border"
          style={{
            backgroundColor: "#1f6feb",
            borderColor: "#388bfd",
            color: "#ffffff",
          }}
        >
          {text}
        </div>
      </div>
    );
  }

  // SYSTEM / READY NOTE BUBBLE
  if (role === "system") {
    return (
      <div className="self-start max-w-[92%] flex flex-col items-start gap-1">
        <div
          className="rounded-xl p-3.5 text-xs font-mono leading-relaxed border flex items-start gap-2.5 shadow-sm"
          style={{
            backgroundColor: "#161b22",
            borderColor: "#444c56",
            color: "#c9d1d9",
          }}
        >
          <span className="w-2 h-2 rounded-full bg-[#3fb950] mt-1.5 flex-shrink-0" />
          <div>
            <span className="font-bold text-[#58a6ff] block mb-0.5">GraphRAG Ready</span>
            <p className="text-[#8b949e]">{text}</p>
          </div>
        </div>
      </div>
    );
  }

  // ERROR BUBBLE
  if (role === "error") {
    return (
      <div className="self-start max-w-[85%] flex flex-col items-start gap-1">
        <span className="text-[10px] font-mono font-medium text-[#f85149] px-1">Error</span>
        <div
          className="rounded-xl rounded-tl-xs px-4 py-3 text-xs font-mono border shadow-sm"
          style={{
            backgroundColor: "rgba(248, 81, 73, 0.1)",
            borderColor: "rgba(248, 81, 73, 0.4)",
            color: "#f85149",
          }}
        >
          {text}
        </div>
      </div>
    );
  }

  // ASSISTANT RESPONSE BUBBLE CONTAINER
  return (
    <div className="self-start max-w-[95%] flex flex-col items-start gap-1">
      <div className="flex items-center gap-1.5 px-1">
        <span className="w-2 h-2 rounded-full bg-[#3fb950]" />
        <span className="text-[10px] font-mono font-bold text-[#58a6ff]">GraphRAG Assistant</span>
      </div>
      <div
        className="rounded-xl rounded-tl-xs p-4 text-xs font-mono leading-relaxed whitespace-pre-wrap border shadow-md"
        style={{
          backgroundColor: "#161b22",
          borderColor: "#444c56",
          color: "#f0f6fc",
        }}
      >
        {text}
      </div>
    </div>
  );
}
