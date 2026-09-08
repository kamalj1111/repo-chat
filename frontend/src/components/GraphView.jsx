import { useMemo, useRef, useEffect, useState, useCallback } from "react";
import ForceGraph2D from "react-force-graph-2d";

const TYPE_CONFIG = {
  file: { color: "#e3b341", label: "File", radius: 7 },
  class: { color: "#f85149", label: "Class", radius: 6 },
  function: { color: "#3fb950", label: "Function", radius: 5 },
  import: { color: "#58a6ff", label: "Import", radius: 4 },
  default: { color: "#bc8cff", label: "Component", radius: 4 },
};

export default function GraphView({ fullGraph, subgraph, highlightIds = [] }) {
  const containerRef = useRef(null);
  const fgRef = useRef(null);

  const [dimensions, setDimensions] = useState({ width: 600, height: 600 });
  const [viewMode, setViewMode] = useState("full");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNode, setSelectedNode] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [showNodeLabels, setShowNodeLabels] = useState(true);

  // ResizeObserver for 100% container fit
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect) {
          setDimensions({
            width: Math.floor(entry.contentRect.width),
            height: Math.floor(entry.contentRect.height),
          });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const activeGraphData = useMemo(() => {
    if (viewMode === "subgraph" && subgraph && subgraph.nodes?.length > 0) {
      return subgraph;
    }
    return fullGraph || { nodes: [], edges: [] };
  }, [viewMode, subgraph, fullGraph]);

  const highlightSet = useMemo(() => new Set(highlightIds), [highlightIds]);

  const searchMatchSet = useMemo(() => {
    if (!searchQuery.trim() || !activeGraphData.nodes) return new Set();
    const q = searchQuery.toLowerCase().trim();
    const matches = new Set();
    activeGraphData.nodes.forEach((n) => {
      if (
        n.name?.toLowerCase().includes(q) ||
        n.file?.toLowerCase().includes(q) ||
        n.type?.toLowerCase().includes(q)
      ) {
        matches.add(n.id);
      }
    });
    return matches;
  }, [searchQuery, activeGraphData]);

  const graphData = useMemo(() => {
    if (!activeGraphData.nodes) return { nodes: [], links: [] };

    let nodes = activeGraphData.nodes;
    if (activeFilter !== "all") {
      nodes = nodes.filter((n) => n.type === activeFilter);
    }
    const nodeIds = new Set(nodes.map((n) => n.id));

    const links = (activeGraphData.edges || [])
      .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
      .map((e) => ({
        source: e.source,
        target: e.target,
        relation: e.relation || e.label || "calls",
      }));

    return {
      nodes: nodes.map((n) => ({ ...n })),
      links,
    };
  }, [activeGraphData, activeFilter]);

  const stats = useMemo(() => {
    const nodes = activeGraphData.nodes || [];
    const edges = activeGraphData.edges || [];
    const counts = { file: 0, class: 0, function: 0, import: 0, other: 0 };
    nodes.forEach((n) => {
      if (counts[n.type] !== undefined) counts[n.type]++;
      else counts.other++;
    });
    return { totalNodes: nodes.length, totalEdges: edges.length, counts };
  }, [activeGraphData]);

  useEffect(() => {
    if (fgRef.current && highlightIds.length > 0) {
      setTimeout(() => {
        fgRef.current?.zoomToFit(500, 80, (n) => highlightSet.has(n.id));
      }, 100);
    }
  }, [highlightIds, highlightSet]);

  const handleResetZoom = useCallback(() => {
    if (fgRef.current) {
      fgRef.current.zoomToFit(400, 40);
    }
  }, []);

  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node);
    if (fgRef.current) {
      fgRef.current.centerAt(node.x, node.y, 400);
      fgRef.current.zoom(2.5, 400);
    }
  }, []);

  const drawNodeCanvas = useCallback(
    (node, ctx, globalScale) => {
      const cfg = TYPE_CONFIG[node.type] || TYPE_CONFIG.default;
      const isHighlighted = highlightSet.has(node.id);
      const isSearchMatched = searchMatchSet.has(node.id);
      const isSelected = selectedNode?.id === node.id;

      const baseRadius = cfg.radius;
      const radius = isSelected ? baseRadius + 3 : isHighlighted ? baseRadius + 2 : baseRadius;

      if (isHighlighted || isSearchMatched || isSelected) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 4 / globalScale, 0, 2 * Math.PI, false);
        ctx.fillStyle = isSelected
          ? "rgba(248, 81, 73, 0.4)"
          : isSearchMatched
          ? "rgba(227, 179, 65, 0.5)"
          : "rgba(88, 166, 255, 0.5)";
        ctx.fill();
      }

      if (isHighlighted) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 2 / globalScale, 0, 2 * Math.PI, false);
        ctx.strokeStyle = "#58a6ff";
        ctx.lineWidth = 1.5 / globalScale;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
      ctx.fillStyle = isSelected ? "#ffffff" : cfg.color;
      ctx.fill();
      ctx.strokeStyle = "#0d1117";
      ctx.lineWidth = 1 / globalScale;
      ctx.stroke();

      if (showNodeLabels && (globalScale > 0.8 || isHighlighted || isSearchMatched || isSelected)) {
        const label = node.name || "Unnamed";
        const fontSize = Math.max(10 / globalScale, 2.5);
        ctx.font = `${isSelected ? "bold" : "normal"} ${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
        
        const textWidth = ctx.measureText(label).width;
        const bckgDimensions = [textWidth + 6 / globalScale, fontSize + 4 / globalScale];

        ctx.fillStyle = isSelected
          ? "rgba(88, 166, 255, 0.95)"
          : isHighlighted
          ? "rgba(22, 27, 34, 0.95)"
          : "rgba(13, 17, 23, 0.85)";
        
        ctx.fillRect(
          node.x - bckgDimensions[0] / 2,
          node.y + radius + 3 / globalScale,
          bckgDimensions[0],
          bckgDimensions[1]
        );

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = isSelected ? "#0d1117" : isHighlighted ? "#58a6ff" : "#f0f6fc";
        ctx.fillText(
          label,
          node.x,
          node.y + radius + 3 / globalScale + bckgDimensions[1] / 2
        );
      }
    },
    [highlightSet, searchMatchSet, selectedNode, showNodeLabels]
  );

  if (!fullGraph || !fullGraph.nodes || fullGraph.nodes.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-gh-bg">
        <div className="w-12 h-12 rounded-full border border-[#444c56] flex items-center justify-center mb-3 text-gh-blue">
          <svg className="w-6 h-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <p className="font-mono text-xs text-[#adbac7]">GraphRAG parsing repository...</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-gh-bg relative overflow-hidden select-none">
      {/* GitHub Top Toolbar Header */}
      <div className="border-b border-[#30363d] bg-gh-panel px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 z-10">
        <div className="flex items-center gap-3">
          <div className="flex bg-[#21262d] border border-[#444c56] rounded-lg p-0.5 shadow-sm">
            <button
              onClick={() => setViewMode("full")}
              className={`font-mono text-xs px-3 py-1 rounded-md transition-all ${
                viewMode === "full"
                  ? "bg-gh-blue text-white font-bold shadow-sm"
                  : "text-[#adbac7] hover:text-white"
              }`}
            >
              All Nodes & Edges ({stats.totalNodes})
            </button>
            {subgraph && (
              <button
                onClick={() => setViewMode("subgraph")}
                className={`font-mono text-xs px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                  viewMode === "subgraph"
                    ? "bg-gh-blue text-white font-bold shadow-sm"
                    : "text-[#adbac7] hover:text-white"
                }`}
              >
                <span>Query Subgraph</span>
                <span className="bg-[#0d1117] text-gh-blue px-1.5 py-0.2 rounded-full text-[10px] font-bold">
                  {subgraph.nodes?.length || 0}
                </span>
              </button>
            )}
          </div>

          <div className="relative flex items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search node or file..."
              className="bg-[#21262d] border border-[#444c56] focus:border-gh-blue text-xs text-[#f0f6fc] placeholder:text-[#768390] rounded-lg pl-8 pr-3 py-1.5 outline-none font-mono transition-all w-48 shadow-inner"
            />
            <svg
              className="w-3.5 h-3.5 text-[#768390] absolute left-2.5 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 text-xs text-[#8b949e] hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNodeLabels(!showNodeLabels)}
            className={`font-mono text-xs px-2.5 py-1 border rounded-md transition-colors ${
              showNodeLabels
                ? "border-gh-blue text-gh-blue bg-gh-blue/10 font-bold"
                : "border-[#444c56] text-[#adbac7] hover:border-[#768390]"
            }`}
          >
            Labels
          </button>
          <button
            onClick={handleResetZoom}
            className="font-mono text-xs border border-[#444c56] hover:border-gh-blue text-[#f0f6fc] rounded-md px-3 py-1 bg-[#21262d] transition-colors flex items-center gap-1 shadow-sm font-semibold"
          >
            <span>Fit View</span>
          </button>
        </div>
      </div>

      {/* GitHub Filter Badges */}
      <div className="px-4 py-1.5 bg-gh-bg border-b border-[#30363d] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono z-10">
        <div className="flex items-center gap-2">
          <span className="text-[#768390] font-medium">Filter:</span>
          {["all", "file", "class", "function", "import"].map((type) => {
            const cfg = TYPE_CONFIG[type] || { color: "#58a6ff", label: "All" };
            const count = type === "all" ? stats.totalNodes : stats.counts[type] || 0;
            const isActive = activeFilter === type;
            return (
              <button
                key={type}
                onClick={() => setActiveFilter(type)}
                className={`px-2 py-0.5 rounded border transition-all flex items-center gap-1 ${
                  isActive
                    ? "bg-[#21262d] text-[#f0f6fc] border-[#58a6ff] font-bold shadow-xs"
                    : "bg-[#161b22] text-[#8b949e] border-[#30363d] hover:text-white hover:border-[#444c56]"
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
                <span className="capitalize">{type}</span>
                <span className="text-[10px] opacity-75">({count})</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3 text-[#8b949e] font-mono">
          <span>Nodes: <strong className="text-gh-blue">{stats.totalNodes}</strong></span>
          <span>Edges: <strong className="text-gh-blue">{stats.totalEdges}</strong></span>
        </div>
      </div>

      {/* ForceGraph Canvas */}
      <div ref={containerRef} className="flex-1 w-full h-full relative">
        <ForceGraph2D
          ref={fgRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          backgroundColor="#0d1117"
          nodeRelSize={5}
          nodeCanvasObject={drawNodeCanvas}
          nodeCanvasObjectMode={() => "after"}
          linkColor={(l) => {
            if (highlightSet.has(l.source.id ?? l.source) || highlightSet.has(l.target.id ?? l.target)) {
              return "#58a6ff";
            }
            return "#30363d";
          }}
          linkWidth={(l) =>
            highlightSet.has(l.source.id ?? l.source) || highlightSet.has(l.target.id ?? l.target) ? 2.2 : 1
          }
          linkDirectionalArrowLength={4}
          linkDirectionalArrowRelPos={0.95}
          linkDirectionalArrowColor={() => "#6e7681"}
          linkDirectionalParticles={(l) =>
            highlightSet.has(l.source.id ?? l.source) || highlightSet.has(l.target.id ?? l.target) ? 3 : 1
          }
          linkDirectionalParticleWidth={2}
          linkDirectionalParticleSpeed={0.006}
          linkDirectionalParticleColor={() => "#58a6ff"}
          cooldownTicks={120}
          onNodeClick={handleNodeClick}
          onBackgroundClick={() => setSelectedNode(null)}
        />

        {/* Selected Node Inspector Sidebar */}
        {selectedNode && (
          <div className="absolute top-4 right-4 w-80 bg-gh-panel border border-[#444c56] rounded-xl shadow-2xl p-4 font-mono text-xs z-20 transition-all animate-fadeIn">
            <div className="flex items-start justify-between border-b border-[#30363d] pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor:
                      (TYPE_CONFIG[selectedNode.type] || TYPE_CONFIG.default).color,
                  }}
                />
                <span className="font-bold text-[#f0f6fc] text-sm break-all">{selectedNode.name}</span>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-[#8b949e] hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-[#adbac7]">
              <div className="flex justify-between">
                <span>Type:</span>
                <span className="text-gh-blue capitalize font-semibold">{selectedNode.type}</span>
              </div>
              {selectedNode.file && (
                <div className="flex justify-between gap-2">
                  <span>File:</span>
                  <span className="text-[#f0f6fc] truncate max-w-[180px]" title={selectedNode.file}>
                    {selectedNode.file}{selectedNode.lineno ? `:${selectedNode.lineno}` : ""}
                  </span>
                </div>
              )}
              {selectedNode.docstring && (
                <div className="mt-2 border-t border-[#30363d] pt-2">
                  <span className="text-[#768390] block mb-1">Docstring:</span>
                  <p className="text-[#f0f6fc] bg-[#0d1117] p-2 rounded border border-[#30363d] max-h-28 overflow-y-auto text-[11px] leading-relaxed">
                    {selectedNode.docstring}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
